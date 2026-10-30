import { SERVICE_AREA, type MapResponse, type PriorityBand } from '@awaaz/shared';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useMemo } from 'react';
import { BAND_LABELS } from './Hexagon';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

export const BAND_COLORS: Record<PriorityBand, string> = {
  CRITICAL: '#B42318',
  HIGH: '#C4560B',
  MEDIUM: '#A47E00',
  LOW: '#3F7564',
};

interface MapPanelProps {
  data: MapResponse | undefined;
  selectedIssueId: string | null;
  onSelectIssue: (id: string) => void;
}

function MapLegend() {
  return (
    <ul className="map-legend" aria-label="Map colours by highest priority in each area">
      {(Object.keys(BAND_LABELS) as PriorityBand[]).map((band) => (
        <li key={band}>
          <i style={{ background: BAND_COLORS[band] }} />
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

function SchematicMap({ data, selectedIssueId, onSelectIssue }: MapPanelProps) {
  const view = useMemo(() => {
    const points = [
      ...(data?.cells.flatMap((cell) => cell.boundary) ?? []),
      ...(data?.issues.map(({ lat, lng }) => ({ lat, lng })) ?? []),
    ];
    if (points.length === 0) return null;

    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const lngScale = Math.cos((SERVICE_AREA.lat * Math.PI) / 180);
    const padding = 0.0015;

    const width = (maxLng - minLng) * lngScale + padding * 2;
    const height = maxLat - minLat + padding * 2;
    return {
      viewBox: `0 0 ${width} ${height}`,
      x: (lng: number) => (lng - minLng) * lngScale + padding,
      y: (lat: number) => maxLat - lat + padding,
      unit: width / 900,
    };
  }, [data]);

  if (!view) return <div className="map-empty">Open issues will appear here once reports arrive.</div>;

  const outline = (boundary: { lat: number; lng: number }[]) =>
    boundary.map(({ lat, lng }) => `${view.x(lng)},${view.y(lat)}`).join(' ');

  return (
    <svg className="schematic-map" viewBox={view.viewBox} role="img" aria-label="Schematic map of open issues in Moodbidri by H3 cell">
      {data?.cells.map((cell) => (
        <polygon key={cell.h3} points={outline(cell.boundary)} fill={BAND_COLORS[cell.topBand]} fillOpacity={0.3} stroke={BAND_COLORS[cell.topBand]} strokeWidth={view.unit} />
      ))}
      {data?.hotspots.flatMap((hotspot) =>
        hotspot.boundary.map((boundary, index) => (
          <polygon key={`${hotspot.id}-${index}`} points={outline(boundary)} fill="none" stroke="#0A3D3B" strokeWidth={view.unit * 3} />
        )),
      )}
      {data?.issues.map((issue) => (
        <circle
          key={issue.id}
          className="schematic-pin"
          cx={view.x(issue.lng)}
          cy={view.y(issue.lat)}
          r={view.unit * (issue.id === selectedIssueId ? 11 : 7)}
          fill={BAND_COLORS[issue.priority.band]}
          stroke="#FFFFFF"
          strokeWidth={view.unit * 2}
          onClick={() => onSelectIssue(issue.id)}
        >
          <title>{`${issue.title} (score ${issue.priority.score})`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function MapPanel(props: MapPanelProps) {
  const center = { lat: SERVICE_AREA.lat, lng: SERVICE_AREA.lng };

  return (
    <div className="map-frame">
      {MAPS_KEY ? (
        <APIProvider apiKey={MAPS_KEY}>
          <Map defaultCenter={center} defaultZoom={14} gestureHandling="greedy" clickableIcons={false} mapTypeControl={false} streetViewControl={false}>
            <GoogleOverlays data={props.data} onSelectIssue={props.onSelectIssue} />
          </Map>
        </APIProvider>
      ) : (
        <>
          <SchematicMap {...props} />
          <p className="map-notice">Schematic view from real H3 cells. Add a Google Maps key to show the street map.</p>
        </>
      )}
      <MapLegend />
      {props.data?.issues.some((issue) => issue.isSynthetic) && <p className="synthetic-flag">Synthetic demo data</p>}
    </div>
  );
}
