import { LIMITS, type Category } from '@awaaz/shared';
import { db } from './db';
import { badRequest } from './errors';
import type { ReportSource } from './generated/prisma/client';
import { h3Cells, isInServiceArea } from './geo';

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

  const image = input.image ? decodeImage(input.image) : null;

  return db.report.create({
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
      image: image ? { create: { bytes: new Uint8Array(image.bytes), mime: image.mime } } : undefined,
    },
  });
}
