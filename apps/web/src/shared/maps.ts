import { useEffect, useState } from 'react';

export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

/** A charcoal street map that matches the rest of the site. */
export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#171c23' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a9b1bb' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1318' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2e3641' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a323d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1c222a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a4350' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b26' }] },
];

/** False when no key is set, or when Google rejects it, so pages can fall back instead of showing a broken map. */
export function useMapsAvailable(): boolean {
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    const target = window as Window & { gm_authFailure?: () => void };
    target.gm_authFailure = () => setRejected(true);
    return () => {
      delete target.gm_authFailure;
    };
  }, []);

  return Boolean(MAPS_KEY) && !rejected;
}
