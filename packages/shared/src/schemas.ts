import { z } from 'zod';
import { CATEGORIES, ISSUE_STATUSES, LIMITS } from './domain';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const AUDIO_MIMES = ['audio/wav', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/ogg'] as const;

const base64Limit = (bytes: number) => Math.ceil((bytes * 4) / 3) + 4;

export const CategorySchema = z.enum(CATEGORIES);
export const IssueStatusSchema = z.enum(ISSUE_STATUSES);

export const ImageUploadSchema = z.object({
  base64: z.string().min(16).max(base64Limit(LIMITS.imageBytesMax)),
  mime: z.enum(IMAGE_MIMES),
});

export const CreateReportSchema = z.object({
  clientRequestId: z.string().uuid(),
  text: z.string().trim().min(LIMITS.textMin).max(LIMITS.textMax),
  category: CategorySchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(300).optional(),
  image: ImageUploadSchema.optional(),
  viaVoice: z.boolean().default(false),
});
export type CreateReportInput = z.input<typeof CreateReportSchema>;

export const StaffReportSchema = CreateReportSchema.omit({ clientRequestId: true, viaVoice: true }).extend({
  channel: z.enum(['PHONE', 'WALK_IN', 'MESSAGE', 'SOCIAL']),
});
export type StaffReportInput = z.input<typeof StaffReportSchema>;

export const TranscribeSchema = z.object({
  base64: z.string().min(16).max(base64Limit(LIMITS.audioBytesMax)),
  mime: z.enum(AUDIO_MIMES),
});
export type TranscribeInput = z.input<typeof TranscribeSchema>;

export const TransitionSchema = z.object({
  to: IssueStatusSchema,
  note: z.string().trim().max(500).optional(),
  teamId: z.string().min(1).optional(),
});
export type TransitionInput = z.input<typeof TransitionSchema>;

export const GoogleLoginSchema = z.object({ idToken: z.string().min(20) });
export const DemoLoginSchema = z.object({ role: z.enum(['CITIZEN', 'ADMIN']) });

export const MergeIssuesSchema = z.object({ intoIssueId: z.string().min(1) });
export const DetachReportSchema = z.object({ reportId: z.string().min(1) });
