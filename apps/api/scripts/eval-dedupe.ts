import type { Category } from '@awaaz/shared';
import { SEED_OUTCOMES, SEED_REPORTS, toCoordinates } from '../prisma/seed-data';
import { analyzeReport } from '../src/ai/analyze';
import { embedText } from '../src/ai/embeddings';
import { features } from '../src/config';
import { decideDuplicate, type CandidateIssue } from '../src/pipeline/dedupe';

/**
 * Runs the real analysis and duplicate pipeline over the labelled synthetic reports, in memory.
 * It reads and writes nothing in the database, so the score cannot be changed by what is stored there.
 * Reports arrive oldest first, and a problem leaves the open list when the data says it was resolved,
 * because the live pipeline only compares a new report with open issues.
 * A pair of reports is correct when the system and the labels agree on whether it is one problem.
 */
interface Result {
  text: string;
  group: string;
  issueId: string;
}

const oldestFirst = [...SEED_REPORTS].sort((a, b) => b.hoursAgo - a.hoursAgo);
const issues: (CandidateIssue & { group: string })[] = [];
const resolvedHoursAgo = new Map(SEED_OUTCOMES.flatMap((outcome) => (outcome.resolvedHoursAgo ? [[outcome.group, outcome.resolvedHoursAgo] as const] : [])));
const results: Result[] = [];
const sources = new Set<string>();
const embeddingModels = new Set<string>();
const wrongCategories: string[] = [];
const merges = new Map<string, string>();

for (const report of oldestFirst) {
  const point = toCoordinates(report);
  const analysis = await analyzeReport({ text: report.text, userCategory: 'OTHER' });
  const embedding = await embedText(analysis.englishText);
  sources.add(analysis.source);
  embeddingModels.add(embedding.model);
  if (analysis.category !== report.category) wrongCategories.push(`${report.text.slice(0, 50)}: ${analysis.category}, expected ${report.category}`);

  const { mergeIntoIssueId, decision } = await decideDuplicate(
    { ...point, text: analysis.englishText, category: analysis.category, embedding: embedding.vector, embeddingModel: embedding.model },
    issues.filter((issue) => (resolvedHoursAgo.get(issue.group) ?? 0) <= report.hoursAgo),
    { llmAvailable: features.llm },
  );

  if (mergeIntoIssueId) merges.set(report.text, `${decision.method} sim=${decision.similarity} d=${decision.distanceM}m: ${decision.reason}`);
  const candidate = { text: analysis.englishText, embedding: embedding.vector, embeddingModel: embedding.model };
  let issue = issues.find((existing) => existing.id === mergeIntoIssueId);
  if (!issue) {
    issue = { id: `issue-${issues.length}`, group: report.group, title: analysis.title, category: analysis.category as Category, ...point, reports: [] };
    issues.push(issue);
  }
  issue.reports.push(candidate);
  results.push({ text: report.text, group: report.group, issueId: issue.id });
}

let truePositive = 0;
let falsePositive = 0;
let falseNegative = 0;
const wrongMerges: string[] = [];
const missedMerges: string[] = [];

for (const [index, a] of results.entries()) {
  for (const b of results.slice(index + 1)) {
    const sameGroup = a.group === b.group;
    const sameIssue = a.issueId === b.issueId;
    const pair = `${a.text.slice(0, 50)} <> ${b.text.slice(0, 50)} [${merges.get(b.text) ?? merges.get(a.text) ?? 'not merged'}]`;
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

console.log({
  reports: results.length,
  labelledProblems: new Set(results.map((result) => result.group)).size,
  issuesCreated: issues.length,
  categoriesTested: new Set(SEED_REPORTS.map((report) => report.category)).size,
  categoryAccuracy: Number((1 - wrongCategories.length / results.length).toFixed(3)),
  embeddingModels: [...embeddingModels],
  analysisSources: [...sources],
  truePositive,
  falsePositive,
  falseNegative,
  precision: Number((truePositive / (truePositive + falsePositive || 1)).toFixed(3)),
  recall: Number((truePositive / (truePositive + falseNegative || 1)).toFixed(3)),
});
if (wrongCategories.length) console.log('Wrong categories:\n ', wrongCategories.join('\n  '));
if (wrongMerges.length) console.log('Wrong merges:\n ', wrongMerges.join('\n  '));
if (missedMerges.length) console.log('Missed merges:\n ', missedMerges.join('\n  '));
process.exit(0);
