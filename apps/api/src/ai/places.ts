import type { SensitiveSite } from '@awaaz/shared';
import { env, features } from '../config';
import { distanceMeters, type LatLng } from '../geo';

const SEARCH_RADIUS_M = 300;

interface PlacesResponse {
  places?: {
    displayName?: { text?: string };
    location?: { latitude: number; longitude: number };
    types?: string[];
  }[];
}

/** Returns null when the lookup could not run, so the score can say it was not checked. */
export async function nearbySensitiveSites(point: LatLng): Promise<SensitiveSite[] | null> {
  if (!features.places) return null;

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.GOOGLE_MAPS_SERVER_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.types',
      },
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        includedTypes: ['school', 'hospital'],
        maxResultCount: 10,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: { center: { latitude: point.lat, longitude: point.lng }, radius: SEARCH_RADIUS_M },
        },
      }),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as PlacesResponse;
    return (body.places ?? []).flatMap((place): SensitiveSite[] => {
      if (!place.location || !place.displayName?.text) return [];
      return [
        {
          name: place.displayName.text,
          type: place.types?.includes('hospital') ? 'hospital' : 'school',
          distanceM: distanceMeters(point, { lat: place.location.latitude, lng: place.location.longitude }),
        },
      ];
    });
  } catch {
    return null;
  }
}

export async function reverseGeocode(point: LatLng): Promise<string | null> {
  if (!features.places) return null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${point.lat},${point.lng}`);
    url.searchParams.set('key', env.GOOGLE_MAPS_SERVER_KEY);
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const body = (await response.json()) as { results?: { formatted_address?: string }[] };
    return body.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}
