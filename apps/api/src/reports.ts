import { randomUUID } from 'node:crypto';
import { LIMITS, type Category } from '@awaaz/shared';
import { features } from './config';
import { db } from './db';
import { badRequest } from './errors';
import type { Prisma, ReportSource } from './generated/prisma/client';
import { h3Cells, isInServiceArea } from './geo';
import { deleteObject, getObject, putObject } from './storage';

const IMAGE_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const IMAGE_SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  'image/jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (bytes) => bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP',
};

/** Checks the file's real signature, because the declared MIME type comes from the client. */
export function decodeImage(image: { base64: string; mime: string }): { bytes: Buffer; mime: string } {
  const bytes = Buffer.from(image.base64, 'base64');
  if (bytes.length === 0 || bytes.length > LIMITS.imageBytesMax) {
    throw badRequest('image_too_large', 'The photo must be under 3 MB');
  }
  if (!IMAGE_SIGNATURES[image.mime]?.(bytes)) {
    throw badRequest('invalid_image', 'The file is not a valid JPEG, PNG or WebP image');
  }
  return { bytes, mime: image.mime };
}

export const photoKey = (mime: string) => `reports/${randomUUID()}.${IMAGE_EXTENSIONS[mime] ?? 'bin'}`;

/** Falls back to Postgres if storage is unavailable, because losing a citizen's photo is worse than a larger table. */
async function storeImage({ bytes, mime }: { bytes: Buffer; mime: string }): Promise<Prisma.ReportImageCreateWithoutReportInput> {
  const inDatabase = { mime, bytes: new Uint8Array(bytes) };
  if (!features.objectStorage) return inDatabase;

  const storageKey = photoKey(mime);
  try {
    await putObject(storageKey, bytes, mime);
    return { mime, storageKey };
  } catch (error) {
    console.error('Object storage failed, so this photo stays in the database', error);
    return inDatabase;
  }
}

export async function readImage(image: { storageKey: string | null; bytes: Uint8Array | null }): Promise<Buffer> {
  if (image.storageKey) return getObject(image.storageKey);
  if (image.bytes) return Buffer.from(image.bytes);
  throw new Error('This photo has no stored content');
}

export interface NewReport {
  text: string;
  category: Category;
  lat: number;
  lng: number;
  address?: string;
  image?: { base64: string; mime: string };
  source: ReportSource;
  channel?: string;
  viaVoice?: boolean;
  userId?: string;
  clientRequestId?: string;
}

/** Saves before any AI runs, so a model outage can never lose a citizen's report. */
export async function saveReport(input: NewReport) {
  const point = { lat: input.lat, lng: input.lng };
  if (!isInServiceArea(point)) {
    throw badRequest('outside_service_area', 'This location is outside the Moodbidri service area');
  }

  const image = input.image ? await storeImage(decodeImage(input.image)) : null;

  try {
    return await db.report.create({
      data: {
        text: input.text,
        userCategory: input.category,
        lat: input.lat,
        lng: input.lng,
        address: input.address || null,
        ...h3Cells(point),
        source: input.source,
        channel: input.channel,
        viaVoice: input.viaVoice ?? false,
        userId: input.userId,
        clientRequestId: input.clientRequestId,
        image: image ? { create: image } : undefined,
      },
    });
  } catch (error) {
    // A retried request lands here too, and the first attempt already holds its own copy of the photo.
    if (image?.storageKey) await deleteObject(image.storageKey).catch(() => undefined);
    throw error;
  }
}
