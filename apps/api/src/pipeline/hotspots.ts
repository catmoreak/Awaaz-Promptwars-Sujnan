import { createHash } from 'node:crypto';
import { gridDisk, latLngToCell } from 'h3-js';
import {
  CAUSE_CHAINS,
  H3_RES_HOTSPOT,
  bandFor,
  type Category,
  type HotspotDto,
  type IssueSummaryDto,
  type MapCellDto,
  type PriorityBand,
} from '@awaaz/shared';
import { cellPolygon, type LatLng } from '../geo';

export const MIN_ISSUES_FOR_HOTSPOT = 3;
export const MIN_ISSUES_FOR_CHAIN = 2;

export interface HotspotIssue extends IssueSummaryDto {
  h3Res9: string;
}

export interface ResolvedIssue {
  h3Res9: string;
  category: Category;
}

const BAND_ORDER: PriorityBand[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function topBand(issues: IssueSummaryDto[]): PriorityBand {
  const rank = Math.max(...issues.map((issue) => BAND_ORDER.indexOf(issue.priority.band)));
  return BAND_ORDER[rank] ?? 'LOW';
}

/** Treats touching cells as one area, because a problem along a street crosses cell borders. */
function connectedCells(cells: string[]): string[][] {
  const remaining = new Set(cells);
  const groups: string[][] = [];

  for (const start of cells) {
    if (!remaining.has(start)) continue;
    remaining.delete(start);
    const group = [start];
    for (let i = 0; i < group.length; i++) {
      for (const neighbour of gridDisk(group[i] as string, 1)) {
        if (remaining.delete(neighbour)) group.push(neighbour);
      }
    }
    groups.push(group.sort());
  }
  return groups;
}

function linkedChain(categories: Category[]): Category[] | null {
  const present = new Set(categories);
  for (const chain of CAUSE_CHAINS) {
    const matched = chain.filter((category) => present.has(category));
    if (matched.length >= 2) return matched;
  }
  return null;
}

function labelFor(issues: HotspotIssue[]): string {
  const withAddress = [...issues].sort((a, b) => b.priority.score - a.priority.score).find((issue) => issue.address);
  return withAddress?.address ?? [...issues].sort((a, b) => b.reportCount - a.reportCount)[0]?.title ?? 'Unnamed area';
}

function centerOf(issues: LatLng[]): LatLng {
  return {
    lat: issues.reduce((sum, issue) => sum + issue.lat, 0) / issues.length,
    lng: issues.reduce((sum, issue) => sum + issue.lng, 0) / issues.length,
  };
}

/**
 * A hotspot is a connected area with enough open issues, with fewer issues that fit a known
 * cause chain such as a blocked drain flooding a road, or with a problem that has come back.
 */
export function buildHotspots(open: HotspotIssue[], recentlyResolved: ResolvedIssue[]): HotspotDto[] {
  const byCell = new Map<string, HotspotIssue[]>();
  for (const issue of open) byCell.set(issue.h3Res9, [...(byCell.get(issue.h3Res9) ?? []), issue]);

  return connectedCells([...byCell.keys()])
    .flatMap((cells): HotspotDto[] => {
      const issues = cells.flatMap((cell) => byCell.get(cell) ?? []);
      const counts = new Map<Category, number>();
      for (const issue of issues) counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);

      const chain = linkedChain([...counts.keys()]);
      const recurringResolvedCount = recentlyResolved.filter(
        (resolved) => cells.includes(resolved.h3Res9) && counts.has(resolved.category),
      ).length;

      const isHotspot =
        issues.length >= MIN_ISSUES_FOR_HOTSPOT || (chain !== null && issues.length >= MIN_ISSUES_FOR_CHAIN) || recurringResolvedCount > 0;
      if (!isHotspot) return [];

      return [
        {
          id: createHash('sha1').update(cells.join(',')).digest('hex').slice(0, 12),
          label: labelFor(issues),
          cells,
          boundary: cells.map(cellPolygon),
          center: centerOf(issues),
          issueIds: issues.map((issue) => issue.id),
          issueCount: issues.length,
          reportCount: issues.reduce((sum, issue) => sum + issue.reportCount, 0),
          categories: [...counts.entries()]
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count),
          linkedCauseChain: chain,
          recurringResolvedCount,
          score: issues.reduce((sum, issue) => sum + issue.priority.score, 0),
          topBand: topBand(issues),
        },
      ];
    })
    .sort((a, b) => b.score - a.score);
}

const TOWN_GRID_RINGS = 11;

let townGrid: LatLng[][] | undefined;

/** Fixed for a given town, so it is calculated once. */
export function buildTownGrid(center: LatLng): LatLng[][] {
  townGrid ??= gridDisk(latLngToCell(center.lat, center.lng, H3_RES_HOTSPOT), TOWN_GRID_RINGS).map(cellPolygon);
  return townGrid;
}

export function buildMapCells(open: HotspotIssue[]): MapCellDto[] {
  const byCell = new Map<string, HotspotIssue[]>();
  for (const issue of open) byCell.set(issue.h3Res9, [...(byCell.get(issue.h3Res9) ?? []), issue]);

  return [...byCell.entries()].map(([h3, issues]) => {
    const topScore = Math.max(...issues.map((issue) => issue.priority.score));
    return {
      h3,
      boundary: cellPolygon(h3),
      issueCount: issues.length,
      reportCount: issues.reduce((sum, issue) => sum + issue.reportCount, 0),
      topScore,
      topBand: bandFor(topScore),
    };
  });
}
