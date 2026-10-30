import { useEffect, useState } from 'react';

export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

/** A pale street map that matches the rest of the site. */
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#e9f0ee' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#42594f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f6f9f8' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c3d1cd' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d3dfdc' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f6f9f8' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bcd5dc' }] },
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
