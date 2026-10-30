import { CATEGORY_LABELS, STATUS_LABELS, type IssueSummaryDto } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api';
import { ComparePanel } from './ComparePanel';
import { BandTag, ScoreHex } from './Hexagon';
import { MapPanel } from './MapPanel';

interface TriageProps {
  selectedIssueId: string | null;
  onSelectIssue: (id: string) => void;
}

const REFRESH_MS = 8_000;

function QueueItem({
  issue,
  rank,
  selected,
  compared,
  onSelect,
  onHover,
  onToggleCompare,
}: {
  issue: IssueSummaryDto;
  rank: number;
  selected: boolean;
  compared: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  onToggleCompare: () => void;
}) {
  return (
    <li className="queue-item" data-selected={selected || undefined} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      <button className="queue-open" onClick={onSelect} aria-label={`Rank ${rank}: ${issue.title}`}>
        <ScoreHex score={issue.priority.score} band={issue.priority.band} />
        <span className="queue-text">
          <strong>{issue.title}</strong>
          <span className="queue-reason">{issue.priority.explanation.split(': ')[1] ?? issue.priority.explanation}</span>
          <span className="queue-meta">
            <BandTag band={issue.priority.band} />
            <span>{CATEGORY_LABELS[issue.category].en}</span>
            <span>{STATUS_LABELS[issue.status].en}</span>
            {issue.reportCount > 1 && (
              <span className="report-count">
                <Users size={13} aria-hidden="true" />
                {issue.reportCount} reports
              </span>
            )}
          </span>
        </span>
      </button>
      <label className="compare-toggle">
        <input type="checkbox" checked={compared} onChange={onToggleCompare} />
        Compare
      </label>
    </li>
  );
}

export function Triage({ selectedIssueId, onSelectIssue }: TriageProps) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [hoveredIssueId, setHoveredIssueId] = useState<string | null>(null);
  const map = useQuery({ queryKey: ['map'], queryFn: api.map, refetchInterval: REFRESH_MS });

  const toggleCompare = (id: string) =>
    setCompareIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current.slice(-1), id]));

  const [firstCompare, secondCompare] = compareIds;

  return (
    <div className="triage">
      <section className="map-column" aria-label="Map of open issues">
        <MapPanel data={map.data} selectedIssueId={hoveredIssueId ?? selectedIssueId} onSelectIssue={onSelectIssue} />
      </section>

      <section className="queue-column" aria-label="Priority queue">
        <div className="queue-heading">
          <h1>What to fix first</h1>
          <p>{map.data ? `${map.data.issues.length} open issues, highest priority at the top` : 'Loading open issues'}</p>
        </div>

        {firstCompare && secondCompare && (
          <ComparePanel a={firstCompare} b={secondCompare} onClose={() => setCompareIds([])} />
        )}

        {map.isError && <p className="form-error">{map.error.message}</p>}
        {map.data?.issues.length === 0 && (
          <p className="empty">No issues are open. New citizen reports will appear here automatically.</p>
        )}

        <ol className="queue">
          {map.data?.issues.map((issue, index) => (
            <QueueItem
              key={issue.id}
              issue={issue}
              rank={index + 1}
              selected={issue.id === selectedIssueId}
              compared={compareIds.includes(issue.id)}
              onSelect={() => onSelectIssue(issue.id)}
              onHover={(hovering) => setHoveredIssueId(hovering ? issue.id : null)}
              onToggleCompare={() => toggleCompare(issue.id)}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}
