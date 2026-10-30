import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './config';
import { PrismaClient } from './generated/prisma/client';

/** Opening a connection to a database in another region can take 2 s, so connections are kept and reused. */
const pool = {
  connectionString: env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 300_000,
  keepAlive: true,
};

export const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  // The defaults of 2 s and 5 s fail when the database is in another region, where one transaction can take 7 s.
  transactionOptions: { maxWait: 15_000, timeout: 30_000 },
});
