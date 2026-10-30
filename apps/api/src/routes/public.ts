import type { FastifyInstance } from 'fastify';
import { AdminLoginSchema, LoginSchema, RegisterSchema, type AppConfigResponse, type AuthResponse } from '@awaaz/shared';
import { loginAdmin, loginCitizen, registerCitizen, requireUser, signSession, toUserDto } from '../auth';
import { features } from '../config';
import { db } from '../db';
import type { User } from '../generated/prisma/client';

const AUTH_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

async function session(user: User): Promise<AuthResponse> {
  return { token: await signSession(user), user: toUserDto(user) };
}

export async function publicRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    await db.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  });

  app.get('/v1/config', async (): Promise<AppConfigResponse> => ({
    aiEnabled: features.llm,
    voiceEnabled: features.voice,
    placesEnabled: features.places,
  }));

  app.post('/v1/auth/register', AUTH_RATE_LIMIT, async (request, reply) => {
    const input = RegisterSchema.parse(request.body);
    return reply.code(201).send(await session(await registerCitizen(input)));
  });

  app.post('/v1/auth/login', AUTH_RATE_LIMIT, async (request) => {
    const { phone, password } = LoginSchema.parse(request.body);
    return session(await loginCitizen(phone, password));
  });

  app.post('/v1/auth/admin/login', AUTH_RATE_LIMIT, async (request) => {
    const { email, password } = AdminLoginSchema.parse(request.body);
    return session(await loginAdmin(email, password));
  });

  app.get('/v1/me', async (request) => toUserDto(await requireUser(request)));
}
