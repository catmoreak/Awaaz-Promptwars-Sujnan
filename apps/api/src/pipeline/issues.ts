import type { Prisma } from '../generated/prisma/client';

/** Keeps an issue's severity in step with its worst linked report. */
export async function refreshIssueAggregates(tx: Prisma.TransactionClient, issueId: string): Promise<void> {
  const reports = await tx.report.findMany({
    where: { issueId },
    select: { hazard: true, exposure: true, serviceDisruption: true, createdAt: true },
  });
  if (reports.length === 0) return;

  await tx.issue.update({
    where: { id: issueId },
    data: {
      reportCount: reports.length,
      hazard: Math.max(...reports.map((report) => report.hazard ?? 0)),
      exposure: Math.max(...reports.map((report) => report.exposure ?? 0)),
      serviceDisruption: reports.some((report) => report.serviceDisruption),
      firstReportedAt: new Date(Math.min(...reports.map((report) => report.createdAt.getTime()))),
    },
  });
}
