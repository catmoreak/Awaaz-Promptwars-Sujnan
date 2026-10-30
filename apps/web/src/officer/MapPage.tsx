import { CATEGORY_LABELS, SERVICE_AREA, type HotspotDto, type IssueSummaryDto } from '@awaaz/shared';
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

function HotspotCard({
  hotspot,
  issues,
  onSelectIssue,
}: {
  hotspot: HotspotDto;
  issues: IssueSummaryDto[];
  onSelectIssue: (id: string) => void;
}) {
  return (
    <article className="hotspot">
      <div className="hotspot-head">
        <Footprint hotspot={hotspot} />
        <div>
          <h3>{hotspot.label}</h3>
          <p className="hotspot-meta">
            <BandTag band={hotspot.topBand} />
            <span>{hotspot.reportCount} reports</span>
            {hotspot.recurringResolvedCount > 0 && (
              <span className="hotspot-recurring">
                <Repeat2 size={14} aria-hidden="true" />
                Recurring
              </span>
            )}
          </p>
        </div>
      </div>
      {hotspot.linkedCauseChain && (
        <p className="hotspot-chain">
          May be linked: {hotspot.linkedCauseChain.map((category) => CATEGORY_LABELS[category].en).join(', ')}. Check on site.
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
    </article>
  );
}

export function MapPage({ selectedIssueId, onSelectIssue }: MapPageProps) {
  const [includeDemo, setIncludeDemo] = useState(false);
  const map = useQuery({ queryKey: ['map', includeDemo], queryFn: () => api.map(includeDemo), refetchInterval: REFRESH_MS });

  return (
    <div className="map-page">
      <section className="map-column" aria-label="Map of open issues">
        <MapPanel data={map.data} selectedIssueId={selectedIssueId} onSelectIssue={onSelectIssue} />
      </section>

      <section className="hotspot-column" aria-label="Hotspots">
        <h1>Hotspots</h1>
        <label className="demo-toggle">
          <input type="checkbox" checked={includeDemo} onChange={(event) => setIncludeDemo(event.target.checked)} />
          Include synthetic demo reports
        </label>
        {map.isError && <p className="form-error">{map.error.message}</p>}
        {map.data?.hotspots.length === 0 && <p className="empty">No hotspots yet. One appears when 3 open issues are close together, when 2 related ones are, or when a fixed problem returns.</p>}
        <div className="hotspots">
          {map.data?.hotspots.map((hotspot) => (
            <HotspotCard key={hotspot.id} hotspot={hotspot} issues={map.data.issues} onSelectIssue={onSelectIssue} />
          ))}
        </div>
      </section>
    </div>
  );
}
