import type { FastifyRequest } from 'fastify';
import { SignJWT, jwtVerify } from 'jose';
import type { RegisterInput, UserDto } from '@awaaz/shared';
import { env } from './config';
import { db } from './db';
import { HttpError, forbidden, unauthorized } from './errors';
import { Prisma, type User } from './generated/prisma/client';
import { hashPassword, verifyPassword } from './passwords';

const ISSUER = 'awaaz';
const secret = new TextEncoder().encode(env.JWT_SECRET);

const DEMO_CITIZEN = { phone: '9000000000', password: 'demo1234', name: 'Demo Citizen' };

const wrongCredentials = (what: string) => new HttpError(401, 'wrong_credentials', `${what} or password is incorrect`);

export function toUserDto(user: User): UserDto {
  return { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role };
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

export async function registerCitizen(input: RegisterInput): Promise<User> {
  const { password, ...profile } = input;
  try {
    return await db.user.create({ data: { ...profile, passwordHash: await hashPassword(password) } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'phone_taken', 'This phone number is already registered. Sign in instead.');
    }
    throw error;
  }
}

/** Checks a password even when no account exists, so response time does not reveal who has registered. */
async function matchesPassword(user: User | null, password: string): Promise<boolean> {
  const stored = user?.passwordHash ?? (await placeholderHash);
  const valid = await verifyPassword(password, stored);
  return valid && user !== null;
}

const placeholderHash = hashPassword('placeholder for accounts that do not exist');

export async function loginCitizen(phone: string, password: string): Promise<User> {
  const user = await db.user.findUnique({ where: { phone } });
  if (!(await matchesPassword(user, password)) || user?.role !== 'CITIZEN') throw wrongCredentials('Phone number');
  return user;
}

export async function loginAdmin(email: string, password: string): Promise<User> {
  const user = await db.user.findUnique({ where: { email } });
  if (!(await matchesPassword(user, password)) || user?.role !== 'ADMIN') throw wrongCredentials('Email');
  return user;
}

/** Creates the officer account from the environment, and applies a changed password on the next start. */
export async function ensureAdmin(): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;

  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing && (await verifyPassword(env.ADMIN_PASSWORD, existing.passwordHash))) return;

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  await db.user.upsert({
    where: { email },
    create: { email, passwordHash, name: 'Municipal Officer', role: 'ADMIN' },
    update: { passwordHash, role: 'ADMIN' },
  });
}

/** Owns the seeded reports, so the demo citizen's report list is not empty. */
export async function ensureDemoCitizen(): Promise<User> {
  const passwordHash = await hashPassword(DEMO_CITIZEN.password);
  return db.user.upsert({
    where: { phone: DEMO_CITIZEN.phone },
    create: {
      phone: DEMO_CITIZEN.phone,
      passwordHash,
      name: DEMO_CITIZEN.name,
      addressLine: 'Synthetic demo address',
      locality: 'Moodbidri',
      pincode: '574227',
      isDemo: true,
    },
    update: { passwordHash },
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
