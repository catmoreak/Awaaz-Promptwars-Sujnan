import type {
  AppConfigResponse,
  AuthResponse,
  CitizenReportDto,
  CreateReportInput,
  LoginForm,
  RegisterForm,
  TranscribeInput,
  TranscribeResponse,
} from '@awaaz/shared';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let token: string | null = null;

export function setApiToken(next: string | null) {
  token = next;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'X-Client-Platform': Platform.OS === 'web' ? 'web' : 'mobile',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Awaaz cannot reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new ApiError(response.status, error?.code ?? 'unknown', error?.message ?? 'That did not work. Try again.');
  }
  return response.json() as Promise<T>;
}

export const api = {
  config: () => request<AppConfigResponse>('/v1/config'),
  register: (input: RegisterForm) => request<AuthResponse>('/v1/auth/register', input),
  login: (input: LoginForm) => request<AuthResponse>('/v1/auth/login', input),
  me: () => request<AuthResponse['user']>('/v1/me'),
  myReports: () => request<CitizenReportDto[]>('/v1/reports/mine'),
  report: (id: string) => request<CitizenReportDto>(`/v1/reports/${id}`),
  createReport: (input: CreateReportInput) => request<CitizenReportDto>('/v1/reports', input),
  transcribe: (input: TranscribeInput) => request<TranscribeResponse>('/v1/transcribe', input),
  image: (id: string) => request<{ dataUrl: string }>(`/v1/reports/${id}/image`),
};
