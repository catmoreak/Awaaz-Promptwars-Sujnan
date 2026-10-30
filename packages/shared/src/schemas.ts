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

/** Accepts common ways of writing an Indian mobile number and stores the plain 10 digits. */
export const PhoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '').replace(/^91(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'));

const PasswordSchema = z.string().max(72, 'Use a password of 72 characters or fewer');

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80, 'Use a name of 80 characters or fewer'),
  phone: PhoneSchema,
  password: PasswordSchema.min(8, 'Use a password of at least 8 characters'),
  addressLine: z.string().trim().min(5, 'Enter your house and street').max(200, 'Shorten your address'),
  locality: z.string().trim().min(2, 'Enter your area').max(100, 'Shorten your area name'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
});
export type RegisterInput = z.output<typeof RegisterSchema>;
export type RegisterForm = z.input<typeof RegisterSchema>;

export const LoginSchema = z.object({ phone: PhoneSchema, password: PasswordSchema.min(1, 'Enter your password') });
export type LoginForm = z.input<typeof LoginSchema>;

export const AdminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  password: PasswordSchema.min(1, 'Enter your password'),
});
export type AdminLoginForm = z.input<typeof AdminLoginSchema>;

export const MergeIssuesSchema = z.object({ intoIssueId: z.string().min(1) });
export const DetachReportSchema = z.object({ reportId: z.string().min(1) });
