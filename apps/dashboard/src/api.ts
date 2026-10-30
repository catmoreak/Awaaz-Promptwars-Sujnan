import type {
  ActionBriefDto,
  AdminLoginForm,
  AuthResponse,
  CompareResponse,
  IssueDetailDto,
  IssueSummaryDto,
  MapResponse,
  StaffReportInput,
  StatsResponse,
  TeamDto,
  TransitionInput,
} from '@awaaz/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'awaaz.officer.token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const session = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, body?: unknown): Promise<T> {
  const token = session.get();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'The Awaaz server cannot be reached. Check your connection and try again.');
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new ApiError(response.status, error?.code ?? 'unknown', error?.message ?? 'The request failed. Try again.');
  }
  return response.json() as Promise<T>;
}

export const api = {
  login: (input: AdminLoginForm) => request<AuthResponse>('/v1/auth/admin/login', input),
  me: () => request<AuthResponse['user']>('/v1/me'),
  map: () => request<MapResponse>('/v1/admin/map'),
  issues: () => request<IssueSummaryDto[]>('/v1/admin/issues'),
  issue: (id: string) => request<IssueDetailDto>(`/v1/admin/issues/${id}`),
  transition: (id: string, input: TransitionInput) => request<IssueDetailDto>(`/v1/admin/issues/${id}/transition`, input),
  merge: (id: string, intoIssueId: string) => request<IssueDetailDto>(`/v1/admin/issues/${id}/merge`, { intoIssueId }),
  detach: (id: string, reportId: string) => request<IssueDetailDto>(`/v1/admin/issues/${id}/detach`, { reportId }),
  compare: (a: string, b: string) => request<CompareResponse>(`/v1/admin/compare?a=${a}&b=${b}`),
  brief: (hotspotId: string) => request<ActionBriefDto>(`/v1/admin/hotspots/${hotspotId}/brief`),
  teams: () => request<TeamDto[]>('/v1/admin/teams'),
  stats: () => request<StatsResponse>('/v1/admin/stats'),
  image: (reportId: string) => request<{ dataUrl: string }>(`/v1/reports/${reportId}/image`),
  addReport: (input: StaffReportInput) => request<{ id: string }>('/v1/admin/reports', input),
};
