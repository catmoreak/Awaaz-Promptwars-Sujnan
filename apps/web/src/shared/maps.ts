import { useEffect, useState } from 'react';

/** A browser key is sent to every visitor anyway, so it lives here and needs no build setting. */
export const MAPS_KEY = 'AIzaSyC9m_51hSePlOwsp3Z4FEnM7WL3uEmUn7U';

/** Satellite imagery with road and place names, so staff can recognise the actual spot. */
export const MAP_TYPE = 'hybrid';

/** False when Google rejects the key, so pages can fall back instead of showing a broken map. */
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
