import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { SERVICE_AREA } from '@awaaz/shared';

loadEnv({ quiet: true });

const list = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ALLOW_DEMO_LOGIN: z.stringbool().default(false),
  ADMIN_EMAILS: z.string().default('').transform(list),
  CORS_ORIGINS: z.string().default('').transform(list),
  GOOGLE_OAUTH_CLIENT_IDS: z.string().default('').transform(list),
  GOOGLE_MAPS_SERVER_KEY: z.string().default(''),
  MISTRAL_API_KEY: z.string().default(''),
  MISTRAL_CHAT_MODEL: z.string().default('mistral-small-latest'),
  MISTRAL_EMBEDDING_MODEL: z.string().default('mistral-embed'),
  MISTRAL_TRANSCRIBE_MODEL: z.string().default('voxtral-mini-transcribe-3-0'),
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_CHAT_MODEL: z.string().default('mistralai/mistral-small-2603'),
  OPENROUTER_AUDIO_MODEL: z.string().default('mistralai/voxtral-small-24b-2507'),
  SERVICE_CENTER_LAT: z.coerce.number().default(SERVICE_AREA.lat),
  SERVICE_CENTER_LNG: z.coerce.number().default(SERVICE_AREA.lng),
  SERVICE_RADIUS_KM: z.coerce.number().positive().default(SERVICE_AREA.radiusKm),
});

export const env = EnvSchema.parse(process.env);

// A demo login mints admin sessions without any credential, so it must never reach a public deployment.
if (env.NODE_ENV === 'production' && env.ALLOW_DEMO_LOGIN) {
  throw new Error('ALLOW_DEMO_LOGIN must be false in production');
}

export const features = {
  demoLogin: env.ALLOW_DEMO_LOGIN,
  googleLogin: env.GOOGLE_OAUTH_CLIENT_IDS.length > 0,
  llm: Boolean(env.MISTRAL_API_KEY || env.OPENROUTER_API_KEY),
  voice: Boolean(env.MISTRAL_API_KEY || env.OPENROUTER_API_KEY),
  places: Boolean(env.GOOGLE_MAPS_SERVER_KEY),
};
