import { gridDisk, latLngToCell } from 'h3-js';
import { describe, expect, it } from 'vitest';
import { H3_RES_HOTSPOT, scorePriority, type Category } from '@awaaz/shared';
import { buildHotspots, buildMapCells, type HotspotIssue } from './hotspots';

const HOME = latLngToCell(13.0717, 74.9959, H3_RES_HOTSPOT);
const NEIGHBOUR = gridDisk(HOME, 1).find((cell) => cell !== HOME) as string;
const FAR_AWAY = latLngToCell(13.12, 75.06, H3_RES_HOTSPOT);

let nextId = 0;

function issue(category: Category, h3Res9: string, reportCount = 1): HotspotIssue {
  nextId += 1;
  return {
    id: `issue-${nextId}`,
    code: `ISS-${nextId}`,
    title: `${category} problem`,
    category,
    status: 'SUBMITTED',
    lat: 13.0717,
    lng: 74.9959,
    address: null,
    reportCount,
    teamId: null,
    teamName: null,
    priority: scorePriority({ hazard: 1, exposure: 1, serviceDisruption: false, sensitiveSites: [], reportCount, ageDays: 1 }),
    isSynthetic: true,
    photoCount: 0,
    firstReportedAt: new Date(0).toISOString(),
    lastReportedAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    h3Res9,
  };
}

describe('buildHotspots', () => {
  it('flags a lone issue when the same problem was fixed there before', () => {
    const open = issue('WASTE', HOME);
    const [hotspot] = buildHotspots([open], [{ h3Res9: HOME, category: 'WASTE' }]);
    expect(hotspot?.recurringResolvedCount).toBe(1);
    expect(buildHotspots([open], [{ h3Res9: HOME, category: 'ROAD_DAMAGE' }])).toEqual([]);
  });

  it('ignores a lone issue', () => {
    expect(buildHotspots([issue('WASTE', HOME)], [])).toEqual([]);
  });

  it('needs three unrelated issues to call an area a hotspot', () => {
    expect(buildHotspots([issue('WASTE', HOME), issue('STREETLIGHT', HOME)], [])).toEqual([]);
    expect(buildHotspots([issue('WASTE', HOME), issue('STREETLIGHT', HOME), issue('WATER_SUPPLY', HOME)], [])).toHaveLength(1);
  });

  it('flags two issues that fit a known cause chain', () => {
    const [hotspot] = buildHotspots([issue('DRAINAGE', HOME), issue('WATERLOGGING', HOME)], []);
    expect(hotspot?.linkedCauseChain).toEqual(['DRAINAGE', 'WATERLOGGING']);
  });

  it('joins neighbouring cells into one area', () => {
    const hotspots = buildHotspots([issue('DRAINAGE', HOME), issue('WATERLOGGING', NEIGHBOUR), issue('ROAD_DAMAGE', NEIGHBOUR)], []);
    expect(hotspots).toHaveLength(1);
    expect(hotspots[0]?.cells).toHaveLength(2);
    expect(hotspots[0]?.linkedCauseChain).toEqual(['DRAINAGE', 'WATERLOGGING', 'ROAD_DAMAGE']);
  });

  it('keeps separate parts of town apart', () => {
    const issues = [issue('DRAINAGE', HOME), issue('WATERLOGGING', HOME), issue('DRAINAGE', FAR_AWAY), issue('WATERLOGGING', FAR_AWAY)];
    expect(buildHotspots(issues, [])).toHaveLength(2);
  });

  it('counts only past issues of the same category in the same area as recurring', () => {
    const open = [issue('DRAINAGE', HOME), issue('WATERLOGGING', HOME)];
    const resolved = [
      { h3Res9: HOME, category: 'DRAINAGE' as const },
      { h3Res9: HOME, category: 'WASTE' as const },
      { h3Res9: FAR_AWAY, category: 'DRAINAGE' as const },
    ];
    expect(buildHotspots(open, resolved)[0]?.recurringResolvedCount).toBe(1);
  });

  it('gives the same area the same id every time', () => {
    const open = [issue('DRAINAGE', HOME), issue('WATERLOGGING', HOME)];
    expect(buildHotspots(open, [])[0]?.id).toBe(buildHotspots([...open].reverse(), [])[0]?.id);
  });

  it('ranks the heavier area first', () => {
    const heavy = [issue('DRAINAGE', HOME, 8), issue('WATERLOGGING', HOME, 8), issue('ROAD_DAMAGE', HOME, 8)];
    const light = [issue('DRAINAGE', FAR_AWAY), issue('WATERLOGGING', FAR_AWAY)];
    expect(buildHotspots([...light, ...heavy], [])[0]?.issueCount).toBe(3);
  });
});

describe('buildMapCells', () => {
  it('summarises each cell and returns a closed hexagon outline', () => {
    const [cell] = buildMapCells([issue('WASTE', HOME, 2), issue('WASTE', HOME, 3)]);
    expect(cell).toMatchObject({ h3: HOME, issueCount: 2, reportCount: 5 });
    expect(cell?.boundary).toHaveLength(6);
  });
});
