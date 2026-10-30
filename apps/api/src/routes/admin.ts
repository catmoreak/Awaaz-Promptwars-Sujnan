import type { FastifyInstance } from 'fastify';
import {
  CATEGORIES,
  DetachReportSchema,
  ISSUE_STATUSES,
  MergeIssuesSchema,
  OPEN_STATUSES,
  STATUS_LABELS,
  StaffReportSchema,
  TRANSITIONS,
  TransitionSchema,
  canTransition,
  comparePriority,
  transitionNeedsNote,
  type CompareResponse,
  type IssueDetailDto,
  type IssueStatus,
  type IssueSummaryDto,
  type MapResponse,
  type SensitiveSite,
  type StatsResponse,
  type TeamDto,
} from '@awaaz/shared';
import { requireAdmin } from '../auth';
import { db } from '../db';
import { HttpError, badRequest, notFound } from '../errors';
import { Prisma } from '../generated/prisma/client';
import { issueCode, priorityOf, toAdminReport, toIssueSummary, toTimelineEntry } from '../mappers';
import { getActionBrief } from '../pipeline/brief';
import { buildHotspots, buildMapCells, type HotspotIssue } from '../pipeline/hotspots';
import { refreshIssueAggregates } from '../pipeline/issues';
import { wakeWorker } from '../pipeline/worker';
import { saveReport } from '../reports';

const RECURRENCE_WINDOW_DAYS = 90;
const WEEKS_OF_TREND = 8;
const DAY_MS = 86_400_000;

async function loadOpenIssues(): Promise<HotspotIssue[]> {
  const issues = await db.issue.findMany({
    where: { status: { in: [...OPEN_STATUSES] }, mergedIntoId: null },
    include: { team: true },
  });
  return issues.map((issue) => ({ ...toIssueSummary(issue), h3Res9: issue.h3Res9 }));
}

async function loadHotspots(open: HotspotIssue[]) {
  const since = new Date(Date.now() - RECURRENCE_WINDOW_DAYS * DAY_MS);
  const resolved = await db.issue.findMany({
    where: { status: 'RESOLVED', resolvedAt: { gte: since } },
    select: { h3Res9: true, category: true },
  });
  return buildHotspots(open, resolved);
}

function byPriorityDesc(a: IssueSummaryDto, b: IssueSummaryDto): number {
  return b.priority.score - a.priority.score || a.firstReportedAt.localeCompare(b.firstReportedAt);
}

async function loadSummary(id: string): Promise<IssueSummaryDto> {
  const issue = await db.issue.findUnique({ where: { id }, include: { team: true } });
  if (!issue) throw notFound('Issue');
  return toIssueSummary(issue);
}

