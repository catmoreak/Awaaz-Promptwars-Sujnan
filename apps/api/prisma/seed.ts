import { STATUS_LABELS, TRANSITIONS, type IssueStatus } from '@awaaz/shared';
import { loginAsDemo } from '../src/auth';
import { db } from '../src/db';
import { h3Cells } from '../src/geo';
import { drainQueue } from '../src/pipeline/worker';
import { SEED_OUTCOMES, SEED_REPORTS, TEAMS, toCoordinates } from './seed-data';

const HOUR_MS = 3_600_000;

/** Only synthetic rows are removed, so reseeding can never touch a real citizen's report. */
async function clearSynthetic() {
  await db.report.deleteMany({ where: { isSynthetic: true } });
  await db.issue.deleteMany({ where: { isSynthetic: true } });
  await db.hotspotBrief.deleteMany();
}

async function seedTeams() {
  for (const team of TEAMS) {
    await db.team.upsert({ where: { name: team.name }, create: team, update: { categories: team.categories } });
  }
}

async function seedReports(demoOwnerId: string) {
  const now = Date.now();
  for (const report of SEED_REPORTS) {
    const point = toCoordinates(report);
    await db.report.create({
      data: {
        text: report.text,
        userCategory: report.category,
        ...point,
        ...h3Cells(point),
        source: 'SEED',
        isSynthetic: true,
        userId: report.demoOwner ? demoOwnerId : null,
        createdAt: new Date(now - report.hoursAgo * HOUR_MS),
      },
    });
  }
}

/** Walks each issue through the real workflow order, so its history reads as it would in use. */
function pathTo(target: IssueStatus): IssueStatus[] {
  const path: IssueStatus[] = ['TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
  return path.slice(0, path.indexOf(target) + 1);
}

async function applyOutcomes() {
  const groupOf = new Map(SEED_REPORTS.map((report) => [report.text, report.group]));
  const reports = await db.report.findMany({ where: { isSynthetic: true, issueId: { not: null } }, select: { text: true, issueId: true } });

  for (const outcome of SEED_OUTCOMES) {
    const issueIds = new Set(reports.filter((report) => groupOf.get(report.text) === outcome.group).map((report) => report.issueId as string));
    const team = await db.team.findUniqueOrThrow({ where: { name: outcome.team } });

    for (const issueId of issueIds) {
      const issue = await db.issue.findUniqueOrThrow({ where: { id: issueId } });
      const end = outcome.resolvedHoursAgo ? Date.now() - outcome.resolvedHoursAgo * HOUR_MS : Date.now() - HOUR_MS;
      const steps = pathTo(outcome.status);
      const start = issue.firstReportedAt.getTime();

      let from: IssueStatus = issue.status;
      for (const [index, to] of steps.entries()) {
        if (!TRANSITIONS[from].includes(to)) throw new Error(`Seed path is invalid: ${from} to ${to}`);
        const isLast = index === steps.length - 1;
        await db.issueEvent.create({
          data: {
            issueId,
            type: to === 'ASSIGNED' ? 'ASSIGNED' : 'STATUS_CHANGED',
            fromStatus: from,
            toStatus: to,
            message: to === 'ASSIGNED' ? `Assigned to ${team.name}` : STATUS_LABELS[to].en,
            note: isLast ? outcome.note : undefined,
            createdAt: new Date(start + ((end - start) * (index + 1)) / steps.length),
          },
        });
        from = to;
      }

      await db.issue.update({
        where: { id: issueId },
        data: {
          status: outcome.status,
          teamId: team.id,
          resolvedAt: outcome.status === 'RESOLVED' ? new Date(end) : null,
        },
      });
    }
  }
}

async function main() {
  await clearSynthetic();
  await seedTeams();
  const demoCitizen = await loginAsDemo('CITIZEN');
  await seedReports(demoCitizen.id);
  await drainQueue();
  await applyOutcomes();

  const [reports, issues, failed] = await Promise.all([
    db.report.count({ where: { isSynthetic: true } }),
    db.issue.count({ where: { isSynthetic: true } }),
    db.report.count({ where: { isSynthetic: true, aiState: { not: 'DONE' } } }),
  ]);
  console.log(`Seeded ${reports} synthetic reports into ${issues} issues. Not processed: ${failed}.`);
}

try {
  await main();
} finally {
  await db.$disconnect();
}
