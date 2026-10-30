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
  ADMIN_EMAIL: z.string().default(''),
  ADMIN_PASSWORD: z.string().default(''),
  CORS_ORIGINS: z.string().default('').transform(list),
  GOOGLE_MAPS_SERVER_KEY: z.string().default(''),
  MISTRAL_API_KEY: z.string().default(''),
  MISTRAL_CHAT_MODEL: z.string().default('mistral-small-latest'),
  MISTRAL_EMBEDDING_MODEL: z.string().default('mistral-embed'),
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_CHAT_MODEL: z.string().default('mistralai/mistral-small-2603'),
  GOOGLE_SPEECH_API_KEY: z.string().default(''),
  SERVICE_CENTER_LAT: z.coerce.number().default(SERVICE_AREA.lat),
  SERVICE_CENTER_LNG: z.coerce.number().default(SERVICE_AREA.lng),
  SERVICE_RADIUS_KM: z.coerce.number().positive().default(SERVICE_AREA.radiusKm),
});

export const env = EnvSchema.parse(process.env);

export const features = {
  llm: Boolean(env.MISTRAL_API_KEY || env.OPENROUTER_API_KEY),
  voice: Boolean(env.GOOGLE_SPEECH_API_KEY),
  places: Boolean(env.GOOGLE_MAPS_SERVER_KEY),
};
