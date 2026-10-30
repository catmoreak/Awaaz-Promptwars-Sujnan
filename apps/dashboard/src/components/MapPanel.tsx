import { SERVICE_AREA, type MapResponse, type PriorityBand } from '@awaaz/shared';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useMemo } from 'react';
import { BAND_LABELS } from './Hexagon';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

const BANDS = Object.keys(BAND_LABELS) as PriorityBand[];

/** For a light street map. */
export const BAND_COLORS: Record<PriorityBand, string> = {
  CRITICAL: '#B42318',
  HIGH: '#C4560B',
  MEDIUM: '#A47E00',
  LOW: '#3F7564',
};

/** For the dark town map, checked for colour-blind separation against the map background. */
const NIGHT_COLORS: Record<PriorityBand, string> = {
  CRITICAL: '#E84C66',
  HIGH: '#F59A2C',
  MEDIUM: '#F7E48C',
  LOW: '#4FC3A1',
};

const NIGHT_TEXT: Record<PriorityBand, string> = {
  CRITICAL: '#FFFFFF',
  HIGH: '#12302F',
  MEDIUM: '#12302F',
  LOW: '#12302F',
};

interface MapPanelProps {
  data: MapResponse | undefined;
  selectedIssueId: string | null;
  onSelectIssue: (id: string) => void;
}

function MapLegend({ colors }: { colors: Record<PriorityBand, string> }) {
  return (
    <ul className="map-legend" aria-label="Map colours by highest priority in each area">
      {BANDS.map((band) => (
        <li key={band}>
          <i style={{ background: colors[band] }} />
          {BAND_LABELS[band]}
        </li>
      ))}
      <li>
        <i className="legend-hotspot" />
        Hotspot
      </li>
    </ul>
  );
}

/** Draws plain polygons, because a few dozen cells do not need a WebGL layer. */
function GoogleOverlays({ data, onSelectIssue }: Omit<MapPanelProps, 'selectedIssueId'>) {
  const map = useMap();

  useEffect(() => {
    if (!map || !data) return;

    const shapes: { setMap: (target: google.maps.Map | null) => void }[] = [];

    for (const cell of data.cells) {
      shapes.push(
        new google.maps.Polygon({
          map,
          paths: cell.boundary,
          fillColor: BAND_COLORS[cell.topBand],
          fillOpacity: 0.34,
          strokeColor: BAND_COLORS[cell.topBand],
          strokeWeight: 1,
        }),
      );
    }

    for (const hotspot of data.hotspots) {
      for (const boundary of hotspot.boundary) {
        shapes.push(
          new google.maps.Polyline({
            map,
            path: [...boundary, boundary[0] as google.maps.LatLngLiteral],
            strokeColor: '#0A3D3B',
            strokeWeight: 3,
          }),
        );
      }
    }

    for (const issue of data.issues) {
      const marker = new google.maps.Circle({
        map,
        center: { lat: issue.lat, lng: issue.lng },
        radius: 28,
        fillColor: BAND_COLORS[issue.priority.band],
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        clickable: true,
      });
      marker.addListener('click', () => onSelectIssue(issue.id));
      shapes.push(marker);
    }

    return () => shapes.forEach((shape) => shape.setMap(null));
  }, [map, data, onSelectIssue]);

  return null;
}

const centerOf = (boundary: { lat: number; lng: number }[]) => ({
  lat: boundary.reduce((sum, point) => sum + point.lat, 0) / boundary.length,
  lng: boundary.reduce((sum, point) => sum + point.lng, 0) / boundary.length,
});

function TownMap({ data, selectedIssueId, onSelectIssue }: MapPanelProps) {
  const view = useMemo(() => {
    const points = data?.grid.flat() ?? [];
    if (points.length === 0) return null;

    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const lngScale = Math.cos((SERVICE_AREA.lat * Math.PI) / 180);

    const width = (Math.max(...lngs) - minLng) * lngScale;
    const height = maxLat - minLat;
    return {
      viewBox: `0 0 ${width} ${height}`,
      x: (lng: number) => (lng - minLng) * lngScale,
      y: (lat: number) => maxLat - lat,
      unit: width / 900,
    };
  }, [data?.grid]);

  // The worst areas light up first, so the eye lands on them.
  const litCells = useMemo(() => [...(data?.cells ?? [])].sort((a, b) => b.topScore - a.topScore), [data?.cells]);

  if (!view || !data) return <div className="map-empty">Loading the town map</div>;

  const outline = (boundary: { lat: number; lng: number }[]) =>
    boundary.map(({ lat, lng }) => `${view.x(lng)},${view.y(lat)}`).join(' ');

  return (
    <svg className="town-map" viewBox={view.viewBox} role="img" aria-label="Map of Moodbidri as H3 cells, coloured by the highest priority issue in each">
      {data.grid.map((boundary, index) => (
        <polygon key={index} className="town-cell" points={outline(boundary)} strokeWidth={view.unit} />
      ))}

      {litCells.map((cell, index) => {
        const center = centerOf(cell.boundary);
        return (
          <g key={cell.h3} className="lit-cell" style={{ animationDelay: `${Math.min(index, 20) * 45}ms` }}>
            <polygon points={outline(cell.boundary)} fill={NIGHT_COLORS[cell.topBand]} />
            {cell.reportCount > 1 && (
              <text
                x={view.x(center.lng)}
                y={view.y(center.lat)}
                fill={NIGHT_TEXT[cell.topBand]}
                fontSize={view.unit * 19}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {cell.reportCount}
              </text>
            )}
          </g>
        );
      })}

      {data.hotspots.flatMap((hotspot) =>
        hotspot.boundary.map((boundary, index) => (
          <polygon key={`${hotspot.id}-${index}`} className="hotspot-outline" points={outline(boundary)} strokeWidth={view.unit * 2.5} />
        )),
      )}

      {data.issues.map((issue) => {
        const selected = issue.id === selectedIssueId;
        return (
          <circle
            key={issue.id}
            className="town-pin"
            cx={view.x(issue.lng)}
            cy={view.y(issue.lat)}
            r={view.unit * (selected ? 10 : 4.5)}
            fill={selected ? '#FFFFFF' : '#0A3D3B'}
            stroke={selected ? '#0A3D3B' : '#FFFFFF'}
            strokeWidth={view.unit * (selected ? 3.5 : 1.5)}
            onClick={() => onSelectIssue(issue.id)}
          >
            <title>{`${issue.title} (score ${issue.priority.score})`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

export function MapPanel(props: MapPanelProps) {
  const center = { lat: SERVICE_AREA.lat, lng: SERVICE_AREA.lng };
  const synthetic = props.data?.issues.some((issue) => issue.isSynthetic);

  if (MAPS_KEY) {
    return (
      <div className="map-frame">
        <APIProvider apiKey={MAPS_KEY}>
          <Map defaultCenter={center} defaultZoom={14} gestureHandling="greedy" clickableIcons={false} mapTypeControl={false} streetViewControl={false}>
            <GoogleOverlays data={props.data} onSelectIssue={props.onSelectIssue} />
          </Map>
        </APIProvider>
        <MapLegend colors={BAND_COLORS} />
        {synthetic && <p className="synthetic-flag">Synthetic demo data</p>}
      </div>
    );
  }

  return (
    <div className="map-frame map-night">
      <TownMap {...props} />
      <MapLegend colors={NIGHT_COLORS} />
      <p className="map-notice">Moodbidri as H3 cells, about 350 m across. Numbers count reports.</p>
      {synthetic && <p className="synthetic-flag">Synthetic demo data</p>}
    </div>
  );
}
