import { buildApp } from './app';
import { ensureAdmin } from './auth';
import { env } from './config';
import { db } from './db';
import { startWorker, stopWorker } from './pipeline/worker';

await ensureAdmin();
const app = await buildApp();

async function shutdown() {
  stopWorker();
  await app.close();
  await db.$disconnect();
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());

await app.listen({ port: env.PORT, host: '0.0.0.0' });
startWorker((error) => app.log.error(error));
