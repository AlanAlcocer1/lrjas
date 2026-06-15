export type Sex = 'MALE' | 'FEMALE';

export interface Stake {
  id: string;
  name: string;
  active?: boolean;
  wards: Ward[];
}

export interface Ward {
  id: string;
  name: string;
  stakeId?: string;
  active?: boolean;
}

export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'CHECKBOX' | 'TEXT' | 'SELECT';
  required: boolean;
  active: boolean;
  createdAt: string;
}

export interface Participant {
  id: string;
  code: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  motherLastName: string;
  fullName: string;
  age: number;
  birthDate: string;
  sex: Sex;
  active: boolean;
  stake: { id: string; name: string };
  ward: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  dynamicFields?: Record<string, boolean>;
  attendances?: Attendance[];
}

export interface Attendance {
  id: string;
  method: 'QR' | 'MANUAL';
  createdAt: string;
}

export interface TodayAttendanceItem {
  id: string;
  method: 'QR' | 'MANUAL';
  createdAt: string;
  dateMexico?: string;
  timeMexico: string;
  participant: {
    code: string;
    fullName: string;
    stake: string;
    ward: string;
    dynamicFields?: Record<string, boolean>;
  };
}

export interface TodayAttendanceResponse {
  period?: 'day' | 'week' | 'month';
  date: string;
  dateKey?: string;
  total: number;
  items: TodayAttendanceItem[];
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FieldDistribution {
  fieldName: string;
  label: string;
  data: { label: string; count: number }[];
}

export interface DashboardStats {
  period: { from: string; to: string } | null;
  kpis: {
    totalParticipants: number;
    totalAttendances: number;
    newThisMonth: number;
    activeParticipants: number;
  };
  charts: {
    monthlyAttendances: { month: string; count: number }[];
    monthlyRegistrations: { month: string; count: number }[];
    sexDistribution: { sex: string; count: number }[];
    stakeDistribution: { stake: string; count: number }[];
    fieldDistributions: FieldDistribution[];
  };
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RegisterFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  motherLastName: string;
  birthDate: string;
  sex: Sex;
  stakeId: string;
  wardId: string;
  dynamicFields?: Record<string, boolean>;
}

export interface MissingFieldInfo {
  key: string;
  label: string;
  type: 'CHECKBOX' | 'TEXT' | 'SELECT' | 'STAKE' | 'WARD' | string;
}

export interface ParticipantCompleteness {
  participantId: string;
  code: string;
  fullName: string;
  complete: boolean;
  missing: MissingFieldInfo[];
  profile: {
    stakeId: string;
    wardId: string;
    stake: { id: string; name: string };
    ward: { id: string; name: string };
    isMember: boolean;
    dynamicFields: Record<string, boolean>;
  };
}
