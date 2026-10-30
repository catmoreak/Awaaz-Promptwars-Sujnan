import { useEffect, useState } from 'react';

export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

/** Satellite imagery with road and place names, so staff can recognise the actual spot. */
export const MAP_TYPE = 'hybrid';

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
