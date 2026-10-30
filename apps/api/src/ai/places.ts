import { SERVICE_AREA, type SensitiveSite } from '@awaaz/shared';
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
    if (!response.ok) {
      console.error(`Google Places refused the lookup (${response.status}). Check the API restrictions on GOOGLE_MAPS_SERVER_KEY.`);
      return null;
    }

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

interface GeocodeResponse {
  status?: string;
  results?: { formatted_address?: string; geometry?: { location?: LatLng } }[];
}

/** Google answers 200 even when it refuses a request, so the status inside the reply has to be checked. */
async function geocode(params: Record<string, string>): Promise<GeocodeResponse | null> {
  if (!features.places) return null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    url.searchParams.set('key', env.GOOGLE_MAPS_SERVER_KEY);
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    const body = (await response.json()) as GeocodeResponse;
    if (body.status === 'OK' || body.status === 'ZERO_RESULTS') return body;
    console.error(`Google Geocoding refused the lookup (${body.status}). Check the API restrictions on GOOGLE_MAPS_SERVER_KEY.`);
    return null;
  } catch {
    return null;
  }
}

export async function reverseGeocode(point: LatLng): Promise<string | null> {
  const body = await geocode({ latlng: `${point.lat},${point.lng}` });
  return body?.results?.[0]?.formatted_address ?? null;
}

/** Looks a typed place up inside the town, so "bus stand" does not find a bus stand elsewhere in India. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const body = await geocode({ address: `${address}, ${SERVICE_AREA.name}, Karnataka`, components: 'country:IN' });
  return body?.results?.[0]?.geometry?.location ?? null;
}
