// Axios client for HARDA backend.
// Reads base URL from Expo Constants (set in app.json `extra.apiBaseUrl*`),
// with a Platform-aware default so emulators and simulators 'just work'.
// Auth header is injected on every request from the AuthContext.

import axios, { AxiosError, AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import * as auth from './auth';
import type { ApiResponse, AuthTokens, HazardReport, Team, User, Detection } from './types';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

const resolveBaseUrl = () => {
  if (Platform.OS === 'android') return extra.apiBaseUrl ?? 'http://10.0.2.2:5000/api/v1';
  return extra.apiBaseUrlIos ?? 'http://localhost:5000/api/v1';
};

const instance: AxiosInstance = axios.create({
  timeout: 15_000,
});

instance.interceptors.request.use(async (config) => {
  config.baseURL = resolveBaseUrl();
  const token = await auth.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const unwrap = <T>(envelope: ApiResponse<T> | T): T => {
  // Backend wraps every payload as { success, data, message, errors }.
  if (envelope && typeof envelope === 'object' && 'success' in (envelope as object)) {
    const env = envelope as ApiResponse<T>;
    if (!env.success) {
      const msg = env.message || (env.errors && env.errors[0]) || 'Request failed';
      throw new Error(msg);
    }
    return env.data;
  }
  return envelope as T;
};

const handleError = (err: unknown): never => {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<ApiResponse<unknown>>;
    const apiMsg = e.response?.data?.message
      || e.response?.data?.errors?.[0]
      || e.message;
    throw new Error(apiMsg);
  }
  throw err;
};

// ── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User } & AuthTokens> {
    try {
      const res = await instance.post('/auth/login', { email, password });
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  async register(payload: {
    username: string; email: string; password: string;
    first_name?: string; last_name?: string; phone_number?: string;
  }): Promise<User> {
    try {
      const res = await instance.post('/auth/register', payload);
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  // Reports — user mode
  async submitReport(form: FormData): Promise<HazardReport & { detection: Detection }> {
    try {
      const res = await instance.post('/reports', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Image upload + YOLO inference can take a few seconds — extend timeout.
        timeout: 30_000,
      });
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  async myReports(userId: number): Promise<HazardReport[]> {
    try {
      const res = await instance.get(`/reports/user/${userId}`);
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  async mapReports(): Promise<Array<{
    report_id: number; latitude: number; longitude: number;
    hazard_type: string | null; severity_score: number | null;
  }>> {
    try {
      const res = await instance.get('/reports/map');
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  async getReport(reportId: number): Promise<HazardReport> {
    try {
      const res = await instance.get(`/reports/${reportId}`);
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  // Crew mode
  async myAssignments(includeResolved = false): Promise<{
    team_id: number; assignments: HazardReport[];
  }> {
    try {
      const res = await instance.get('/crew/assignments', {
        params: { include_resolved: includeResolved },
      });
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  async crewMe(): Promise<User> {
    try {
      const res = await instance.get('/crew/me');
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  async uploadAfterPhoto(reportId: number, form: FormData): Promise<{
    report: HazardReport;
  }> {
    try {
      const res = await instance.post(`/reports/${reportId}/after-photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30_000,
      });
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  // Misc
  async teams(): Promise<Team[]> {
    try {
      const res = await instance.get('/admin/teams');
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },

  async modelInfo(): Promise<{ model_path: string; classes: Record<string, string>; n_classes: number }> {
    try {
      const res = await instance.get('/detection/model-info');
      return unwrap(res.data);
    } catch (err) { return handleError(err); }
  },
};
