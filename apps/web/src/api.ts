import type {
  AppConfigResponse,
  AuthResponse,
  CitizenReportDto,
  CompareResponse,
  CreateReportInput,
  IssueDetailDto,
  IntakeReportDto,
  IssueSummaryDto,
  MapResponse,
  RegisterForm,
  StaffReportInput,
  StatsResponse,
  TeamDto,
  TranscribeInput,
  TranscribeResponse,
  TransitionInput,
} from '@awaaz/shared';

const TOKEN_KEY = 'awaaz.session';

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

/** The API serves this site, so every path is on the same address. */
async function request<T>(path: string, body?: unknown): Promise<T> {
  const token = session.get();
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'X-Client-Platform': 'web',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Awaaz cannot be reached. Check your connection and try again.');
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new ApiError(response.status, error?.code ?? 'unknown', error?.message ?? 'That did not work. Try again.');
  }
  return response.json() as Promise<T>;
}

export const api = {
  config: () => request<AppConfigResponse>('/v1/config'),
  me: () => request<AuthResponse['user']>('/v1/me'),
  /** One sign-in box: an email address means an officer, and anything else is a citizen's mobile number. */
  login: (identifier: string, password: string) =>
    identifier.includes('@')
      ? request<AuthResponse>('/v1/auth/admin/login', { email: identifier, password })
      : request<AuthResponse>('/v1/auth/login', { phone: identifier, password }),
  register: (input: RegisterForm) => request<AuthResponse>('/v1/auth/register', input),

  myReports: () => request<CitizenReportDto[]>('/v1/reports/mine'),
  report: (id: string) => request<CitizenReportDto>(`/v1/reports/${id}`),
  createReport: (input: CreateReportInput) => request<CitizenReportDto>('/v1/reports', input),
  transcribe: (input: TranscribeInput) => request<TranscribeResponse>('/v1/transcribe', input),
  image: (id: string) => request<{ dataUrl: string }>(`/v1/reports/${id}/image`),

  map: (includeDemo: boolean) => request<MapResponse>(`/v1/admin/map${includeDemo ? '?demo=1' : ''}`),
  issues: () => request<IssueSummaryDto[]>('/v1/admin/issues'),
  intake: () => request<IntakeReportDto[]>('/v1/admin/intake'),
  retryReport: (id: string) => request<{ id: string }>(`/v1/admin/reports/${id}/retry`, {}),
  issue: (id: string) => request<IssueDetailDto>(`/v1/admin/issues/${id}`),
  transition: (id: string, input: TransitionInput) => request<IssueDetailDto>(`/v1/admin/issues/${id}/transition`, input),
  merge: (id: string, intoIssueId: string) => request<IssueDetailDto>(`/v1/admin/issues/${id}/merge`, { intoIssueId }),
  detach: (id: string, reportId: string) => request<IssueDetailDto>(`/v1/admin/issues/${id}/detach`, { reportId }),
  compare: (a: string, b: string) => request<CompareResponse>(`/v1/admin/compare?a=${a}&b=${b}`),
  teams: () => request<TeamDto[]>('/v1/admin/teams'),
  stats: () => request<StatsResponse>('/v1/admin/stats'),
  addReport: (input: StaffReportInput) => request<{ id: string }>('/v1/admin/reports', input),
};
