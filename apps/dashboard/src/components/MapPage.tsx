import { CATEGORY_LABELS, SERVICE_AREA, type ActionBriefDto, type HotspotDto, type IssueSummaryDto } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { Repeat2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api';
import { BandTag } from './Hexagon';
import { MapPanel } from './MapPanel';

interface MapPageProps {
  selectedIssueId: string | null;
  onSelectIssue: (id: string) => void;
}

const REFRESH_MS = 8_000;
const LNG_SCALE = Math.cos((SERVICE_AREA.lat * Math.PI) / 180);

/** The hotspot's real footprint, so each area is recognisable by its shape. */
function Footprint({ hotspot }: { hotspot: HotspotDto }) {
  const points = hotspot.boundary.flat();
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const width = (maxLng - minLng) * LNG_SCALE;
  const height = maxLat - minLat;
  const toPoints = (boundary: HotspotDto['boundary'][number]) =>
    boundary.map(({ lat, lng }) => `${(lng - minLng) * LNG_SCALE},${maxLat - lat}`).join(' ');

  return (
    <svg className={`footprint band-${hotspot.topBand.toLowerCase()}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {hotspot.boundary.map((boundary, index) => (
        <polygon key={index} points={toPoints(boundary)} fill="currentColor" stroke="var(--surface)" strokeWidth={Math.max(width, height) * 0.03} />
      ))}
    </svg>
  );
}

function BriefBody({ brief }: { brief: ActionBriefDto }) {
  return (
    <div className="brief">
      <h4>{brief.headline}</h4>
      <p>{brief.situation}</p>
      <h5>Suspected cause, to check on site</h5>
      <p>{brief.suspectedCause}</p>
      <h5>Recommended steps</h5>
      <ol>
        {brief.recommendedActions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ol>
      <h5>Suggested teams</h5>
      <p>{brief.suggestedTeams.join(', ') || 'No team matched'}</p>
      <small>{brief.source === 'LLM' ? `Written by ${brief.model}` : 'Template brief. No AI model was used.'}</small>
    </div>
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
      <div className="hotspot-head">
        <Footprint hotspot={hotspot} />
        <div>
          <BandTag band={hotspot.topBand} />
          <h3>{hotspot.label}</h3>
          <p className="muted">
            {hotspot.issueCount} issues, {hotspot.reportCount} reports
          </p>
        </div>
      </div>

      {hotspot.linkedCauseChain && (
        <p>Possible shared cause: {hotspot.linkedCauseChain.map((category) => CATEGORY_LABELS[category].en.toLowerCase()).join(', ')}</p>
      )}
      {hotspot.recurringResolvedCount > 0 && (
        <p className="hotspot-recurring">
          <Repeat2 size={15} aria-hidden="true" />
          Recurring: {hotspot.recurringResolvedCount} fixed here in 90 days
        </p>
      )}

      <div className="hotspot-issues">
        {issues
          .filter((issue) => hotspot.issueIds.includes(issue.id))
          .map((issue) => (
            <button key={issue.id} className="chip" title={issue.title} onClick={() => onSelectIssue(issue.id)}>
              {issue.code}
            </button>
          ))}
      </div>

      {!wantBrief && (
        <button className="button" onClick={() => setWantBrief(true)}>
          Write action brief
        </button>
      )}
      {wantBrief && brief.isPending && <p className="muted">Writing the brief</p>}
      {brief.isError && <p className="form-error">{brief.error.message}</p>}
      {brief.data && <BriefBody brief={brief.data} />}
    </article>
  );
}

export function MapPage({ selectedIssueId, onSelectIssue }: MapPageProps) {
  const map = useQuery({ queryKey: ['map'], queryFn: api.map, refetchInterval: REFRESH_MS });

  return (
    <div className="map-page">
      <section className="map-column" aria-label="Map of open issues">
        <MapPanel data={map.data} selectedIssueId={selectedIssueId} onSelectIssue={onSelectIssue} />
      </section>

      <section className="hotspot-column" aria-label="Hotspots">
        <header className="page-header">
          <h1>Hotspots</h1>
        </header>
        {map.isError && <p className="form-error">{map.error.message}</p>}
        {map.data?.hotspots.length === 0 && <p className="empty">No hotspots.</p>}
        <div className="hotspots">
          {map.data?.hotspots.map((hotspot) => (
            <HotspotCard key={hotspot.id} hotspot={hotspot} issues={map.data.issues} onSelectIssue={onSelectIssue} />
          ))}
        </div>
      </section>
    </div>
  );
}
