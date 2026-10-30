import { db } from '../src/db';
import { SEED_REPORTS } from '../prisma/seed-data';

/**
 * Scores duplicate detection on the labelled synthetic reports, counting pairs of reports.
 * A pair is correct when the system and the labels agree on whether it is one problem.
 */
async function main() {
  const groupOf = new Map(SEED_REPORTS.map((report) => [report.text, report.group]));
  const reports = await db.report.findMany({
    where: { isSynthetic: true, issueId: { not: null } },
    select: { text: true, issueId: true, embeddingModel: true, aiSource: true },
  });

  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  const wrongMerges: string[] = [];
  const missedMerges: string[] = [];

  for (let i = 0; i < reports.length; i++) {
    for (let j = i + 1; j < reports.length; j++) {
      const a = reports[i];
      const b = reports[j];
      if (!a || !b) continue;
      const sameGroup = groupOf.get(a.text) === groupOf.get(b.text);
      const sameIssue = a.issueId === b.issueId;
      const pair = `${a.text.slice(0, 50)} <> ${b.text.slice(0, 50)}`;

      if (sameGroup && sameIssue) truePositive++;
      else if (!sameGroup && sameIssue) {
        falsePositive++;
        wrongMerges.push(pair);
      } else if (sameGroup && !sameIssue) {
        falseNegative++;
        missedMerges.push(pair);
      }
    }
  }

  const precision = truePositive / (truePositive + falsePositive || 1);
  const recall = truePositive / (truePositive + falseNegative || 1);

  console.log({
    reports: reports.length,
    embeddingModels: [...new Set(reports.map((report) => report.embeddingModel))],
    analysisSources: [...new Set(reports.map((report) => report.aiSource))],
    truePositive,
    falsePositive,
    falseNegative,
    precision: Number(precision.toFixed(3)),
    recall: Number(recall.toFixed(3)),
  });
  if (wrongMerges.length) console.log('Wrong merges:\n ', wrongMerges.join('\n  '));
  if (missedMerges.length) console.log('Missed merges:\n ', missedMerges.join('\n  '));
}

try {
  await main();
} finally {
  await db.$disconnect();
}