async function loadDetail(id: string): Promise<IssueDetailDto> {
  const issue = await db.issue.findUnique({
    where: { id },
    include: {
      team: true,
      reports: { include: { user: true, image: { select: { reportId: true } } }, orderBy: { createdAt: 'asc' } },
      events: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!issue) throw notFound('Issue');

  return {
    ...toIssueSummary(issue),
    summary: issue.summary,
    sensitiveSites: issue.sensitiveSites as SensitiveSite[] | null,
    reports: issue.reports.map(toAdminReport),
    timeline: issue.events.map(toTimelineEntry),
    allowedTransitions: [...TRANSITIONS[issue.status]],
  };
}

const IssueFiltersSchema = {
  status: (value: unknown): value is IssueStatus => ISSUE_STATUSES.includes(value as IssueStatus),
  category: (value: unknown): value is (typeof CATEGORIES)[number] => CATEGORIES.includes(value as (typeof CATEGORIES)[number]),
};

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    await requireAdmin(request);
  });

  app.get<{ Querystring: { status?: string; category?: string } }>('/v1/admin/issues', async (request) => {
    const { status, category } = request.query;
    const issues = await db.issue.findMany({
      where: {
        mergedIntoId: null,
        status: IssueFiltersSchema.status(status) ? status : undefined,
        category: IssueFiltersSchema.category(category) ? category : undefined,
      },
      include: { team: true },
      take: 500,
      orderBy: { firstReportedAt: 'desc' },
    });
    return issues.map(toIssueSummary).sort(byPriorityDesc);
  });

  app.get<{ Params: { id: string } }>('/v1/admin/issues/:id', (request) => loadDetail(request.params.id));

  app.post<{ Params: { id: string } }>('/v1/admin/issues/:id/transition', async (request) => {
    const admin = await requireAdmin(request);
    const { to, note, teamId } = TransitionSchema.parse(request.body);

    const issue = await db.issue.findUnique({ where: { id: request.params.id } });
    if (!issue) throw notFound('Issue');

    const isReassignment = issue.status === 'ASSIGNED' && to === 'ASSIGNED';
    if (!isReassignment && !canTransition(issue.status, to)) {
      throw badRequest('invalid_transition', `Cannot move from ${issue.status} to ${to}`);
    }
    if (transitionNeedsNote(to) && !note) {
      throw badRequest('note_required', 'Add a note so that citizens can see why this was closed');
    }

    const team = teamId ? await db.team.findUnique({ where: { id: teamId } }) : null;
    if (teamId && !team) throw notFound('Team');
    if (to === 'ASSIGNED' && !team) throw badRequest('team_required', 'Choose a team to assign this issue to');

    await db.$transaction(async (tx) => {
      // Matching on the old status stops two officers from applying conflicting moves.
      const updated = await tx.issue.updateMany({
        where: { id: issue.id, status: issue.status },
        data: {
          status: to,
          teamId: to === 'ASSIGNED' ? team?.id : undefined,
          resolvedAt: to === 'RESOLVED' ? new Date() : null,
        },
      });
      if (updated.count === 0) throw new HttpError(409, 'status_changed', 'This issue was just updated. Refresh and try again.');

      await tx.issueEvent.create({
        data: {
          issueId: issue.id,
          actorId: admin.id,
          type: to === 'ASSIGNED' ? 'ASSIGNED' : 'STATUS_CHANGED',
          fromStatus: issue.status,
          toStatus: to,
          message: to === 'ASSIGNED' ? `Assigned to ${team?.name}` : STATUS_LABELS[to].en,
          note,
        },
      });
    });

    return loadDetail(issue.id);
  });

  app.post<{ Params: { id: string } }>('/v1/admin/issues/:id/merge', async (request) => {
    const admin = await requireAdmin(request);
    const { intoIssueId } = MergeIssuesSchema.parse(request.body);
    const sourceId = request.params.id;
    if (sourceId === intoIssueId) throw badRequest('invalid_merge', 'An issue cannot be merged into itself');

    const [source, target] = await Promise.all([
      db.issue.findUnique({ where: { id: sourceId } }),
      db.issue.findUnique({ where: { id: intoIssueId } }),
    ]);
    if (!source || !target) throw notFound('Issue');
    if (!OPEN_STATUSES.includes(source.status) || !OPEN_STATUSES.includes(target.status)) {
      throw badRequest('invalid_merge', 'Only open issues can be merged');
    }

    await db.$transaction(async (tx) => {
      await tx.report.updateMany({ where: { issueId: source.id }, data: { issueId: target.id } });
      await tx.issue.update({
        where: { id: source.id },
        data: { mergedIntoId: target.id, status: 'REJECTED', reportCount: 0 },
      });
      await tx.issueEvent.createMany({
        data: [
          { issueId: source.id, actorId: admin.id, type: 'MERGED', message: `Merged into ${issueCode(target.seq)}` },
          { issueId: target.id, actorId: admin.id, type: 'MERGED', message: `${issueCode(source.seq)} was merged into this issue` },
        ],
      });
      await refreshIssueAggregates(tx, target.id);
    });

    return loadDetail(target.id);
  });

  /** Lets staff undo a wrong AI merge by giving the report its own issue. */
  app.post<{ Params: { id: string } }>('/v1/admin/issues/:id/detach', async (request) => {
    const admin = await requireAdmin(request);
    const { reportId } = DetachReportSchema.parse(request.body);
    const issueId = request.params.id;

    const report = await db.report.findFirst({ where: { id: reportId, issueId } });
    if (!report) throw notFound('Report');
    const remaining = await db.report.count({ where: { issueId } });
    if (remaining < 2) throw badRequest('invalid_detach', 'An issue must keep at least one report');

    const created = await db.$transaction(async (tx) => {
      const issue = await tx.issue.create({
        data: {
          title: report.aiSummary?.slice(0, 100) ?? report.text.slice(0, 100),
          summary: report.aiSummary ?? report.text,
          category: report.aiCategory ?? report.userCategory,
          lat: report.lat,
          lng: report.lng,
          address: report.address,
          h3Res9: report.h3Res9,
          h3Res10: report.h3Res10,
          hazard: report.hazard ?? 1,
          exposure: report.exposure ?? 1,
          serviceDisruption: report.serviceDisruption ?? false,
          sensitiveSites: Prisma.DbNull,
          isSynthetic: report.isSynthetic,
          firstReportedAt: report.createdAt,
        },
      });
      await tx.report.update({ where: { id: report.id }, data: { issueId: issue.id } });
      await tx.issueEvent.createMany({
        data: [
          { issueId: issue.id, actorId: admin.id, type: 'CREATED', toStatus: 'SUBMITTED', message: 'Separated from a merged issue by staff' },
          { issueId, actorId: admin.id, type: 'REPORT_DETACHED', message: 'A report was separated by staff' },
        ],
      });
      await refreshIssueAggregates(tx, issueId);
      return issue;
    });

    return loadDetail(created.id);
  });

  app.get<{ Querystring: { a?: string; b?: string } }>('/v1/admin/compare', async (request): Promise<CompareResponse> => {
    const { a: firstId, b: secondId } = request.query;
    if (!firstId || !secondId) throw badRequest('invalid_compare', 'Choose two issues to compare');
    const [a, b] = await Promise.all([loadSummary(firstId), loadSummary(secondId)]);
    return { a, b, comparison: comparePriority(a.priority, b.priority) };
  });

  app.get('/v1/admin/map', async (): Promise<MapResponse> => {
    const open = await loadOpenIssues();
    return {
      cells: buildMapCells(open),
      hotspots: await loadHotspots(open),
      issues: open.map(({ h3Res9: _cell, ...issue }) => issue).sort(byPriorityDesc),
    };
  });

  app.get<{ Params: { id: string } }>('/v1/admin/hotspots/:id/brief', async (request) => {
    const open = await loadOpenIssues();
    const hotspot = (await loadHotspots(open)).find((item) => item.id === request.params.id);
    if (!hotspot) throw notFound('Hotspot');
    const issues = open.filter((issue) => hotspot.issueIds.includes(issue.id));
    return getActionBrief(hotspot, issues);
  });

  app.get('/v1/admin/teams', async (): Promise<TeamDto[]> => {
    const teams = await db.team.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { issues: { where: { status: { in: [...OPEN_STATUSES] } } } } } },
    });
    return teams.map((team) => ({ id: team.id, name: team.name, categories: team.categories, openIssues: team._count.issues }));
  });

  app.post('/v1/admin/reports', async (request, reply) => {
    const admin = await requireAdmin(request);
    const { channel, ...input } = StaffReportSchema.parse(request.body);
    const report = await saveReport({ ...input, source: 'STAFF', channel, userId: admin.id });
    wakeWorker((error) => request.log.error(error));
    return reply.code(202).send({ id: report.id });
  });

  app.get('/v1/admin/stats', async (): Promise<StatsResponse> => {
    const [issues, reports] = await Promise.all([
      db.issue.findMany({ where: { mergedIntoId: null } }),
      db.report.findMany({ select: { createdAt: true, aiState: true, aiSource: true, issueId: true } }),
    ]);

    const open = issues.filter((issue) => OPEN_STATUSES.includes(issue.status));
    const hoursToResolve = issues
      .filter((issue) => issue.resolvedAt)
      .map((issue) => ((issue.resolvedAt as Date).getTime() - issue.firstReportedAt.getTime()) / 3_600_000)
      .sort((a, b) => a - b);

    const thisWeek = new Date();
    thisWeek.setUTCHours(0, 0, 0, 0);
    thisWeek.setUTCDate(thisWeek.getUTCDate() - ((thisWeek.getUTCDay() + 6) % 7));

    const weeklyReports = Array.from({ length: WEEKS_OF_TREND }, (_, index) => {
      const start = new Date(thisWeek.getTime() - (WEEKS_OF_TREND - 1 - index) * 7 * DAY_MS);
      const end = start.getTime() + 7 * DAY_MS;
      const total = reports.filter(({ createdAt }) => createdAt >= start && createdAt.getTime() < end).length;
      return { weekStart: start.toISOString(), total };
    });

    return {
      openIssues: open.length,
      criticalOpen: open.filter((issue) => priorityOf(issue).band === 'CRITICAL').length,
      unassignedOpen: open.filter((issue) => !issue.teamId).length,
      duplicatesMerged: reports.filter((report) => report.issueId).length - issues.length,
      reportsTotal: reports.length,
      medianHoursToResolve: hoursToResolve[Math.floor(hoursToResolve.length / 2)] ?? null,
      aiPending: reports.filter((report) => report.aiState !== 'DONE').length,
      rulesFallbackReports: reports.filter((report) => report.aiSource === 'RULES').length,
      byCategory: CATEGORIES.map((category) => ({
        category,
        open: open.filter((issue) => issue.category === category).length,
        total: issues.filter((issue) => issue.category === category).length,
      })).filter((row) => row.total > 0),
      weeklyReports,
    };
  });
}
