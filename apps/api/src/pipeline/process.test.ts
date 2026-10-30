import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db, tx, analyzeReport, decideDuplicate, readImage } = vi.hoisted(() => {
  const tx = {
    issue: { findFirst: vi.fn(), create: vi.fn() },
    report: { update: vi.fn() },
    issueEvent: { create: vi.fn() },
  };
  return {
    tx,
    db: {
      report: { findUniqueOrThrow: vi.fn() },
      issue: { findMany: vi.fn() },
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<void>) => work(tx)),
    },
    analyzeReport: vi.fn(),
    decideDuplicate: vi.fn(),
    readImage: vi.fn(),
  };
});
vi.mock('../db', () => ({ db }));
vi.mock('../ai/analyze', () => ({ analyzeReport }));
vi.mock('../ai/embeddings', () => ({ embedText: vi.fn(async () => ({ vector: [1], model: 'test' })) }));
vi.mock('../ai/places', () => ({
  nearbySensitiveSites: vi.fn(async () => []),
  reverseGeocode: vi.fn(async () => 'Looked-up address'),
}));
vi.mock('../reports', () => ({ readImage }));
vi.mock('./dedupe', () => ({ decideDuplicate }));
vi.mock('./issues', () => ({ refreshIssueAggregates: vi.fn() }));

import { processReport } from './process';
import { refreshIssueAggregates } from './issues';

const report = {
  id: 'report-1',
  text: 'Bin is overflowing',
  userCategory: 'WASTE',
  lat: 13.07,
  lng: 74.99,
  address: null,
  h3Res9: 'cell-9',
  h3Res10: 'cell-10',
  isSynthetic: false,
  createdAt: new Date('2026-10-01'),
  image: null,
};
const analysis = { source: 'LLM', title: 'Overflowing bin', summary: 'A bin is full.', category: 'WASTE', englishText: 'Bin is overflowing', hazard: 1, exposure: 1, serviceDisruption: false };
const newIssue = { mergeIntoIssueId: null, decision: { decision: 'NEW_ISSUE', reason: 'Nothing similar nearby.' } };
const merged = { mergeIntoIssueId: 'issue-9', decision: { decision: 'MERGED', reason: 'Same problem.' } };

const savedDecision = () => tx.report.update.mock.calls[0]?.[0].data.dedupe;

beforeEach(() => {
  vi.clearAllMocks();
  db.report.findUniqueOrThrow.mockResolvedValue(report);
  db.issue.findMany.mockResolvedValue([]);
  analyzeReport.mockResolvedValue(analysis);
  tx.issue.create.mockResolvedValue({ id: 'issue-new' });
});

describe('processReport', () => {
  it('creates a new issue when nothing matches', async () => {
    decideDuplicate.mockResolvedValue(newIssue);
    await processReport('report-1');

    expect(tx.issue.create.mock.calls[0]?.[0].data).toMatchObject({ title: 'Overflowing bin', address: 'Looked-up address', sensitiveSites: [] });
    expect(tx.report.update.mock.calls[0]?.[0].data).toMatchObject({ issueId: 'issue-new', aiState: 'DONE' });
    expect(tx.issueEvent.create.mock.calls[0]?.[0].data.type).toBe('CREATED');
  });

  it('links a duplicate to the open issue and refreshes its severity', async () => {
    decideDuplicate.mockResolvedValue(merged);
    tx.issue.findFirst.mockResolvedValue({ id: 'issue-9' });
    await processReport('report-1');

    expect(tx.issue.create).not.toHaveBeenCalled();
    expect(tx.report.update.mock.calls[0]?.[0].data.issueId).toBe('issue-9');
    expect(tx.issueEvent.create.mock.calls[0]?.[0].data.type).toBe('REPORT_LINKED');
    expect(refreshIssueAggregates).toHaveBeenCalledWith(tx, 'issue-9');
  });

  it('records the truth when the matching issue closed in the meantime', async () => {
    decideDuplicate.mockResolvedValue(merged);
    tx.issue.findFirst.mockResolvedValue(null);
    await processReport('report-1');

    expect(tx.issue.create).toHaveBeenCalled();
    expect(savedDecision()).toMatchObject({ decision: 'NEW_ISSUE' });
  });

  it('keeps the address the citizen typed', async () => {
    db.report.findUniqueOrThrow.mockResolvedValue({ ...report, address: 'Near the temple' });
    decideDuplicate.mockResolvedValue(newIssue);
    await processReport('report-1');
    expect(tx.report.update.mock.calls[0]?.[0].data.address).toBe('Near the temple');
  });

  it('sends the photo to the analysis', async () => {
    db.report.findUniqueOrThrow.mockResolvedValue({ ...report, image: { reportId: 'report-1', mime: 'image/jpeg' } });
    readImage.mockResolvedValue(Buffer.from('photo'));
    decideDuplicate.mockResolvedValue(newIssue);
    await processReport('report-1');
    expect(analyzeReport.mock.calls[0]?.[0].image).toEqual({ base64: Buffer.from('photo').toString('base64'), mime: 'image/jpeg' });
  });

  it('still reaches officers when the photo cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    db.report.findUniqueOrThrow.mockResolvedValue({ ...report, image: { reportId: 'report-1', mime: 'image/jpeg' } });
    readImage.mockRejectedValue(new Error('storage is down'));
    decideDuplicate.mockResolvedValue(newIssue);
    await processReport('report-1');

    expect(analyzeReport.mock.calls[0]?.[0].image).toBeUndefined();
    expect(tx.report.update.mock.calls[0]?.[0].data.aiState).toBe('DONE');
  });
});
