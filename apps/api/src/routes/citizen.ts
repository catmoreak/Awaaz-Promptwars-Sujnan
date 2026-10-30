import type { FastifyInstance } from 'fastify';
import { CreateReportSchema, TranscribeSchema, type CitizenReportDto } from '@awaaz/shared';
import { transcribeAudio } from '../ai/transcribe';
import { requireUser } from '../auth';
import { db } from '../db';
import { forbidden, notFound } from '../errors';
import { Prisma } from '../generated/prisma/client';
import { issueCode, priorityOf, reportCode, reportText, toAnalysis, toTimelineEntry } from '../mappers';
import { wakeWorker } from '../pipeline/worker';
import { readImage, saveReport } from '../reports';

const REPORT_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

const includeForCitizen = {
  image: { select: { reportId: true } },
  issue: {
    include: {
      team: true,
      reports: { select: { userId: true, source: true } },
      // Only status steps reach citizens. Internal linking events are for staff.
      events: { where: { type: { in: ['CREATED', 'STATUS_CHANGED', 'ASSIGNED'] } }, orderBy: { createdAt: 'asc' } },
    },
  },
} satisfies Prisma.ReportInclude;

type CitizenReport = Prisma.ReportGetPayload<{ include: typeof includeForCitizen }>;

function toCitizenReport(report: CitizenReport): CitizenReportDto {
  const { issue } = report;
  return {
    id: report.id,
    code: reportCode(report.seq),
    text: reportText(report),
    category: report.aiCategory ?? report.userCategory,
    address: report.address,
    lat: report.lat,
    lng: report.lng,
    hasImage: report.image !== null,
    createdAt: report.createdAt.toISOString(),
    // A failed report is retried, so the citizen keeps seeing that it is being checked.
    processing: report.aiState !== 'DONE',
    analysis: toAnalysis(report),
    issue: issue && {
      id: issue.id,
      code: issueCode(issue.seq),
      status: issue.status,
      reportCount: issue.reportCount,
      teamName: issue.team?.name ?? null,
      priorityBand: priorityOf(issue).band,
      priorityExplanation: priorityOf(issue).explanation,
      timeline: issue.events.map(toTimelineEntry),
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function citizenRoutes(app: FastifyInstance) {
  app.post('/v1/reports', REPORT_RATE_LIMIT, async (request, reply) => {
    const user = await requireUser(request);
    const input = CreateReportSchema.parse(request.body);
    const source = request.headers['x-client-platform'] === 'web' ? 'WEB' : 'MOBILE';

    let reportId: string;
    try {
      const report = await saveReport({ ...input, source, userId: user.id });
      reportId = report.id;
      wakeWorker((error) => request.log.error(error));
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // The client retried after a dropped connection, so return the report it already created.
      const existing = await db.report.findUniqueOrThrow({
        where: { userId_clientRequestId: { userId: user.id, clientRequestId: input.clientRequestId } },
        select: { id: true },
      });
      reportId = existing.id;
    }

    const report = await db.report.findUniqueOrThrow({ where: { id: reportId }, include: includeForCitizen });
    return reply.code(202).send(toCitizenReport(report));
  });

  app.get('/v1/reports/mine', async (request) => {
    const user = await requireUser(request);
    const reports = await db.report.findMany({
      where: { userId: user.id },
      include: includeForCitizen,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return reports.map(toCitizenReport);
  });

  app.get<{ Params: { id: string } }>('/v1/reports/:id', async (request) => {
    const user = await requireUser(request);
    const report = await db.report.findUnique({ where: { id: request.params.id }, include: includeForCitizen });
    if (!report) throw notFound('Report');
    if (report.userId !== user.id && user.role !== 'ADMIN') throw forbidden();
    return toCitizenReport(report);
  });

  app.get<{ Params: { id: string } }>('/v1/reports/:id/image', async (request) => {
    const user = await requireUser(request);
    const report = await db.report.findUnique({
      where: { id: request.params.id },
      select: { userId: true, image: true },
    });
    if (!report?.image) throw notFound('Image');
    if (report.userId !== user.id && user.role !== 'ADMIN') throw forbidden();
    return { dataUrl: `data:${report.image.mime};base64,${(await readImage(report.image)).toString('base64')}` };
  });

  app.post('/v1/transcribe', REPORT_RATE_LIMIT, async (request) => {
    await requireUser(request);
    // The audio is used for this request only and is never stored.
    return transcribeAudio(TranscribeSchema.parse(request.body));
  });
}
