import axios from 'axios';
import { API_URL, TOKEN_KEY } from '@/config/api';
import type {
  AccessRole,
  ActividadesUser,
  ActividadesUserRow,
  Activity,
  ActivityHistoryEntry,
  ActivityQuery,
  ActivityStatus,
  ActivityTask,
  ApprovalStatus,
  AuthResponse,
  CreateActivityPayload,
  DashboardData,
  Permission,
  PublicActivity,
  Team,
} from '@/types';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (code: string) =>
    api.post<AuthResponse>('/actividades/auth/login', { code }).then((r) => r.data),
  me: () => api.get<ActividadesUser>('/actividades/auth/me').then((r) => r.data),
};

export const activitiesApi = {
  dashboard: () => api.get<DashboardData>('/actividades/dashboard').then((r) => r.data),
  list: (params?: ActivityQuery) =>
    api.get<Activity[]>('/actividades/activities', { params }).then((r) => r.data),
  get: (id: string) => api.get<Activity>(`/actividades/activities/${id}`).then((r) => r.data),
  create: (data: CreateActivityPayload) =>
    api.post<Activity>('/actividades/activities', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateActivityPayload>) =>
    api.patch<Activity>(`/actividades/activities/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/actividades/activities/${id}`).then((r) => r.data),
  history: (id: string) =>
    api.get<ActivityHistoryEntry[]>(`/actividades/activities/${id}/history`).then((r) => r.data),
  approve: (id: string, comments?: string) =>
    api.post<Activity>(`/actividades/activities/${id}/approve`, { comments }).then((r) => r.data),
  reject: (id: string, rejectionReason: string, comments?: string) =>
    api
      .post<Activity>(`/actividades/activities/${id}/reject`, { rejectionReason, comments })
      .then((r) => r.data),
  requestChanges: (id: string, comments?: string) =>
    api
      .post<Activity>(`/actividades/activities/${id}/request-changes`, { comments })
      .then((r) => r.data),
  createTask: (
    activityId: string,
    data: {
      name: string;
      description?: string;
      assigneeId?: string;
      dueDate?: string;
      priority?: string;
      status?: string;
    },
  ) => api.post<ActivityTask>(`/actividades/activities/${activityId}/tasks`, data).then((r) => r.data),
  updateTask: (id: string, data: Partial<ActivityTask> & { completed?: boolean }) =>
    api.patch<ActivityTask>(`/actividades/tasks/${id}`, data).then((r) => r.data),
  deleteTask: (id: string) => api.delete(`/actividades/tasks/${id}`).then((r) => r.data),
  myTasks: () => api.get<ActivityTask[]>('/actividades/my-tasks').then((r) => r.data),
  listTasks: (params?: { from?: string; to?: string }) =>
    api.get<ActivityTask[]>('/actividades/tasks', { params }).then((r) => r.data),
  listStatuses: () => api.get<ActivityStatus[]>('/actividades/statuses').then((r) => r.data),
  createStatus: (data: Partial<ActivityStatus> & { name: string }) =>
    api.post<ActivityStatus>('/actividades/statuses', data).then((r) => r.data),
  updateStatus: (id: string, data: Partial<ActivityStatus>) =>
    api.patch<ActivityStatus>(`/actividades/statuses/${id}`, data).then((r) => r.data),
  deleteStatus: (id: string) => api.delete(`/actividades/statuses/${id}`).then((r) => r.data),
  pendingApprovals: () =>
    api
      .get<Activity[]>('/actividades/activities', { params: { approvalStatus: 'PENDING' as ApprovalStatus } })
      .then((r) => r.data),
  listPublic: (params?: { from?: string; to?: string }) =>
    api
      .get<PublicActivity[]>('/actividades/public/activities', { params })
      .then((r) => r.data),
  getPublic: (id: string) =>
    api.get<PublicActivity>(`/actividades/public/activities/${id}`).then((r) => r.data),
  eventIcsUrl: (id: string) => `${API_URL}/actividades/public/activities/${id}/event.ics`,
};

export const teamsApi = {
  list: () => api.get<Team[]>('/actividades/teams').then((r) => r.data),
  get: (id: string) => api.get<Team>(`/actividades/teams/${id}`).then((r) => r.data),
  create: (data: { name: string; description?: string; color?: string; active?: boolean }) =>
    api.post<Team>('/actividades/teams', data).then((r) => r.data),
  update: (
    id: string,
    data: Partial<{ name: string; description: string; color: string; active: boolean }>,
  ) => api.patch<Team>(`/actividades/teams/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/actividades/teams/${id}`).then((r) => r.data),
  setMembers: (id: string, participantIds: string[]) =>
    api.put<Team>(`/actividades/teams/${id}/members`, { participantIds }).then((r) => r.data),
  addMembers: (id: string, participantIds: string[]) =>
    api.post<Team>(`/actividades/teams/${id}/members`, { participantIds }).then((r) => r.data),
  removeMember: (id: string, participantId: string) =>
    api.delete(`/actividades/teams/${id}/members/${participantId}`).then((r) => r.data),
};

export const usersApi = {
  search: (q?: string) =>
    api.get<ActividadesUserRow[]>('/actividades/users', { params: { q } }).then((r) => r.data),
  get: (id: string) => api.get<ActividadesUserRow>(`/actividades/users/${id}`).then((r) => r.data),
  findByCode: (code: string) =>
    api.get<ActividadesUserRow>(`/actividades/users/code/${code}`).then((r) => r.data),
  assignRoles: (id: string, roleIds: string[]) =>
    api.put<ActividadesUserRow>(`/actividades/users/${id}/roles`, { roleIds }).then((r) => r.data),
};

export const rolesApi = {
  list: () => api.get<AccessRole[]>('/actividades/roles').then((r) => r.data),
  get: (id: string) => api.get<AccessRole>(`/actividades/roles/${id}`).then((r) => r.data),
  create: (data: {
    name: string;
    description?: string;
    active?: boolean;
    permissionIds?: string[];
  }) => api.post<AccessRole>('/actividades/roles', data).then((r) => r.data),
  update: (
    id: string,
    data: Partial<{ name: string; description: string; active: boolean; permissionIds: string[] }>,
  ) => api.patch<AccessRole>(`/actividades/roles/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/actividades/roles/${id}`).then((r) => r.data),
  listPermissions: () => api.get<Permission[]>('/actividades/permissions').then((r) => r.data),
};

export default api;
