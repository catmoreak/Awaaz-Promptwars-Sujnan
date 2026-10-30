import { SERVICE_AREA } from '@awaaz/shared';
import { describe, expect, it } from 'vitest';
import { cellPolygon, distanceMeters, h3Cells, isInServiceArea, neighbourhood } from './geo';

const TOWN = { lat: SERVICE_AREA.lat, lng: SERVICE_AREA.lng };

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(TOWN, TOWN)).toBe(0);
  });

  it('measures about 111 km for one degree of latitude', () => {
    expect(distanceMeters({ lat: 13, lng: 75 }, { lat: 14, lng: 75 })).toBeCloseTo(111_195, -2);
  });

  it('gives the same answer in both directions', () => {
    const other = { lat: 13.1, lng: 75.1 };
    expect(distanceMeters(TOWN, other)).toBeCloseTo(distanceMeters(other, TOWN), 6);
  });
});

describe('isInServiceArea', () => {
  it('accepts the town centre', () => {
    expect(isInServiceArea(TOWN)).toBe(true);
  });

  it('refuses a place in another city', () => {
    expect(isInServiceArea({ lat: 12.97, lng: 77.59 })).toBe(false);
  });
});

describe('H3 helpers', () => {
  it('returns a coarser hotspot cell and a finer duplicate cell', () => {
    const { h3Res9, h3Res10 } = h3Cells(TOWN);
    expect(h3Res9).not.toBe(h3Res10);
  });

  it('includes the cell itself and its neighbours', () => {
    const { h3Res10 } = h3Cells(TOWN);
    const cells = neighbourhood(h3Res10, 1);
    expect(cells).toContain(h3Res10);
    expect(cells).toHaveLength(7);
  });

  it('draws a cell as a closed shape of points', () => {
    expect(cellPolygon(h3Cells(TOWN).h3Res9).length).toBeGreaterThanOrEqual(6);
  });
});
