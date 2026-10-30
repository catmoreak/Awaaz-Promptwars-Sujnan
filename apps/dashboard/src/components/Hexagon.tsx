import type { PriorityBand } from '@awaaz/shared';

/** Flat-sided like an H3 cell at this latitude, so the queue and the map share one shape. */
export function Hexagon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" fill="currentColor" />
    </svg>
  );
}

export const BAND_LABELS: Record<PriorityBand, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export function ScoreHex({ score, band }: { score: number; band: PriorityBand }) {
  return (
    <span className={`score-hex band-${band.toLowerCase()}`}>
      <Hexagon />
      <b>{score}</b>
    </span>
  );
}

export function BandTag({ band }: { band: PriorityBand }) {
  return <span className={`band-tag band-${band.toLowerCase()}`}>{BAND_LABELS[band]}</span>;
}
