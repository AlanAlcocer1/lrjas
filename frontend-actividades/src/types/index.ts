export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ResponsibleType = 'PRIMARY' | 'SECONDARY';
export type RecurrenceType = 'NONE' | 'INTERVAL' | 'WEEKLY';

export interface ActividadesUser {
  id: string;
  code: string;
  name: string;
  roles: { id: string; name: string }[];
  permissions: string[];
  /** Equipos del usuario (restricción create/edit). */
  teamIds?: string[];
}

export interface AuthResponse {
  accessToken: string;
  user: ActividadesUser;
}

export interface ParticipantBrief {
  id: string;
  code: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  motherLastName?: string;
  name?: string;
}

export interface ActivityStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  isInitial: boolean;
  isFinal: boolean;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  color?: string;
  active?: boolean;
  members?: { participantId: string; participant?: ParticipantBrief }[];
  _count?: { members?: number; activities?: number };
}

export interface BudgetItem {
  id?: string;
  concept: string;
  quantity: number;
  unitPrice: number;
  total?: number;
  notes?: string | null;
  position?: number;
}

export interface ActivityBudget {
  id: string;
  requestedAmount: number | string;
  approvedAmount?: number | string | null;
  spentAmount: number | string;
  notes?: string | null;
  items: BudgetItem[];
}

export interface ActivityTask {
  id: string;
  activityId?: string;
  name: string;
  description?: string | null;
  assigneeId?: string | null;
  assignee?: ParticipantBrief | null;
  dueDate?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  completed: boolean;
  position: number;
  activity?: {
    id: string;
    name: string;
    date?: string;
    approvalStatus?: ApprovalStatus;
    status?: { id: string; name: string; color?: string } | null;
    team?: { id: string; name: string; color?: string } | null;
  };
}

export interface ActivityResponsible {
  id: string;
  type: ResponsibleType;
  participantId: string;
  participant: ParticipantBrief;
}

export interface ApprovalRequest {
  id: string;
  status: ApprovalStatus;
  comments?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  requestedBy?: ParticipantBrief;
  reviewedBy?: ParticipantBrief | null;
}

export interface Activity {
  id: string;
  name: string;
  slug?: string | null;
  publicDescription: string;
  internalDescription?: string | null;
  date: string;
  endDate?: string | null;
  startTime: string;
  endTime?: string | null;
  location: string;
  locationUrl?: string | null;
  coverImageUrl?: string | null;
  teamId?: string | null;
  team?: { id: string; name: string; color?: string } | null;
  statusId: string;
  status: ActivityStatus;
  approvalStatus: ApprovalStatus;
  requiresBudget: boolean;
  internalNotes?: string | null;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number | null;
  recurrenceWeekdays?: number[];
  recurrenceUntil?: string | null;
  createdById: string;
  createdBy?: ParticipantBrief;
  approvedBy?: ParticipantBrief | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  responsibles: ActivityResponsible[];
  tasks: ActivityTask[];
  budget?: ActivityBudget | null;
  approvalRequests?: ApprovalRequest[];
  progress?: { total: number; completed: number; percent: number };
}

export interface PublicActivity {
  id: string;
  name: string;
  slug?: string | null;
  publicDescription: string;
  date: string;
  endDate?: string | null;
  startTime: string;
  endTime?: string | null;
  location: string;
  locationUrl?: string | null;
  coverImageUrl?: string | null;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number | null;
  recurrenceWeekdays?: number[];
  recurrenceUntil?: string | null;
  team?: { id: string; name: string; color?: string } | null;
}

export interface ActivityHistoryEntry {
  id: string;
  action: string;
  createdAt: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  participant?: ParticipantBrief | null;
}

export interface DashboardData {
  upcoming: Activity[];
  counts: {
    pendingApproval: number;
    approved: number;
    rejected: number;
    overdueTasks: number;
  };
  myTasks: ActivityTask[];
  board?: {
    statuses: { id: string; name: string; color: string; position: number }[];
    activities: Activity[];
    tasks: ActivityTask[];
  };
  byTeam: { teamId: string | null; teamName: string; count: number }[];
  budgets: { requested: number; approved: number; spent: number };
}

export interface AccessRole {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  /** Backend puede devolver Permission[] o { permission: Permission }[] */
  permissions?: Permission[] | { permission: Permission }[];
  permissionIds?: string[];
  userCount?: number;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  groupKey: string;
}

export interface ActividadesUserRow {
  id: string;
  code: string;
  name: string;
  active: boolean;
  roles: { id: string; name: string; active?: boolean }[];
  teams: { id: string; name: string }[];
}

export interface CreateActivityPayload {
  name: string;
  publicDescription: string;
  internalDescription?: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  location: string;
  locationUrl?: string;
  coverImageUrl?: string;
  teamId?: string;
  statusId?: string;
  primaryResponsibleId: string;
  secondaryResponsibleIds?: string[];
  requiresBudget?: boolean;
  budget?: {
    requestedAmount?: number;
    notes?: string;
    items?: { concept: string; quantity: number; unitPrice: number; notes?: string }[];
  };
  tasks?: {
    name: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    priority?: TaskPriority;
  }[];
  internalNotes?: string;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
  recurrenceUntil?: string;
}

export interface ActivityQuery {
  teamId?: string;
  statusId?: string;
  approvalStatus?: ApprovalStatus;
  responsibleId?: string;
  from?: string;
  to?: string;
  requiresBudget?: boolean;
}
