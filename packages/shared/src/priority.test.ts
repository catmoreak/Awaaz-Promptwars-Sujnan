import { describe, expect, it } from 'vitest';
import { CRITICAL_SAFETY_FLOOR, comparePriority, scorePriority, type PriorityInput } from './priority';

const base: PriorityInput = {
  hazard: 1,
  exposure: 1,
  serviceDisruption: false,
  sensitiveSites: [],
  reportCount: 1,
  ageDays: 0,
};

describe('scorePriority', () => {
  it('returns the same result for the same input', () => {
    expect(scorePriority(base)).toEqual(scorePriority({ ...base }));
  });

  it('adds factor points up to the score', () => {
    const result = scorePriority({ ...base, hazard: 2, exposure: 2, reportCount: 3, ageDays: 4 });
    expect(result.factors.reduce((sum, factor) => sum + factor.points, 0)).toBe(result.score);
  });

  it('never lets a factor exceed its maximum', () => {
    const result = scorePriority({
      hazard: 3,
      exposure: 3,
      serviceDisruption: true,
      sensitiveSites: [{ name: 'School', type: 'school', distanceM: 0 }],
      reportCount: 500,
      ageDays: 500,
    });
    for (const factor of result.factors) expect(factor.points).toBeLessThanOrEqual(factor.maxPoints);
    expect(result.score).toBe(100);
  });

  it('keeps immediate danger critical even when it has only one fresh report', () => {
    const result = scorePriority({ ...base, hazard: 3, exposure: 0 });
    expect(result.score).toBe(CRITICAL_SAFETY_FLOOR);
    expect(result.band).toBe('CRITICAL');
    expect(result.safetyFloorApplied).toBe(true);
    expect(result.explanation).toContain('minimum score');
  });

  it('does not let repeat reports alone make a harmless issue critical', () => {
    const result = scorePriority({ ...base, hazard: 0, exposure: 0, reportCount: 200, ageDays: 30 });
    expect(result.band).not.toBe('CRITICAL');
    expect(result.band).not.toBe('HIGH');
  });

  it('separates a skipped lookup from a lookup that found nothing', () => {
    const skipped = scorePriority({ ...base, sensitiveSites: null }).factors.find((f) => f.key === 'sensitiveSite');
    const empty = scorePriority({ ...base, sensitiveSites: [] }).factors.find((f) => f.key === 'sensitiveSite');
    expect(skipped?.detail).toBe('Nearby places were not checked');
    expect(empty?.detail).toContain('No school or hospital');
  });

  it('scores a nearer school higher and ignores one outside the radius', () => {
    const at = (distanceM: number) =>
      scorePriority({ ...base, sensitiveSites: [{ name: 'School', type: 'school', distanceM }] }).factors.find(
        (f) => f.key === 'sensitiveSite',
      )?.points ?? 0;
    expect(at(10)).toBeGreaterThan(at(280));
    expect(at(301)).toBe(0);
  });

  it('never lowers the score when a factor gets worse', () => {
    const worse: Partial<PriorityInput>[] = [
      { hazard: 2 },
      { exposure: 2 },
      { reportCount: 5 },
      { ageDays: 5 },
      { serviceDisruption: true },
    ];
    const start = scorePriority(base).score;
    for (const change of worse) expect(scorePriority({ ...base, ...change }).score).toBeGreaterThanOrEqual(start);
  });
});

describe('comparePriority', () => {
  it('names the largest difference between two issues', () => {
    const danger = scorePriority({ ...base, hazard: 3, exposure: 2 });
    const pothole = scorePriority({ ...base, hazard: 1, exposure: 2, reportCount: 3 });
    const result = comparePriority(danger, pothole);
    expect(result.winner).toBe('a');
    expect(result.differences[0]?.key).toBe('hazard');
    expect(result.explanation).toContain('immediate danger to life');
  });

  it('is symmetric about which issue wins', () => {
    const high = scorePriority({ ...base, hazard: 2 });
    const low = scorePriority(base);
    expect(comparePriority(high, low).winner).toBe('a');
    expect(comparePriority(low, high).winner).toBe('b');
    expect(comparePriority(high, low).scoreGap).toBe(comparePriority(low, high).scoreGap);
  });

  it('reports a tie without inventing a reason', () => {
    const result = comparePriority(scorePriority(base), scorePriority(base));
    expect(result.winner).toBe('tie');
    expect(result.differences).toEqual([]);
  });
});
