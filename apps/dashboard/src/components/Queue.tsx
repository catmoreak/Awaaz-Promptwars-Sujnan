import { CATEGORY_LABELS, OPEN_STATUSES, STATUS_LABELS, type IssueSummaryDto } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../api';
import { ComparePanel } from './ComparePanel';
import { BandTag, ScoreHex } from './Hexagon';
import { Loader } from './Loader';

type Filter = 'open' | 'critical' | 'unassigned' | 'closed';

const isOpen = (issue: IssueSummaryDto) => OPEN_STATUSES.includes(issue.status);

const FILTERS: { id: Filter; label: string; test: (issue: IssueSummaryDto) => boolean }[] = [
  { id: 'open', label: 'All open', test: isOpen },
  { id: 'critical', label: 'Critical', test: (issue) => isOpen(issue) && issue.priority.band === 'CRITICAL' },
  { id: 'unassigned', label: 'Not assigned', test: (issue) => isOpen(issue) && !issue.teamId },
  { id: 'closed', label: 'Closed', test: (issue) => !isOpen(issue) },
];

const REFRESH_MS = 8_000;

interface QueueProps {
  selectedIssueId: string | null;
  onSelectIssue: (id: string) => void;
}

function daysOpen(issue: IssueSummaryDto): string {
  const days = Math.floor((Date.now() - new Date(issue.firstReportedAt).getTime()) / 86_400_000);
  if (days < 1) return 'Today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export function Queue({ selectedIssueId, onSelectIssue }: QueueProps) {
  const [filter, setFilter] = useState<Filter>('open');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const issues = useQuery({ queryKey: ['issues'], queryFn: api.issues, refetchInterval: REFRESH_MS });

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(({ id, test }) => [id, issues.data?.filter(test).length ?? 0])) as Record<Filter, number>,
    [issues.data],
  );

  const active = FILTERS.find((item) => item.id === filter) ?? FILTERS[0];
  const rows = issues.data?.filter(active?.test ?? isOpen) ?? [];

  const toggleCompare = (id: string) =>
    setCompareIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current.slice(-1), id]));

  const [first, second] = compareIds;

  return (
    <div className="page-body">
      <header className="page-header">
        <h1>Priority queue</h1>
      </header>

      <div className="tabs" role="tablist" aria-label="Filter issues">
        {FILTERS.map((item) => (
          <button key={item.id} role="tab" aria-selected={filter === item.id} className="tab" onClick={() => setFilter(item.id)}>
            {item.label}
            <span className="tab-count">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      {issues.isError && <p className="form-error">{issues.error.message}</p>}

      <div className="table-frame">
        <table className="queue-table">
          <thead>
            <tr>
              <th scope="col" className="col-check">
                <span className="visually-hidden">Compare</span>
              </th>
              <th scope="col" className="col-score">Score</th>
              <th scope="col">Issue</th>
              <th scope="col" className="col-category">Category</th>
              <th scope="col" className="col-status">Status</th>
              <th scope="col" className="col-number">Reports</th>
              <th scope="col" className="col-date">First reported</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((issue) => (
              <tr key={issue.id} data-selected={issue.id === selectedIssueId || undefined} onClick={() => onSelectIssue(issue.id)}>
                <td className="col-check" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Compare ${issue.code}`}
                    checked={compareIds.includes(issue.id)}
                    onChange={() => toggleCompare(issue.id)}
                  />
                </td>
                <td className="col-score">
                  <ScoreHex score={issue.priority.score} band={issue.priority.band} />
                </td>
                <td className="col-issue">
                  <button className="row-title" onClick={() => onSelectIssue(issue.id)}>
                    {issue.title}
                  </button>
                  <span className="row-sub">
                    <BandTag band={issue.priority.band} /> {issue.code}
                  </span>
                </td>
                <td className="col-category">{CATEGORY_LABELS[issue.category].en}</td>
                <td className="col-status">{STATUS_LABELS[issue.status].en}</td>
                <td className="col-number">{issue.reportCount}</td>
                <td className="col-date">{daysOpen(issue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {issues.data && rows.length === 0 && <p className="empty">Nothing here.</p>}
        {issues.isPending && <Loader />}
      </div>

      {compareIds.length > 0 && !comparing && (
        <div className="compare-bar" role="status">
          <span>{second ? '2 selected' : 'Select one more'}</span>
          <button className="button button-primary" disabled={!second} onClick={() => setComparing(true)}>
            Compare
          </button>
          <button className="button" onClick={() => setCompareIds([])}>
            Clear
          </button>
        </div>
      )}

      {comparing && first && second && (
        <ComparePanel
          a={first}
          b={second}
          onClose={() => {
            setComparing(false);
            setCompareIds([]);
          }}
        />
      )}
    </div>
  );
}
