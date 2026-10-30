import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../generated/prisma/client';
import { refreshIssueAggregates } from './issues';

function fakeTransaction(reports: object[]) {
  const update = vi.fn();
  const tx = { report: { findMany: vi.fn().mockResolvedValue(reports) }, issue: { update } };
  return { tx: tx as unknown as Prisma.TransactionClient, update };
}

describe('refreshIssueAggregates', () => {
  it('keeps the issue as serious as its worst report', async () => {
    const { tx, update } = fakeTransaction([
      { hazard: 1, exposure: 3, serviceDisruption: false, createdAt: new Date('2026-10-02') },
      { hazard: 3, exposure: 1, serviceDisruption: true, createdAt: new Date('2026-10-01') },
    ]);
    await refreshIssueAggregates(tx, 'issue-1');
    expect(update.mock.calls[0]?.[0].data).toEqual({
      reportCount: 2,
      hazard: 3,
      exposure: 3,
      serviceDisruption: true,
      firstReportedAt: new Date('2026-10-01'),
    });
  });

  it('leaves an issue with no reports alone', async () => {
    const { tx, update } = fakeTransaction([]);
    await refreshIssueAggregates(tx, 'issue-1');
    expect(update).not.toHaveBeenCalled();
  });
});
