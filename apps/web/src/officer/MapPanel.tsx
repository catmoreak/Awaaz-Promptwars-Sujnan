import { SERVICE_AREA, type MapResponse, type PriorityBand } from '@awaaz/shared';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useMemo, useRef } from 'react';
import { BAND_LABELS } from './Hexagon';
import { Loader } from '../shared/Loader';
import { MAPS_KEY, MAP_TYPE, useMapsAvailable } from '../shared/maps';

const BANDS = Object.keys(BAND_LABELS) as PriorityBand[];

/** Bright enough to stand out on satellite imagery. */
const TOWN_COLORS: Record<PriorityBand, string> = {
  CRITICAL: '#FF4B45',
  HIGH: '#FF9F1C',
  MEDIUM: '#4DA3FF',
  LOW: '#3DDC97',
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
  const fitted = useRef(false);

  // Runs once, so the 8-second refresh never moves the map while an officer is using it.
  useEffect(() => {
    if (!map || !data || fitted.current || data.issues.length === 0) return;
    fitted.current = true;
    const bounds = new google.maps.LatLngBounds({ lat: SERVICE_AREA.lat, lng: SERVICE_AREA.lng });
    for (const { lat, lng } of data.issues) bounds.extend({ lat, lng });
    map.fitBounds(bounds, 90);
  }, [map, data]);

  useEffect(() => {
    if (!map || !data) return;

    const shapes: { setMap: (target: google.maps.Map | null) => void }[] = [];

    for (const cell of data.cells) {
      shapes.push(
        new google.maps.Polygon({
          map,
          paths: cell.boundary,
          fillColor: TOWN_COLORS[cell.topBand],
          fillOpacity: 0.5,
          strokeColor: TOWN_COLORS[cell.topBand],
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
            strokeColor: '#FFFFFF',
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
        fillColor: TOWN_COLORS[issue.priority.band],
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

  if (!view || !data) return <Loader />;

  const outline = (boundary: { lat: number; lng: number }[]) =>
    boundary.map(({ lat, lng }) => `${view.x(lng)},${view.y(lat)}`).join(' ');

  return (
    <svg className="town-map" viewBox={view.viewBox} role="img" aria-label="Map of Moodbidri as H3 cells, coloured by the highest priority issue in each">
      {data.grid.map((boundary, index) => (
        <polygon key={index} className="town-cell" points={outline(boundary)} strokeWidth={view.unit} />
      ))}

      {data.cells.map((cell) => {
        return (
          <polygon key={cell.h3} points={outline(cell.boundary)} fill={TOWN_COLORS[cell.topBand]} />
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
            r={view.unit * (selected ? 10 : 3.5)}
            fill={selected ? '#FFFFFF' : '#12302A'}
            stroke={selected ? '#12302A' : '#FFFFFF'}
            strokeWidth={view.unit * (selected ? 3.5 : 1.5)}
            onClick={() => onSelectIssue(issue.id)}
          >
            <title>{`${issue.title} (score ${issue.priority.score})`}</title>
          </circle>
        );
      })}

      {data.cells
        .filter((cell) => cell.reportCount > 1)
        .map((cell) => {
          const center = centerOf(cell.boundary);
          return (
            <text
              key={cell.h3}
              className="cell-count"
              x={view.x(center.lng)}
              y={view.y(center.lat)}
              fontSize={view.unit * 19}
              strokeWidth={view.unit * 4}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {cell.reportCount}
            </text>
          );
        })}
    </svg>
  );
}

export function MapPanel(props: MapPanelProps) {
  const center = { lat: SERVICE_AREA.lat, lng: SERVICE_AREA.lng };
  const mapsAvailable = useMapsAvailable();

  if (mapsAvailable) {
    return (
      <div className="map-frame">
        <APIProvider apiKey={MAPS_KEY as string}>
          <Map defaultCenter={center} defaultZoom={14} mapTypeId={MAP_TYPE} gestureHandling="greedy" clickableIcons={false} disableDefaultUI zoomControl>
            <GoogleOverlays data={props.data} onSelectIssue={props.onSelectIssue} />
          </Map>
        </APIProvider>
        <MapLegend colors={TOWN_COLORS} />
      </div>
    );
  }

  return (
    <div className="map-frame map-offline">
      <TownMap {...props} />
      <MapLegend colors={TOWN_COLORS} />
    </div>
  );
}
