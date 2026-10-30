import { describe, expect, it } from 'vitest';
import { hashEmbedding, LOCAL_EMBEDDING_MODEL } from '../ai/embeddings';
import { classify, decideDuplicate, rankCandidates, type CandidateIssue, type IncomingReport } from './dedupe';

const CENTER = { lat: 13.0717, lng: 74.9959 };
const metresNorth = (metres: number) => ({ lat: CENTER.lat + metres / 111_320, lng: CENTER.lng });

function incoming(text: string, overrides: Partial<IncomingReport> = {}): IncomingReport {
  return { ...CENTER, text, category: 'WASTE', embedding: hashEmbedding(text), embeddingModel: LOCAL_EMBEDDING_MODEL, ...overrides };
}

function issue(text: string, overrides: Partial<CandidateIssue> = {}): CandidateIssue {
  return {
    ...CENTER,
    id: 'issue-1',
    title: text,
    category: 'WASTE',
    reports: [{ text, embedding: hashEmbedding(text), embeddingModel: LOCAL_EMBEDDING_MODEL }],
    ...overrides,
  };
}

const BIN = 'The garbage bin at the market entrance is overflowing and waste is spreading onto the road.';

describe('rankCandidates', () => {
  it('ignores issues beyond the distance limit, however similar the text is', () => {
    expect(rankCandidates(incoming(BIN), [issue(BIN, metresNorth(201))])).toEqual([]);
    expect(rankCandidates(incoming(BIN), [issue(BIN, metresNorth(150))])).toHaveLength(1);
  });

  it('ignores unrelated categories even at the same spot', () => {
    expect(rankCandidates(incoming(BIN), [issue(BIN, { category: 'STREETLIGHT' })])).toEqual([]);
  });

  it('compares related categories such as a blocked drain and flooding', () => {
    const report = incoming('Water everywhere', { category: 'WATERLOGGING' });
    expect(rankCandidates(report, [issue('Drain blocked', { category: 'DRAINAGE' })])).toHaveLength(1);
  });

  it('uses the most similar report in an issue, not an average', () => {
    const candidate = issue('Unrelated first report about something else', {
      reports: [
        { text: 'Unrelated words', embedding: hashEmbedding('Unrelated words'), embeddingModel: LOCAL_EMBEDDING_MODEL },
        { text: BIN, embedding: hashEmbedding(BIN), embeddingModel: LOCAL_EMBEDDING_MODEL },
      ],
    });
    expect(rankCandidates(incoming(BIN), [candidate])[0]?.similarity).toBeCloseTo(1);
  });

  it('falls back to local comparison when embedding models differ', () => {
    const candidate = issue(BIN, {
      reports: [{ text: BIN, embedding: [1, 0, 0], embeddingModel: 'mistral-embed' }],
    });
    const [ranked] = rankCandidates(incoming(BIN), [candidate]);
    expect(ranked?.usedLocalEmbedding).toBe(true);
    expect(ranked?.similarity).toBeCloseTo(1);
  });
});

describe('classify', () => {
  const candidate = (similarity: number, usedLocalEmbedding: boolean) => ({
    issue: issue(BIN),
    distanceM: 10,
    sameCategory: true,
    similarity,
    usedLocalEmbedding,
  });

  it('never auto-merges a different category, however similar the text is', () => {
    expect(classify({ ...candidate(0.99, false), sameCategory: false })).toBe('REVIEW');
  });

  it('never auto-merges beyond the auto-merge distance', () => {
    expect(classify({ ...candidate(0.99, false), distanceM: 76 })).toBe('REVIEW');
    expect(classify({ ...candidate(0.99, false), distanceM: 75 })).toBe('MERGE');
  });

  it('does not review a weak match just because it is close', () => {
    expect(classify({ ...candidate(0.2, false), distanceM: 1 })).toBe('NEW');
  });

  it('applies the stricter thresholds to real embeddings', () => {
    expect(classify(candidate(0.95, false))).toBe('MERGE');
    expect(classify(candidate(0.8, false))).toBe('REVIEW');
    expect(classify(candidate(0.5, false))).toBe('NEW');
  });

  it('applies the local thresholds to hashed embeddings', () => {
    expect(classify(candidate(0.45, true))).toBe('MERGE');
    expect(classify(candidate(0.3, true))).toBe('REVIEW');
    expect(classify(candidate(0.1, true))).toBe('NEW');
  });
});

describe('decideDuplicate', () => {
  it('creates a new issue when nothing is nearby', async () => {
    const { decision, mergeIntoIssueId } = await decideDuplicate(incoming(BIN), [], { llmAvailable: false });
    expect(mergeIntoIssueId).toBeNull();
    expect(decision.method).toBe('NO_CANDIDATES');
  });

  it('merges a near-identical report and explains why', async () => {
    const { decision, mergeIntoIssueId } = await decideDuplicate(incoming(BIN), [issue(BIN)], { llmAvailable: false });
    expect(mergeIntoIssueId).toBe('issue-1');
    expect(decision.decision).toBe('MERGED');
    expect(decision.reason).toContain('100% similar');
  });

  describe('with a similarity of 0.8, inside the review band', () => {
    const report = incoming('New report', { embedding: [1, 0], embeddingModel: 'mistral-embed' });
    const nearby = issue('Existing report', {
      reports: [{ text: 'Existing report', embedding: [0.8, 0.6], embeddingModel: 'mistral-embed' }],
    });

    it('keeps the match separate when no model can confirm it', async () => {
      const { decision, mergeIntoIssueId } = await decideDuplicate(report, [nearby], { llmAvailable: false });
      expect(mergeIntoIssueId).toBeNull();
      expect(decision).toMatchObject({ decision: 'NEW_ISSUE', method: 'NO_LLM_REVIEW', similarity: 0.8 });
      expect(decision.reason).toContain('no AI model was available');
    });

    it('keeps the match separate when the model review fails', async () => {
      const { decision, mergeIntoIssueId } = await decideDuplicate(report, [nearby], { llmAvailable: true });
      expect(mergeIntoIssueId).toBeNull();
      expect(decision).toMatchObject({ decision: 'NEW_ISSUE', method: 'NO_LLM_REVIEW' });
      expect(decision.reason).toContain('AI review failed');
    });
  });

  it('keeps a weak match separate without asking a model', async () => {
    const report = incoming('New report', { embedding: [1, 0], embeddingModel: 'mistral-embed' });
    const nearby = issue('Existing report', {
      reports: [{ text: 'Existing report', embedding: [0.5, 0.866], embeddingModel: 'mistral-embed' }],
    });
    const { decision } = await decideDuplicate(report, [nearby], { llmAvailable: true });
    expect(decision).toMatchObject({ decision: 'NEW_ISSUE', method: 'BELOW_THRESHOLD' });
  });
});
