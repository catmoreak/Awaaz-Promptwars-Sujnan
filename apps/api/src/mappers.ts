import {
  scorePriority,
  type AdminReportDto,
  type DedupeDecision,
  type IssueSummaryDto,
  type Level,
  type PriorityResult,
  type ReportAnalysis,
  type SensitiveSite,
  type TimelineEntry,
} from '@awaaz/shared';
import type { Issue, IssueEvent, Report, Team, User } from './generated/prisma/client';

const DAY_MS = 86_400_000;

export const issueCode = (seq: number) => `ISS-${String(seq).padStart(4, '0')}`;
export const reportCode = (seq: number) => `AWZ-${String(seq).padStart(4, '0')}`;

/** Calculated on read, so age counts up and the stored data never holds a stale score. */
export function priorityOf(issue: Issue, now = new Date()): PriorityResult {
  const end = issue.resolvedAt ?? now;
  return scorePriority({
    hazard: issue.hazard as Level,
    exposure: issue.exposure as Level,
    serviceDisruption: issue.serviceDisruption,
    sensitiveSites: issue.sensitiveSites as SensitiveSite[] | null,
    reportCount: issue.reportCount,
    ageDays: (end.getTime() - issue.firstReportedAt.getTime()) / DAY_MS,
  });
}

export function toIssueSummary(issue: Issue & { team: Team | null }): IssueSummaryDto {
  return {
    id: issue.id,
    code: issueCode(issue.seq),
    title: issue.title,
    category: issue.category,
    status: issue.status,
    lat: issue.lat,
    lng: issue.lng,
    address: issue.address,
    reportCount: issue.reportCount,
    teamId: issue.teamId,
    teamName: issue.team?.name ?? null,
    priority: priorityOf(issue),
    isSynthetic: issue.isSynthetic,
    firstReportedAt: issue.firstReportedAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

export function toAnalysis(report: Report): ReportAnalysis | null {
  if (report.aiState !== 'DONE' || !report.aiSource || !report.aiCategory) return null;
  return {
    source: report.aiSource,
    model: report.aiModel ?? 'unknown',
    category: report.aiCategory,
    confidence: report.aiConfidence ?? 0,
    summary: report.aiSummary ?? '',
    language: report.language ?? 'unknown',
    englishText: report.englishText ?? report.text,
    reasoning: report.aiReasoning ?? '',
    categoryChanged: report.aiCategory !== report.userCategory,
    imageNote: report.aiImageNote,
    dedupe: report.dedupe as DedupeDecision | null,
    error: report.aiError,
  };
}

export function toTimelineEntry(event: IssueEvent): TimelineEntry {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    note: event.note,
    at: event.createdAt.toISOString(),
  };
}

export function toAdminReport(report: Report & { user: User | null; image: { reportId: string } | null }): AdminReportDto {
  return {
    id: report.id,
    code: reportCode(report.seq),
    text: report.text,
    source: report.source,
    channel: report.channel,
    viaVoice: report.viaVoice,
    reporter: report.user && {
      name: report.user.name,
      phone: report.user.phone,
      homeAddress: [report.user.addressLine, report.user.locality, report.user.pincode].filter(Boolean).join(', ') || null,
    },
    address: report.address,
    lat: report.lat,
    lng: report.lng,
    hasImage: report.image !== null,
    userCategory: report.userCategory,
    isSynthetic: report.isSynthetic,
    createdAt: report.createdAt.toISOString(),
    analysis: toAnalysis(report),
  };
}
