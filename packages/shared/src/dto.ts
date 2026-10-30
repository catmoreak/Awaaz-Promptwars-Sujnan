import type { Category, IssueStatus } from './domain';
import type { PriorityComparison, PriorityResult, SensitiveSite } from './priority';

export type Role = 'CITIZEN' | 'ADMIN';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export interface TranscribeResponse {
  transcript: string;
  language: string;
  english: string;
  model: string;
}

export interface DedupeDecision {
  decision: 'NEW_ISSUE' | 'MERGED';
  method: 'NO_CANDIDATES' | 'BELOW_THRESHOLD' | 'HIGH_SIMILARITY' | 'LLM_CONFIRMED' | 'LLM_REJECTED' | 'NO_LLM_REVIEW';
  similarity: number | null;
  distanceM: number | null;
  comparedIssueId: string | null;
  candidatesChecked: number;
  reason: string;
}

export interface ReportAnalysis {
  source: 'LLM' | 'RULES';
  model: string;
  category: Category;
  confidence: number;
  summary: string;
  language: string;
  englishText: string;
  reasoning: string;
  categoryChanged: boolean;
  imageNote: string | null;
  dedupe: DedupeDecision | null;
  error: string | null;
}

export interface TimelineEntry {
  id: string;
  type: 'CREATED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'REPORT_LINKED' | 'REPORT_DETACHED' | 'MERGED';
  message: string;
  fromStatus: IssueStatus | null;
  toStatus: IssueStatus | null;
  note: string | null;
  at: string;
}

export interface CitizenReportDto {
  id: string;
  code: string;
  text: string;
  category: Category;
  address: string | null;
  lat: number;
  lng: number;
  hasImage: boolean;
  createdAt: string;
  processing: boolean;
  analysis: ReportAnalysis | null;
  issue: {
    id: string;
    code: string;
    status: IssueStatus;
    reportCount: number;
    teamName: string | null;
    priorityBand: PriorityResult['band'];
    priorityExplanation: string;
    timeline: TimelineEntry[];
  } | null;
}

export interface IssueSummaryDto {
  id: string;
  code: string;
  title: string;
  category: Category;
  status: IssueStatus;
  lat: number;
  lng: number;
  address: string | null;
  reportCount: number;
  teamId: string | null;
  teamName: string | null;
  priority: PriorityResult;
  isSynthetic: boolean;
  firstReportedAt: string;
  updatedAt: string;
}

export interface AdminReportDto {
  id: string;
  code: string;
  text: string;
  source: 'MOBILE' | 'WEB' | 'STAFF' | 'SEED';
  channel: string | null;
  viaVoice: boolean;
  reporterName: string | null;
  address: string | null;
  lat: number;
  lng: number;
  hasImage: boolean;
  userCategory: Category;
  isSynthetic: boolean;
  createdAt: string;
  analysis: ReportAnalysis | null;
}

export interface IssueDetailDto extends IssueSummaryDto {
  summary: string;
  sensitiveSites: SensitiveSite[] | null;
  reports: AdminReportDto[];
  timeline: TimelineEntry[];
  allowedTransitions: IssueStatus[];
}

export interface TeamDto {
  id: string;
  name: string;
  categories: Category[];
  openIssues: number;
}

export interface MapCellDto {
  h3: string;
  boundary: { lat: number; lng: number }[];
  issueCount: number;
  reportCount: number;
  topScore: number;
  topBand: PriorityResult['band'];
}

export interface HotspotDto {
  id: string;
  label: string;
  cells: string[];
  boundary: { lat: number; lng: number }[][];
  center: { lat: number; lng: number };
  issueIds: string[];
  issueCount: number;
  reportCount: number;
  categories: { category: Category; count: number }[];
  linkedCauseChain: Category[] | null;
  recurringResolvedCount: number;
  score: number;
  topBand: PriorityResult['band'];
}

export interface ActionBriefDto {
  hotspotId: string;
  source: 'LLM' | 'RULES';
  model: string;
  headline: string;
  situation: string;
  suspectedCause: string;
  recommendedActions: string[];
  suggestedTeams: string[];
  evidence: string[];
  generatedAt: string;
}

export interface MapResponse {
  cells: MapCellDto[];
  hotspots: HotspotDto[];
  issues: IssueSummaryDto[];
}

export interface StatsResponse {
  openIssues: number;
  criticalOpen: number;
  unassignedOpen: number;
  duplicatesMerged: number;
  reportsTotal: number;
  medianHoursToResolve: number | null;
  aiPending: number;
  rulesFallbackReports: number;
  byCategory: { category: Category; open: number; total: number }[];
  weeklyReports: { weekStart: string; total: number }[];
}

export interface CompareResponse {
  a: IssueSummaryDto;
  b: IssueSummaryDto;
  comparison: PriorityComparison;
}

export interface AppConfigResponse {
  demoLoginEnabled: boolean;
  googleLoginEnabled: boolean;
  aiEnabled: boolean;
  voiceEnabled: boolean;
  placesEnabled: boolean;
}
