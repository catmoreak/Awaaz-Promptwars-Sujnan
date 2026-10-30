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
    similarity,
    usedLocalEmbedding,
  });

  it('applies the stricter thresholds to real embeddings', () => {
    expect(classify(candidate(0.95, false))).toBe('MERGE');
    expect(classify(candidate(0.8, false))).toBe('REVIEW');
    expect(classify(candidate(0.5, false))).toBe('NEW');
  });

  it('applies the local thresholds to hashed embeddings', () => {
    expect(classify(candidate(0.6, true))).toBe('MERGE');
    expect(classify(candidate(0.4, true))).toBe('REVIEW');
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

  it('keeps a doubtful match separate when no model can confirm it', async () => {
    const report = incoming('Market entrance bin is full of waste today');
    const { decision, mergeIntoIssueId } = await decideDuplicate(report, [issue(BIN)], { llmAvailable: false });
    expect(mergeIntoIssueId).toBeNull();
    expect(decision.decision).toBe('NEW_ISSUE');
    expect(['NO_LLM_REVIEW', 'BELOW_THRESHOLD']).toContain(decision.method);
  });

  it('keeps a match separate when the model review fails', async () => {
    const report = incoming('Market entrance bin is overflowing and waste is on the road today');
    const { mergeIntoIssueId, decision } = await decideDuplicate(report, [issue(BIN)], { llmAvailable: true });
    expect(mergeIntoIssueId).toBeNull();
    expect(decision.decision).toBe('NEW_ISSUE');
  });
});
