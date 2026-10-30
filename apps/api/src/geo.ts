import { cellToBoundary, gridDisk, latLngToCell } from 'h3-js';
import { H3_RES_DUPLICATE, H3_RES_HOTSPOT } from '@awaaz/shared';
import { env } from './config';

export interface LatLng {
  lat: number;
  lng: number;
}

export function h3Cells(point: LatLng) {
  return {
    h3Res9: latLngToCell(point.lat, point.lng, H3_RES_HOTSPOT),
    h3Res10: latLngToCell(point.lat, point.lng, H3_RES_DUPLICATE),
  };
}

/** Includes neighbouring rings, because two reports metres apart can fall in different cells. */
export function neighbourhood(cell: string, rings: number): string[] {
  return gridDisk(cell, rings);
}

export function cellPolygon(cell: string): LatLng[] {
  return cellToBoundary(cell).map(([lat, lng]) => ({ lat, lng }));
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const earthRadiusM = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

export function isInServiceArea(point: LatLng): boolean {
  const center = { lat: env.SERVICE_CENTER_LAT, lng: env.SERVICE_CENTER_LNG };
  return distanceMeters(point, center) <= env.SERVICE_RADIUS_KM * 1000;
}
