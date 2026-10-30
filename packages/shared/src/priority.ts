export type Level = 0 | 1 | 2 | 3;
export type PriorityBand = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FactorKey = 'hazard' | 'exposure' | 'service' | 'sensitiveSite' | 'corroboration' | 'age';

export interface SensitiveSite {
  name: string;
  type: 'school' | 'hospital';
  distanceM: number;
}

export interface PriorityInput {
  /** 0 none, 1 nuisance, 2 injury possible, 3 immediate danger to life. */
  hazard: Level;
  /** 0 one household, 1 a few homes, 2 a street, 3 a whole neighbourhood or main road. */
  exposure: Level;
  /** True when an essential service such as water or road access has stopped. */
  serviceDisruption: boolean;
  /** Null means the lookup did not run, which is different from finding nothing nearby. */
  sensitiveSites: SensitiveSite[] | null;
  reportCount: number;
  ageDays: number;
}

export interface PriorityFactor {
  key: FactorKey;
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface PriorityResult {
  score: number;
  band: PriorityBand;
  factors: PriorityFactor[];
  /** Set when immediate danger raised the score to the critical floor. */
  safetyFloorApplied: boolean;
  explanation: string;
}

export const WEIGHTS: Record<FactorKey, number> = {
  hazard: 40,
  exposure: 20,
  corroboration: 15,
  sensitiveSite: 10,
  age: 10,
  service: 5,
};

export const CRITICAL_SAFETY_FLOOR = 75;
const SITE_RADIUS_M = 300;
const AGE_CAP_DAYS = 7;
const CORROBORATION_CAP_REPORTS = 8;

const HAZARD_TEXT: Record<Level, string> = {
  0: 'No safety risk was identified',
  1: 'Minor nuisance, with no likely injury',
  2: 'Someone could be injured',
  3: 'Immediate danger to life',
};

const EXPOSURE_TEXT: Record<Level, string> = {
  0: 'Affects one household',
  1: 'Affects a few homes',
  2: 'Affects a whole street',
  3: 'Affects a neighbourhood or main road',
};

export function bandFor(score: number): PriorityBand {
  if (score >= CRITICAL_SAFETY_FLOOR) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function sensitiveSiteFactor(sites: SensitiveSite[] | null): PriorityFactor {
  const base = { key: 'sensitiveSite', label: 'Nearby school or hospital', maxPoints: WEIGHTS.sensitiveSite } as const;
  if (sites === null) return { ...base, points: 0, detail: 'Nearby places were not checked' };

  const nearest = sites
    .filter((site) => site.distanceM <= SITE_RADIUS_M)
    .sort((a, b) => a.distanceM - b.distanceM)[0];
  if (!nearest) return { ...base, points: 0, detail: `No school or hospital within ${SITE_RADIUS_M} m` };

  const closeness = 1 - nearest.distanceM / SITE_RADIUS_M;
  return {
    ...base,
    points: Math.round(WEIGHTS.sensitiveSite * (0.5 + 0.5 * closeness)),
    detail: `${nearest.name} (${nearest.type}) is ${Math.round(nearest.distanceM)} m away`,
  };
}

/** Log scaling so that the tenth report on one issue adds little over the fifth. */
function corroborationPoints(reportCount: number): number {
  const extra = Math.max(0, reportCount - 1);
  const scale = Math.log2(1 + extra) / Math.log2(CORROBORATION_CAP_REPORTS);
  return Math.round(WEIGHTS.corroboration * Math.min(1, scale));
}

/** Deterministic on purpose: the same inputs always produce the same score and the same explanation. */
export function scorePriority(input: PriorityInput): PriorityResult {
  const reportCount = Math.max(1, input.reportCount);
  const ageDays = Math.max(0, input.ageDays);

  const factors: PriorityFactor[] = [
    {
      key: 'hazard',
      label: 'Safety risk',
      points: Math.round((WEIGHTS.hazard * input.hazard) / 3),
      maxPoints: WEIGHTS.hazard,
      detail: HAZARD_TEXT[input.hazard],
    },
    {
      key: 'exposure',
      label: 'People affected',
      points: Math.round((WEIGHTS.exposure * input.exposure) / 3),
      maxPoints: WEIGHTS.exposure,
      detail: EXPOSURE_TEXT[input.exposure],
    },
    {
      key: 'corroboration',
      label: 'Independent reports',
      points: corroborationPoints(reportCount),
      maxPoints: WEIGHTS.corroboration,
      detail: reportCount === 1 ? 'One report so far' : `${reportCount} independent reports describe this issue`,
    },
    sensitiveSiteFactor(input.sensitiveSites),
    {
      key: 'age',
      label: 'Time waiting',
      points: Math.round(WEIGHTS.age * Math.min(1, ageDays / AGE_CAP_DAYS)),
      maxPoints: WEIGHTS.age,
      detail: ageDays < 1 ? 'Reported today' : `Open for ${Math.floor(ageDays)} day${ageDays < 2 ? '' : 's'}`,
    },
    {
      key: 'service',
      label: 'Essential service',
      points: input.serviceDisruption ? WEIGHTS.service : 0,
      maxPoints: WEIGHTS.service,
      detail: input.serviceDisruption ? 'An essential service has stopped' : 'Essential services are still running',
    },
  ];

  const rawScore = factors.reduce((sum, factor) => sum + factor.points, 0);
  const safetyFloorApplied = input.hazard === 3 && rawScore < CRITICAL_SAFETY_FLOOR;
  const score = safetyFloorApplied ? CRITICAL_SAFETY_FLOOR : rawScore;
  const band = bandFor(score);

  return { score, band, factors, safetyFloorApplied, explanation: explain(score, band, factors, safetyFloorApplied) };
}

function explain(score: number, band: PriorityBand, factors: PriorityFactor[], floored: boolean): string {
  const drivers = factors
    .filter((factor) => factor.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((factor) => factor.detail.toLowerCase());

  const lead = `Scored ${score}/100 (${band.toLowerCase()})`;
  const reasons = drivers.length ? `: ${joinList(drivers)}.` : ': no significant risk factors were found.';
  const floor = floored ? ` Immediate danger sets a minimum score of ${CRITICAL_SAFETY_FLOOR}.` : '';
  return `${lead}${reasons}${floor}`;
}

function joinList(items: string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export interface FactorDifference {
  key: FactorKey;
  label: string;
  winnerPoints: number;
  loserPoints: number;
  delta: number;
  winnerDetail: string;
  loserDetail: string;
}

export interface PriorityComparison {
  winner: 'a' | 'b' | 'tie';
  scoreGap: number;
  differences: FactorDifference[];
  explanation: string;
}

/** Answers "why does this one outrank that one?" using only the factors behind the two scores. */
export function comparePriority(a: PriorityResult, b: PriorityResult): PriorityComparison {
  if (a.score === b.score) {
    return { winner: 'tie', scoreGap: 0, differences: [], explanation: `Both score ${a.score}/100.` };
  }

  const winner = a.score > b.score ? 'a' : 'b';
  const [high, low] = winner === 'a' ? [a, b] : [b, a];

  const differences = high.factors
    .flatMap((factor): FactorDifference[] => {
      const other = low.factors.find((candidate) => candidate.key === factor.key);
      if (!other || other.points === factor.points) return [];
      return [
        {
          key: factor.key,
          label: factor.label,
          winnerPoints: factor.points,
          loserPoints: other.points,
          delta: factor.points - other.points,
          winnerDetail: factor.detail,
          loserDetail: other.detail,
        },
      ];
    })
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const biggest = differences.find((difference) => difference.delta > 0);
  const reason = biggest
    ? ` The biggest difference is ${biggest.label.toLowerCase()}: ${biggest.winnerDetail.toLowerCase()}, compared with ${biggest.loserDetail.toLowerCase()}.`
    : '';
  const floor = high.safetyFloorApplied ? ` Its immediate danger also sets a minimum score of ${CRITICAL_SAFETY_FLOOR}.` : '';

  return {
    winner,
    scoreGap: high.score - low.score,
    differences,
    explanation: `It outranks the other by ${high.score - low.score} points.${reason}${floor}`,
  };
}
