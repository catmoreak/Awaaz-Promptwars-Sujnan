import { describe, expect, it } from 'vitest';
import { independentReports, reportText, toIssueSummary } from './mappers';

const citizen = (userId: string) => ({ userId, source: 'WEB' as const });

describe('independentReports', () => {
  it('counts one citizen repeating a complaint once', () => {
    expect(independentReports([citizen('a'), citizen('a'), citizen('a')])).toBe(1);
  });

  it('counts different citizens separately', () => {
    expect(independentReports([citizen('a'), citizen('b')])).toBe(2);
  });

  it('counts each staff entry, because each records a different caller', () => {
    const staff = { userId: 'officer', source: 'STAFF' as const };
    expect(independentReports([staff, staff, citizen('a')])).toBe(3);
  });

  it('counts anonymous and seeded reports one by one', () => {
    expect(independentReports([{ userId: null, source: 'SEED' }, { userId: null, source: 'SEED' }])).toBe(2);
  });
});

describe('toIssueSummary', () => {
  const issue = {
    id: 'issue-1',
    seq: 7,
    title: 'Pothole',
    category: 'ROAD_DAMAGE',
    status: 'SUBMITTED',
    hazard: 1,
    exposure: 1,
    serviceDisruption: false,
    sensitiveSites: [],
    reportCount: 99,
    firstReportedAt: new Date('2026-10-01'),
    resolvedAt: null,
    updatedAt: new Date('2026-10-02'),
    team: null,
    reports: [
      { ...citizen('a'), createdAt: new Date('2026-10-01'), image: null },
      { ...citizen('a'), createdAt: new Date('2026-10-03'), image: { reportId: 'report-2' } },
    ],
  } as unknown as Parameters<typeof toIssueSummary>[0];

  it('counts reports live, so a deleted report leaves no stale number', () => {
    expect(toIssueSummary(issue).reportCount).toBe(2);
  });

  it('pads the issue code and counts photos', () => {
    expect(toIssueSummary(issue)).toMatchObject({ code: 'ISS-0007', photoCount: 1 });
  });

  it('dates the issue by its newest report', () => {
    expect(toIssueSummary(issue).lastReportedAt).toBe(new Date('2026-10-03').toISOString());
  });

  it('gives no corroboration points to one citizen posting twice', () => {
    const corroboration = toIssueSummary(issue).priority.factors.find((factor) => factor.key === 'corroboration');
    expect(corroboration?.points).toBe(0);
  });
});

describe('reportText', () => {
  it('prefers the words the citizen wrote', () => {
    expect(reportText({ text: 'Bin is full', aiSummary: 'A full bin.' })).toBe('Bin is full');
  });

  it('falls back to the summary, then a label, for a photo with no text', () => {
    expect(reportText({ text: '', aiSummary: 'A full bin.' })).toBe('A full bin.');
    expect(reportText({ text: '', aiSummary: null })).toBe('Photo report');
  });
});
