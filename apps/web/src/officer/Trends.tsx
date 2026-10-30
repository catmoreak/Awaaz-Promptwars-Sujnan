import { CATEGORY_LABELS, type StatsResponse } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { Loader } from '../shared/Loader';

function WeeklyTrend({ weeks }: { weeks: StatsResponse['weeklyReports'] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.map((week) => week.total));
  const label = (weekStart: string) => new Date(weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const active = hovered === null ? null : weeks[hovered];

  return (
    <figure className="chart">
      <figcaption>Reports each week</figcaption>
      <div className="trend" onMouseLeave={() => setHovered(null)}>
        {weeks.map((week, index) => (
          <div key={week.weekStart} className="trend-slot" onMouseEnter={() => setHovered(index)}>
            <i style={{ height: `${Math.max(week.total === 0 ? 0 : 3, (week.total / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="trend-axis">
        <span>{weeks[0] && label(weeks[0].weekStart)}</span>
        <span>{active ? `${label(active.weekStart)}: ${active.total}` : ''}</span>
        <span>This week</span>
      </div>
    </figure>
  );
}

function CategoryBars({ rows }: { rows: StatsResponse['byCategory'] }) {
  const sorted = [...rows].sort((a, b) => b.open - a.open);
  const max = Math.max(1, ...sorted.map((row) => row.open));

  return (
    <figure className="chart">
      <figcaption>Open issues by category</figcaption>
      <ul className="category-bars">
        {sorted.map((row) => (
          <li key={row.category} title={`${row.open} open of ${row.total} total`}>
            <span>{CATEGORY_LABELS[row.category].en}</span>
            <div className="category-track">
              <i style={{ width: `${(row.open / max) * 100}%` }} />
            </div>
            <b>{row.open}</b>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function Trends() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats });
  const data = stats.data;

  return (
    <div className="page-body">
      <header className="page-header">
        <h1>Trends</h1>
      </header>

      {stats.isError && <p className="form-error">{stats.error.message}</p>}
      {stats.isPending && <Loader />}

      {data && (
        <>
          <dl className="tallies">
            <div>
              <dt>Critical and open</dt>
              <dd>{data.criticalOpen}</dd>
            </div>
            <div>
              <dt>Not yet assigned</dt>
              <dd>{data.unassignedOpen}</dd>
            </div>
            <div>
              <dt>Repeat reports linked</dt>
              <dd>{data.duplicatesMerged}</dd>
            </div>
            <div>
              <dt>Median time to fix</dt>
              <dd>{data.medianHoursToResolve === null ? 'None yet' : `${(data.medianHoursToResolve / 24).toFixed(1)} days`}</dd>
            </div>
          </dl>
          <div className="chart-grid">
            <WeeklyTrend weeks={data.weeklyReports} />
            <CategoryBars rows={data.byCategory} />
          </div>
        </>
      )}
    </div>
  );
}
