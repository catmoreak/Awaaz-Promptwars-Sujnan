import { SERVICE_AREA } from '@awaaz/shared';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { CoordinateFields, type MapPickerProps } from './CoordinateFields';

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY;

export function MapPicker({ value, onChange }: MapPickerProps) {
  if (!MAPS_KEY) return <CoordinateFields value={value} onChange={onChange} />;

  return (
    <div style={{ borderRadius: 8, height: 260, overflow: 'hidden' }}>
      <APIProvider apiKey={MAPS_KEY}>
        <Map
          defaultCenter={{ lat: SERVICE_AREA.lat, lng: SERVICE_AREA.lng }}
          defaultZoom={14}
          center={value ?? undefined}
          gestureHandling="greedy"
          clickableIcons={false}
          disableDefaultUI
          onClick={(event) => {
            if (event.detail.latLng) onChange(event.detail.latLng);
          }}
        >
          {value && (
            <Marker
              position={value}
              draggable
              onDragEnd={(event) => {
                const lat = event.latLng?.lat();
                const lng = event.latLng?.lng();
                if (lat !== undefined && lng !== undefined) onChange({ lat, lng });
              }}
            />
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
