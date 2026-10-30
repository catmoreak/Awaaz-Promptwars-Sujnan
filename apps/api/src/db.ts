import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './config';
import { PrismaClient } from './generated/prisma/client';

export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
