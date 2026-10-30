import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Blank keys stop any test from reaching a real AI provider, even when a local .env holds them.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test-secret-that-is-long-enough-for-validation',
      MISTRAL_API_KEY: '',
      OPENROUTER_API_KEY: '',
      GOOGLE_MAPS_SERVER_KEY: '',
      GOOGLE_SPEECH_API_KEY: '',
    },
  },
});
