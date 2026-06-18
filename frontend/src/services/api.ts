import axios from 'axios';
import { API_URL } from '@/config/api';
import type {
  AuthResponse,
  DashboardStats,
  FieldDefinition,
  PaginatedResponse,
  Participant,
  RegisterFormData,
  ParticipantCompleteness,
  CredentialLookupResult,
  Stake,
  Ward,
  User,
  AdminUser,
  TodayAttendanceResponse,
} from '@/types';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lrjas_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
};

export const catalogApi = {
  getStakes: () => api.get<Stake[]>('/catalog/stakes').then((r) => r.data),
  getAllStakes: () => api.get<Stake[]>('/catalog/stakes?all=true').then((r) => r.data),
  createStake: (name: string) =>
    api.post<Stake>('/catalog/stakes', { name }).then((r) => r.data),
  updateStake: (id: string, data: Partial<{ name: string; active: boolean }>) =>
    api.put<Stake>(`/catalog/stakes/${id}`, data).then((r) => r.data),
  createWard: (stakeId: string, name: string) =>
    api.post<Ward>(`/catalog/stakes/${stakeId}/wards`, { name }).then((r) => r.data),
  updateWard: (id: string, data: Partial<{ name: string; active: boolean }>) =>
    api.put<Ward>(`/catalog/wards/${id}`, data).then((r) => r.data),
};

export const fieldsApi = {
  getActive: () => api.get<FieldDefinition[]>('/fields').then((r) => r.data),
  getAll: () => api.get<FieldDefinition[]>('/fields?all=true').then((r) => r.data),
  create: (data: Partial<FieldDefinition>) => api.post<FieldDefinition>('/fields', data).then((r) => r.data),
  update: (id: string, data: Partial<FieldDefinition>) =>
    api.put<FieldDefinition>(`/fields/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/fields/${id}`).then((r) => r.data),
};

export const participantsApi = {
  register: (data: RegisterFormData) =>
    api.post<Participant>('/participants', data).then((r) => r.data),
  getAll: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Participant>>('/participants', { params }).then((r) => r.data),
  getByCode: (code: string) =>
    api.get<Participant>(`/participants/code/${code}`).then((r) => r.data),
  lookupCredential: (q: string) =>
    api.get<CredentialLookupResult>('/participants/lookup/credential', { params: { q } }).then((r) => r.data),
  getCompleteness: (code: string) =>
    api.get<ParticipantCompleteness>(`/participants/code/${code}/completeness`).then((r) => r.data),
  getById: (id: string) => api.get<Participant>(`/participants/${id}`).then((r) => r.data),
  update: (id: string, data: Partial<RegisterFormData & { active: boolean }>) =>
    api.put<Participant>(`/participants/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/participants/${id}`).then((r) => r.data),
};

export const attendanceApi = {
  register: (code: string, method: 'QR' | 'MANUAL') =>
    api.post<{
      alreadyRegistered: boolean;
      participant: { id: string; code: string; fullName: string };
      attendance: { id: string; createdAt: string };
    }>('/attendance', { code, method }).then((r) => r.data),
  getHistory: (participantId: string) =>
    api.get<{ id: string; method: string; createdAt: string }[]>(`/attendance/history/${participantId}`).then((r) => r.data),
  getToday: () =>
    api.get<TodayAttendanceResponse>('/attendance/today').then((r) => r.data),
  getRange: (period: 'day' | 'week' | 'month', date?: string) =>
    api.get<TodayAttendanceResponse>('/attendance/range', { params: { period, date } }).then((r) => r.data),
};

export const usersApi = {
  getAll: () => api.get<AdminUser[]>('/users').then((r) => r.data),
  create: (data: { username: string; password: string; name: string }) =>
    api.post<AdminUser>('/users', data).then((r) => r.data),
  update: (id: string, data: Partial<{ username: string; password: string; name: string }>) =>
    api.put<AdminUser>(`/users/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
};

export const dashboardApi = {
  getStats: (params?: { from?: string; to?: string }) =>
    api.get<DashboardStats>('/dashboard/stats', { params }).then((r) => r.data),
};

export const devApi = {
  executeSql: (query: string) =>
    api
      .post<{ rows: Record<string, unknown>[]; rowCount: number; durationMs: number }>(
        '/dev/sql',
        { query },
      )
      .then((r) => r.data),
};

export function getDuplicateRegistrationError(
  error: unknown,
): { code: string; fullName: string } | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;

  const data = error.response.data as {
    message?: string | { message?: string; existingCode?: string; fullName?: string };
    existingCode?: string;
    fullName?: string;
  };

  const payload = typeof data.message === 'object' && data.message !== null ? data.message : data;
  const code = payload.existingCode;
  if (!code) return null;

  return {
    code,
    fullName: payload.fullName ?? 'Usuario registrado',
  };
}

export default api;
