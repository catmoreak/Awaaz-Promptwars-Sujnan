import { CATEGORY_LABELS, SERVICE_AREA, type ActionBriefDto, type HotspotDto, type IssueSummaryDto, type StatsResponse } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { Repeat2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api';
import { BandTag } from './Hexagon';

function BriefBody({ brief }: { brief: ActionBriefDto }) {
  return (
    <div className="brief">
      <h4>{brief.headline}</h4>
      <p>{brief.situation}</p>
      <h5>Suspected cause (check on site)</h5>
      <p>{brief.suspectedCause}</p>
      <h5>Recommended steps</h5>
      <ol>
        {brief.recommendedActions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ol>
      <p>
        <strong>Suggested teams:</strong> {brief.suggestedTeams.join(', ') || 'None matched'}
      </p>
      <details>
        <summary>Evidence used</summary>
        <ul>
          {brief.evidence.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
      <small>{brief.source === 'LLM' ? `Written by ${brief.model}` : 'Template brief. No AI model was used.'}</small>
    </div>
  );
}

/** The hotspot's real footprint, so each area is recognisable by its shape. */
function Footprint({ hotspot }: { hotspot: HotspotDto }) {
  const points = hotspot.boundary.flat();
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const width = (maxLng - minLng) * Math.cos((SERVICE_AREA.lat * Math.PI) / 180);
  const height = maxLat - minLat;
  const toPoints = (boundary: HotspotDto['boundary'][number]) =>
    boundary.map(({ lat, lng }) => `${(lng - minLng) * Math.cos((SERVICE_AREA.lat * Math.PI) / 180)},${maxLat - lat}`).join(' ');

  return (
    <svg className={`footprint band-${hotspot.topBand.toLowerCase()}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {hotspot.boundary.map((boundary, index) => (
        <polygon key={index} points={toPoints(boundary)} fill="currentColor" stroke="var(--surface)" strokeWidth={Math.max(width, height) * 0.03} />
      ))}
    </svg>
  );
}

function HotspotCard({
  hotspot,
  issues,
  onSelectIssue,
}: {
  hotspot: HotspotDto;
  issues: IssueSummaryDto[];
  onSelectIssue: (id: string) => void;
}) {
  const [wantBrief, setWantBrief] = useState(false);
  const brief = useQuery({
    queryKey: ['brief', hotspot.id, hotspot.reportCount],
    queryFn: () => api.brief(hotspot.id),
    enabled: wantBrief,
  });

  return (
    <article className="hotspot">
      <Footprint hotspot={hotspot} />
      <div className="hotspot-body">
      <header>
        <BandTag band={hotspot.topBand} />
        <h3>{hotspot.label}</h3>
      </header>
      <p>
        {hotspot.issueCount} open issues from {hotspot.reportCount} reports:{' '}
        {hotspot.categories.map(({ category, count }) => `${CATEGORY_LABELS[category].en.toLowerCase()} (${count})`).join(', ')}.
      </p>
      {hotspot.linkedCauseChain && (
        <p className="hotspot-link">
          {hotspot.linkedCauseChain.map((category) => CATEGORY_LABELS[category].en).join(', ')} often share one cause. One visit may fix several reports.
        </p>
      )}
      {hotspot.recurringResolvedCount > 0 && (
        <p className="hotspot-recurring">
          <Repeat2 size={15} aria-hidden="true" />
          {hotspot.recurringResolvedCount} similar {hotspot.recurringResolvedCount === 1 ? 'issue was' : 'issues were'} fixed here in the last 90 days, so the cause may not be gone.
        </p>
      )}
      <div className="hotspot-issues">
        {issues
          .filter((issue) => hotspot.issueIds.includes(issue.id))
          .map((issue) => (
            <button key={issue.id} className="text-button" title={issue.title} onClick={() => onSelectIssue(issue.id)}>
              {issue.code}: {CATEGORY_LABELS[issue.category].en}
            </button>
          ))}
      </div>

      {!wantBrief && (
        <button className="button button-primary" onClick={() => setWantBrief(true)}>
          Write action brief
        </button>
      )}
      {wantBrief && brief.isPending && <p className="muted">Writing the brief</p>}
      {brief.isError && <p className="form-error">{brief.error.message}</p>}
      {brief.data && <BriefBody brief={brief.data} />}
      </div>
    </article>
  );
}

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
        <span>{active ? `Week of ${label(active.weekStart)}: ${active.total} reports` : 'Hover a bar for its count'}</span>
        <span>This week</span>
      </div>
      <details>
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Week of</th>
              <th scope="col">Reports</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.weekStart}>
                <td>{label(week.weekStart)}</td>
                <td>{week.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
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

export function Insights({ onSelectIssue }: { onSelectIssue: (id: string) => void }) {
  const map = useQuery({ queryKey: ['map'], queryFn: api.map });
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats });

  return (
    <div className="insights">
      <section aria-label="Hotspots">
        <h1>Where problems are clustering</h1>
        <p className="lead">Areas with several open issues, or with issues that often share one cause.</p>
        {map.isError && <p className="form-error">{map.error.message}</p>}
        {map.data?.hotspots.length === 0 && <p className="empty">No hotspots right now. Areas appear here once related issues cluster.</p>}
        <div className="hotspots">
          {map.data?.hotspots.map((hotspot) => (
            <HotspotCard key={hotspot.id} hotspot={hotspot} issues={map.data.issues} onSelectIssue={onSelectIssue} />
          ))}
        </div>
      </section>

      <section className="insight-side" aria-label="Trends">
        {stats.data && (
          <>
            <dl className="tallies">
              <div>
                <dt>Critical and open</dt>
                <dd>{stats.data.criticalOpen}</dd>
              </div>
              <div>
                <dt>Not yet assigned</dt>
                <dd>{stats.data.unassignedOpen}</dd>
              </div>
              <div>
                <dt>Repeat reports linked</dt>
                <dd>{stats.data.duplicatesMerged}</dd>
              </div>
              <div>
                <dt>Median time to fix</dt>
                <dd>{stats.data.medianHoursToResolve === null ? 'None yet' : `${(stats.data.medianHoursToResolve / 24).toFixed(1)} days`}</dd>
              </div>
            </dl>
            <WeeklyTrend weeks={stats.data.weeklyReports} />
            <CategoryBars rows={stats.data.byCategory} />
            {stats.data.rulesFallbackReports > 0 && (
              <p className="muted">{stats.data.rulesFallbackReports} reports were scored by keyword rules, not an AI model.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
