import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const POINT = { lat: 13.0717, lng: 74.9959 };

async function loadPlaces(key = 'key') {
  vi.resetModules();
  vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', key);
  return import('./places');
}

function mockReply(body: object, status = 200) {
  const fetchMock = vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('reverseGeocode', () => {
  it('returns the formatted address', async () => {
    mockReply({ status: 'OK', results: [{ formatted_address: 'Moodbidri, Karnataka' }] });
    const { reverseGeocode } = await loadPlaces();
    expect(await reverseGeocode(POINT)).toBe('Moodbidri, Karnataka');
  });

  it('logs a refusal instead of hiding it, because Google answers 200 even then', async () => {
    mockReply({ status: 'REQUEST_DENIED', error_message: 'API key not authorized' });
    const { reverseGeocode } = await loadPlaces();
    expect(await reverseGeocode(POINT)).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('REQUEST_DENIED'));
  });

  it('makes no call when no key is set', async () => {
    const fetchMock = mockReply({});
    const { reverseGeocode } = await loadPlaces('');
    expect(await reverseGeocode(POINT)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('survives a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { reverseGeocode } = await loadPlaces();
    expect(await reverseGeocode(POINT)).toBeNull();
  });
});

describe('geocodeAddress', () => {
  it('searches inside the town', async () => {
    const fetchMock = mockReply({ status: 'OK', results: [{ geometry: { location: POINT } }] });
    const { geocodeAddress } = await loadPlaces();
    expect(await geocodeAddress('Bus stand')).toEqual(POINT);
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('address')).toBe('Bus stand, Moodbidri, Karnataka');
  });

  it('returns null when nothing is found', async () => {
    mockReply({ status: 'ZERO_RESULTS', results: [] });
    const { geocodeAddress } = await loadPlaces();
    expect(await geocodeAddress('Nowhere')).toBeNull();
  });
});

describe('nearbySensitiveSites', () => {
  it('lists schools and hospitals with their distance', async () => {
    mockReply({
      places: [
        { displayName: { text: 'Town Hospital' }, location: { latitude: 13.072, longitude: 74.996 }, types: ['hospital'] },
        { displayName: { text: 'Town School' }, location: { latitude: 13.071, longitude: 74.996 }, types: ['school'] },
        { displayName: { text: 'No location' } },
      ],
    });
    const { nearbySensitiveSites } = await loadPlaces();
    const sites = await nearbySensitiveSites(POINT);
    expect(sites?.map((site) => site.type)).toEqual(['hospital', 'school']);
    expect(sites?.[0]?.distanceM).toBeLessThan(300);
  });

  it('returns null, meaning not checked, when Google refuses', async () => {
    mockReply({ error: { status: 'PERMISSION_DENIED' } }, 403);
    const { nearbySensitiveSites } = await loadPlaces();
    expect(await nearbySensitiveSites(POINT)).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('tells apart "found nothing" from "not checked"', async () => {
    mockReply({});
    const { nearbySensitiveSites } = await loadPlaces();
    expect(await nearbySensitiveSites(POINT)).toEqual([]);
  });
});
