import { db } from '../db';
import { processReport } from './process';

const SWEEP_INTERVAL_MS = 15_000;
const STALE_CLAIM_MINUTES = 5;
const MAX_ATTEMPTS = 3;

let draining = false;
let wakeRequested = false;
let timer: NodeJS.Timeout | undefined;

/** SKIP LOCKED lets several API instances share the queue without taking the same report. */
async function claimNext(): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "Report"
    SET "aiState" = 'PROCESSING', "aiClaimedAt" = now(), "aiAttempts" = "aiAttempts" + 1
    WHERE id = (
      SELECT id FROM "Report"
      WHERE "aiState" = 'PENDING'
      ORDER BY "createdAt"
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`;
  return rows[0]?.id ?? null;
}

/** Recovers reports left mid-processing by a crash or restart. */
async function requeueStale(): Promise<void> {
  await db.report.updateMany({
    where: { aiState: 'PROCESSING', aiClaimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MINUTES * 60_000) } },
    data: { aiState: 'PENDING' },
  });
}

async function recordFailure(reportId: string, error: unknown): Promise<void> {
  const report = await db.report.findUnique({ where: { id: reportId }, select: { aiAttempts: true } });
  await db.report.update({
    where: { id: reportId },
    data: {
      aiState: (report?.aiAttempts ?? MAX_ATTEMPTS) >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
      aiError: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    },
  });
}

/** Handles one report at a time, so two near-simultaneous duplicates cannot both become new issues. */
export async function drainQueue(log: (error: unknown) => void = console.error): Promise<void> {
  if (draining) {
    wakeRequested = true;
    return;
  }
  draining = true;
  try {
    do {
      wakeRequested = false;
      await requeueStale();
      for (let reportId = await claimNext(); reportId; reportId = await claimNext()) {
        try {
          await processReport(reportId);
        } catch (error) {
          log(error);
          await recordFailure(reportId, error);
        }
      }
    } while (wakeRequested);
  } finally {
    draining = false;
  }
}

export function wakeWorker(log?: (error: unknown) => void): void {
  void drainQueue(log).catch(log ?? console.error);
}

export function startWorker(log: (error: unknown) => void): void {
  wakeWorker(log);
  timer = setInterval(() => wakeWorker(log), SWEEP_INTERVAL_MS);
  timer.unref();
}

export function stopWorker(): void {
  if (timer) clearInterval(timer);
}
