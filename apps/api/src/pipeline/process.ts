import { OPEN_STATUSES } from '@awaaz/shared';
import { analyzeReport, type Analysis } from '../ai/analyze';
import { embedText } from '../ai/embeddings';
import { nearbySensitiveSites, reverseGeocode } from '../ai/places';
import { features } from '../config';
import { db } from '../db';
import { Prisma } from '../generated/prisma/client';
import { neighbourhood } from '../geo';
import { decideDuplicate, type CandidateIssue } from './dedupe';
import { refreshIssueAggregates } from './issues';

async function loadCandidates(h3Res10: string): Promise<CandidateIssue[]> {
  const issues = await db.issue.findMany({
    where: {
      h3Res10: { in: neighbourhood(h3Res10, 2) },
      status: { in: [...OPEN_STATUSES] },
      mergedIntoId: null,
    },
    select: {
      id: true,
      title: true,
      category: true,
      lat: true,
      lng: true,
      reports: { select: { text: true, englishText: true, embedding: true, embeddingModel: true } },
    },
  });

  return issues.map((issue) => ({
    ...issue,
    reports: issue.reports.map((report) => ({
      text: report.englishText ?? report.text,
      embedding: report.embedding,
      embeddingModel: report.embeddingModel,
    })),
  }));
}

function analysisColumns(analysis: Analysis) {
  return {
    aiSource: analysis.source,
    aiModel: analysis.model,
    aiCategory: analysis.category,
    aiConfidence: analysis.confidence,
    aiSummary: analysis.summary,
    aiReasoning: analysis.reasoning,
    aiImageNote: analysis.imageNote,
    aiError: analysis.error,
    language: analysis.language,
    englishText: analysis.englishText,
    hazard: analysis.hazard,
    exposure: analysis.exposure,
    serviceDisruption: analysis.serviceDisruption,
  };
}

/** Runs outside any transaction, so that slow model calls never hold a database connection. */
export async function processReport(reportId: string): Promise<void> {
  const report = await db.report.findUniqueOrThrow({ where: { id: reportId }, include: { image: true } });

  const analysis = await analyzeReport({
    text: report.text,
    userCategory: report.userCategory,
    image: report.image ? { base64: Buffer.from(report.image.bytes).toString('base64'), mime: report.image.mime } : undefined,
  });
  const embedding = await embedText(analysis.englishText);
  const address = report.address ?? (await reverseGeocode(report));

  const { decision, mergeIntoIssueId } = await decideDuplicate(
    {
      lat: report.lat,
      lng: report.lng,
      text: analysis.englishText,
      category: analysis.category,
      embedding: embedding.vector,
      embeddingModel: embedding.model,
    },
    await loadCandidates(report.h3Res10),
    { llmAvailable: features.llm },
  );

  const sensitiveSites = mergeIntoIssueId ? null : await nearbySensitiveSites(report);

  await db.$transaction(async (tx) => {
    const target = mergeIntoIssueId
      ? await tx.issue.findFirst({ where: { id: mergeIntoIssueId, status: { in: [...OPEN_STATUSES] } } })
      : null;

    const issueId =
      target?.id ??
      (
        await tx.issue.create({
          data: {
            title: analysis.title,
            summary: analysis.summary,
            category: analysis.category,
            lat: report.lat,
            lng: report.lng,
            address,
            h3Res9: report.h3Res9,
            h3Res10: report.h3Res10,
            hazard: analysis.hazard,
            exposure: analysis.exposure,
            serviceDisruption: analysis.serviceDisruption,
            sensitiveSites: sensitiveSites === null ? Prisma.DbNull : (sensitiveSites as unknown as Prisma.InputJsonValue),
            isSynthetic: report.isSynthetic,
            firstReportedAt: report.createdAt,
            createdAt: report.createdAt,
          },
        })
      ).id;

    await tx.report.update({
      where: { id: report.id },
      data: {
        ...analysisColumns(analysis),
        address,
        issueId,
        embedding: embedding.vector,
        embeddingModel: embedding.model,
        dedupe: decision as unknown as Prisma.InputJsonValue,
        aiState: 'DONE',
      },
    });

    await tx.issueEvent.create({
      data: target
        ? {
            issueId,
            type: 'REPORT_LINKED',
            message: 'Another citizen reported the same issue',
            createdAt: report.createdAt,
          }
        : {
            issueId,
            type: 'CREATED',
            toStatus: 'SUBMITTED',
            message: 'Report received and analysed',
            createdAt: report.createdAt,
          },
    });

    if (target) await refreshIssueAggregates(tx, issueId);
  });
}
