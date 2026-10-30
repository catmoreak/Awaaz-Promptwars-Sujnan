import type { FastifyRequest } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import { SignJWT, jwtVerify } from 'jose';
import type { UserDto } from '@awaaz/shared';
import { env } from './config';
import { db } from './db';
import { forbidden, unauthorized, unavailable } from './errors';
import type { User } from './generated/prisma/client';

const ISSUER = 'awaaz';
const secret = new TextEncoder().encode(env.JWT_SECRET);
const googleClient = new OAuth2Client();

export function toUserDto(user: User): UserDto {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role };
}

export function signSession(user: User): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/** The admin allowlist is checked at every sign-in, so removing an email takes effect on the next one. */
export async function loginWithGoogle(idToken: string): Promise<User> {
  if (env.GOOGLE_OAUTH_CLIENT_IDS.length === 0) {
    throw unavailable('google_login_unavailable', 'Google Sign-In is not configured');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_OAUTH_CLIENT_IDS });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized();
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) throw unauthorized();

  const email = payload.email.toLowerCase();
  const fields = {
    email,
    name: payload.name ?? email,
    avatarUrl: payload.picture ?? null,
    role: env.ADMIN_EMAILS.map((item) => item.toLowerCase()).includes(email) ? ('ADMIN' as const) : ('CITIZEN' as const),
  };
  return db.user.upsert({
    where: { googleSub: payload.sub },
    create: { googleSub: payload.sub, ...fields },
    update: fields,
  });
}

export function loginAsDemo(role: 'CITIZEN' | 'ADMIN'): Promise<User> {
  const profile =
    role === 'ADMIN'
      ? { email: 'demo.admin@awaaz.invalid', name: 'Demo Officer' }
      : { email: 'demo.citizen@awaaz.invalid', name: 'Demo Citizen' };
  return db.user.upsert({
    where: { email: profile.email },
    create: { ...profile, role, isDemo: true },
    update: { role },
  });
}

/** Loads the user on every request, so a role change or deletion applies immediately. */
export async function requireUser(request: FastifyRequest): Promise<User> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized();

  let userId: string | undefined;
  try {
    const { payload } = await jwtVerify(header.slice('Bearer '.length), secret, {
      issuer: ISSUER,
      algorithms: ['HS256'],
    });
    userId = payload.sub;
  } catch {
    throw unauthorized();
  }
  if (!userId) throw unauthorized();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  return user;
}

export async function requireAdmin(request: FastifyRequest): Promise<User> {
  const user = await requireUser(request);
  if (user.role !== 'ADMIN') throw forbidden();
  return user;
}
