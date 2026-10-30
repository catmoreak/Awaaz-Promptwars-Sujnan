import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from './generated/prisma/client';

const { db } = vi.hoisted(() => ({
  db: {
    $queryRaw: vi.fn(),
    user: { findUnique: vi.fn() },
    report: { findUnique: vi.fn(), findMany: vi.fn() },
    issue: { findUnique: vi.fn(), findMany: vi.fn() },
    team: { findUnique: vi.fn() },
  },
}));
vi.mock('./db', () => ({ db }));
vi.mock('./pipeline/worker', () => ({ wakeWorker: vi.fn() }));

import { buildApp } from './app';
import { signSession } from './auth';
import { hashPassword } from './passwords';

const user = (id: string, role: 'CITIZEN' | 'ADMIN') => ({ id, role, name: id, phone: null, email: null }) as User;
const citizen = user('citizen-1', 'CITIZEN');
const otherCitizen = user('citizen-2', 'CITIZEN');
const officer = user('officer-1', 'ADMIN');
const everyone = [citizen, otherCitizen, officer];

let app: FastifyInstance;

const get = async (url: string, as?: User | string) => {
  const token = typeof as === 'string' ? as : as && (await signSession(as));
  return app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} });
};

const post = async (url: string, body: unknown, as?: User) => {
  const token = as && (await signSession(as));
  return app.inject({ method: 'POST', url, payload: body as object, headers: token ? { authorization: `Bearer ${token}` } : {} });
};

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(() => app.close());

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string } }) => everyone.find(({ id }) => id === where.id) ?? null);
});

describe('public routes', () => {
  it('reports health when the database answers', async () => {
    db.$queryRaw.mockResolvedValue([1]);
    expect((await get('/health')).json()).toEqual({ status: 'ok' });
  });

  it('sends a content security policy with every response', async () => {
    db.$queryRaw.mockResolvedValue([1]);
    expect((await get('/health')).headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('answers an unknown API path with a 404 instead of the website', async () => {
    expect((await get('/v1/nothing-here')).statusCode).toBe(404);
  });
});

describe('signing in', () => {
  it('rejects a registration that fails validation, and says why', async () => {
    const response = await post('/v1/auth/register', { name: 'A', phone: '123', password: 'short' });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('invalid_input');
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    db.user.findUnique.mockResolvedValueOnce({ ...citizen, passwordHash: await hashPassword('correct-password') });
    const wrongPassword = await post('/v1/auth/login', { phone: '9876543210', password: 'wrong-password' });
    db.user.findUnique.mockResolvedValueOnce(null);
    const noAccount = await post('/v1/auth/login', { phone: '9876543211', password: 'wrong-password' });

    expect(wrongPassword.statusCode).toBe(401);
    expect(noAccount.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(noAccount.json());
  });
});

describe('access control', () => {
  it('turns away a request with no session', async () => {
    expect((await get('/v1/admin/issues')).statusCode).toBe(401);
    expect((await get('/v1/reports/mine')).statusCode).toBe(401);
  });

  it('turns away a forged session', async () => {
    expect((await get('/v1/admin/issues', 'not-a-real-token')).statusCode).toBe(401);
  });

  it('turns away a session whose account no longer exists', async () => {
    expect((await get('/v1/reports/mine', user('deleted', 'CITIZEN'))).statusCode).toBe(401);
  });

  it('keeps citizens out of every officer route', async () => {
    for (const url of ['/v1/admin/issues', '/v1/admin/map', '/v1/admin/stats', '/v1/admin/teams', '/v1/admin/intake']) {
      expect((await get(url, citizen)).statusCode).toBe(403);
    }
  });

  it('lets an officer in', async () => {
    db.issue.findMany.mockResolvedValue([]);
    expect((await get('/v1/admin/issues', officer)).statusCode).toBe(200);
  });
});

describe('report photos', () => {
  const report = { userId: citizen.id, image: { mime: 'image/jpeg', storageKey: null, bytes: Buffer.from('photo') } };

  it.each([
    ['the citizen who sent it', citizen, 200],
    ['an officer', officer, 200],
    ['another citizen', otherCitizen, 403],
  ])('answers %s', async (_who, viewer, status) => {
    db.report.findUnique.mockResolvedValue(report);
    expect((await get('/v1/reports/report-1/image', viewer)).statusCode).toBe(status);
  });

  it('returns the photo as a data URL', async () => {
    db.report.findUnique.mockResolvedValue(report);
    const { dataUrl } = (await get('/v1/reports/report-1/image', citizen)).json();
    expect(dataUrl).toBe(`data:image/jpeg;base64,${Buffer.from('photo').toString('base64')}`);
  });

  it('gives a 404 when the report has no photo', async () => {
    db.report.findUnique.mockResolvedValue({ userId: citizen.id, image: null });
    expect((await get('/v1/reports/report-1/image', citizen)).statusCode).toBe(404);
  });
});

describe('moving an issue through the workflow', () => {
  const transition = (body: object) => post('/v1/admin/issues/issue-1/transition', body, officer);

  it('refuses a move the workflow does not allow', async () => {
    db.issue.findUnique.mockResolvedValue({ id: 'issue-1', status: 'SUBMITTED' });
    const response = await transition({ to: 'RESOLVED' });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('invalid_transition');
  });

  it('needs a note before closing, because the citizen sees the reason', async () => {
    db.issue.findUnique.mockResolvedValue({ id: 'issue-1', status: 'SUBMITTED' });
    const response = await transition({ to: 'REJECTED' });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('note_required');
  });

  it('needs a team before assigning', async () => {
    db.issue.findUnique.mockResolvedValue({ id: 'issue-1', status: 'TRIAGED' });
    const response = await transition({ to: 'ASSIGNED' });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('team_required');
  });

  it('gives a 404 for an unknown issue', async () => {
    db.issue.findUnique.mockResolvedValue(null);
    expect((await transition({ to: 'TRIAGED' })).statusCode).toBe(404);
  });
});

describe('errors', () => {
  it('never shows internal details to the caller', async () => {
    db.issue.findMany.mockRejectedValue(new Error('connection string with a password'));
    const response = await get('/v1/admin/issues', officer);
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('password');
  });
});
