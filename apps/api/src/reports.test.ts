import { LIMITS } from '@awaaz/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create, putObject, getObject, deleteObject, geocodeAddress, features } = vi.hoisted(() => ({
  create: vi.fn(),
  putObject: vi.fn(),
  getObject: vi.fn(),
  deleteObject: vi.fn(),
  geocodeAddress: vi.fn(),
  features: { objectStorage: true },
}));
vi.mock('./db', () => ({ db: { report: { create } } }));
vi.mock('./storage', () => ({ putObject, getObject, deleteObject }));
vi.mock('./ai/places', () => ({ geocodeAddress }));
vi.mock('./config', async (original) => ({ ...(await original<typeof import('./config')>()), features }));

import { readImage, saveReport } from './reports';

const TOWN = { lat: 13.07168, lng: 74.995941 };
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)]);
const photo = { base64: jpeg.toString('base64'), mime: 'image/jpeg' };
const report = { text: 'Bin is overflowing', category: 'WASTE' as const, source: 'WEB' as const, ...TOWN };

const savedImage = () => create.mock.calls[0]?.[0].data.image.create;

beforeEach(() => {
  vi.resetAllMocks();
  features.objectStorage = true;
  create.mockResolvedValue({ id: 'report-1' });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('saveReport', () => {
  it('saves a report inside the service area', async () => {
    await saveReport(report);
    expect(create.mock.calls[0]?.[0].data).toMatchObject({ text: report.text, ...TOWN });
  });

  it('refuses a location outside the service area', async () => {
    await expect(saveReport({ ...report, lat: 12.9, lng: 77.5 })).rejects.toMatchObject({ code: 'outside_service_area' });
    expect(create).not.toHaveBeenCalled();
  });

  it('finds the place when only an address is given', async () => {
    geocodeAddress.mockResolvedValue(TOWN);
    await saveReport({ ...report, lat: undefined, lng: undefined, address: 'Bus stand' });
    expect(create.mock.calls[0]?.[0].data).toMatchObject({ ...TOWN, address: 'Bus stand' });
  });

  it('asks for a pin when the address cannot be found', async () => {
    geocodeAddress.mockResolvedValue(null);
    await expect(saveReport({ ...report, lat: undefined, lng: undefined, address: 'Nowhere' })).rejects.toMatchObject({ code: 'address_not_found' });
  });
});

describe('report photos', () => {
  it('puts the photo in object storage and keeps only its key', async () => {
    await saveReport({ ...report, image: photo });
    expect(putObject).toHaveBeenCalledWith(expect.stringMatching(/^reports\/.+\.jpg$/), jpeg, 'image/jpeg');
    expect(savedImage()).toEqual({ mime: 'image/jpeg', storageKey: expect.any(String) });
  });

  it('refuses a file that is not really the type it claims', async () => {
    const fake = { base64: Buffer.from('<script>not a photo</script>').toString('base64'), mime: 'image/jpeg' };
    await expect(saveReport({ ...report, image: fake })).rejects.toMatchObject({ code: 'invalid_image' });
  });

  it('refuses a photo over the size limit', async () => {
    const huge = { base64: Buffer.alloc(LIMITS.imageBytesMax + 1).toString('base64'), mime: 'image/jpeg' };
    await expect(saveReport({ ...report, image: huge })).rejects.toMatchObject({ code: 'image_too_large' });
  });

  it('keeps the photo in Postgres when storage is down, so it is never lost', async () => {
    putObject.mockRejectedValue(new Error('storage is down'));
    await saveReport({ ...report, image: photo });
    expect(savedImage().bytes).toEqual(new Uint8Array(jpeg));
  });

  it('uses Postgres when no storage is configured', async () => {
    features.objectStorage = false;
    await saveReport({ ...report, image: photo });
    expect(putObject).not.toHaveBeenCalled();
    expect(savedImage().bytes).toEqual(new Uint8Array(jpeg));
  });

  it('removes the uploaded photo if the report cannot be saved', async () => {
    create.mockRejectedValue(new Error('duplicate request'));
    deleteObject.mockResolvedValue(undefined);
    await expect(saveReport({ ...report, image: photo })).rejects.toThrow('duplicate request');
    expect(deleteObject).toHaveBeenCalledTimes(1);
  });
});

describe('readImage', () => {
  it('reads from storage when the photo has a key', async () => {
    getObject.mockResolvedValue(jpeg);
    expect(await readImage({ storageKey: 'reports/a.jpg', bytes: null })).toBe(jpeg);
  });

  it('reads from Postgres when it does not', async () => {
    expect(await readImage({ storageKey: null, bytes: new Uint8Array(jpeg) })).toEqual(jpeg);
  });

  it('fails clearly when a photo has no content', async () => {
    await expect(readImage({ storageKey: null, bytes: null })).rejects.toThrow('no stored content');
  });
});
