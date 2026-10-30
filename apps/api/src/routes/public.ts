import type { FastifyInstance } from 'fastify';
import { DemoLoginSchema, GoogleLoginSchema, type AppConfigResponse, type AuthResponse } from '@awaaz/shared';
import { loginAsDemo, loginWithGoogle, requireUser, signSession, toUserDto } from '../auth';
import { features } from '../config';
import { db } from '../db';
import { notFound } from '../errors';
import type { User } from '../generated/prisma/client';

const AUTH_RATE_LIMIT = { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } };

async function session(user: User): Promise<AuthResponse> {
  return { token: await signSession(user), user: toUserDto(user) };
}

export async function publicRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    await db.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  });

  app.get('/v1/config', async (): Promise<AppConfigResponse> => ({
    demoLoginEnabled: features.demoLogin,
    googleLoginEnabled: features.googleLogin,
    aiEnabled: features.llm,
    voiceEnabled: features.voice,
    placesEnabled: features.places,
  }));

  app.post('/v1/auth/google', AUTH_RATE_LIMIT, async (request) => {
    const { idToken } = GoogleLoginSchema.parse(request.body);
    return session(await loginWithGoogle(idToken));
  });

  app.post('/v1/auth/demo', AUTH_RATE_LIMIT, async (request) => {
    // Answers 404 when disabled, so a deployment does not advertise the route.
    if (!features.demoLogin) throw notFound('Route');
    const { role } = DemoLoginSchema.parse(request.body);
    return session(await loginAsDemo(role));
  });

  app.get('/v1/me', async (request) => toUserDto(await requireUser(request)));
}
