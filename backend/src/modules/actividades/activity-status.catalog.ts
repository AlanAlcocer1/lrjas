/** Estados operativos fijos del flujo de actividades. */
export const ACTIVITY_STATUS = {
  AWAITING_APPROVAL: 'En espera de aprobación',
  CHANGES_REQUESTED: 'Cambios solicitados',
  REJECTED: 'Rechazada',
  PLANNING: 'Planificación',
  IN_PROGRESS: 'En curso',
  INCOMPLETE: 'Incompleta',
  POSTPONED: 'Pospuesta',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
} as const;

export type ActivityStatusName =
  (typeof ACTIVITY_STATUS)[keyof typeof ACTIVITY_STATUS];

export const FIXED_ACTIVITY_STATUSES: {
  name: ActivityStatusName;
  color: string;
  position: number;
  isInitial: boolean;
  isFinal: boolean;
}[] = [
  {
    name: ACTIVITY_STATUS.AWAITING_APPROVAL,
    color: '#94a3b8',
    position: 0,
    isInitial: true,
    isFinal: false,
  },
  {
    name: ACTIVITY_STATUS.CHANGES_REQUESTED,
    color: '#f59e0b',
    position: 1,
    isInitial: false,
    isFinal: false,
  },
  {
    name: ACTIVITY_STATUS.REJECTED,
    color: '#dc2626',
    position: 2,
    isInitial: false,
    isFinal: true,
  },
  {
    name: ACTIVITY_STATUS.PLANNING,
    color: '#3b82f6',
    position: 3,
    isInitial: false,
    isFinal: false,
  },
  {
    name: ACTIVITY_STATUS.IN_PROGRESS,
    color: '#84bd31',
    position: 4,
    isInitial: false,
    isFinal: false,
  },
  {
    name: ACTIVITY_STATUS.INCOMPLETE,
    color: '#ea580c',
    position: 5,
    isInitial: false,
    isFinal: false,
  },
  {
    name: ACTIVITY_STATUS.POSTPONED,
    color: '#a855f7',
    position: 6,
    isInitial: false,
    isFinal: false,
  },
  {
    name: ACTIVITY_STATUS.COMPLETED,
    color: '#006837',
    position: 7,
    isInitial: false,
    isFinal: true,
  },
  {
    name: ACTIVITY_STATUS.CANCELLED,
    color: '#64748b',
    position: 8,
    isInitial: false,
    isFinal: true,
  },
];

export const FIXED_STATUS_NAMES: Set<string> = new Set(
  FIXED_ACTIVITY_STATUSES.map((s) => s.name),
);

/** Estados en los que ya se pueden completar tareas. */
export const TASKS_ALLOWED_STATUSES = new Set<string>([
  ACTIVITY_STATUS.PLANNING,
  ACTIVITY_STATUS.IN_PROGRESS,
  ACTIVITY_STATUS.INCOMPLETE,
]);

/** Actividad “muerta”: no más tareas ni cambios operativos. */
export const CLOSED_ACTIVITY_STATUSES = new Set<string>([
  ACTIVITY_STATUS.CANCELLED,
  ACTIVITY_STATUS.COMPLETED,
  ACTIVITY_STATUS.REJECTED,
]);

/** Estados que el auto-avance no debe pisar. */
export const LOCKED_AUTO_STATUSES = new Set<string>([
  ACTIVITY_STATUS.AWAITING_APPROVAL,
  ACTIVITY_STATUS.CHANGES_REQUESTED,
  ACTIVITY_STATUS.REJECTED,
  ACTIVITY_STATUS.POSTPONED,
  ACTIVITY_STATUS.COMPLETED,
  ACTIVITY_STATUS.CANCELLED,
]);

export function todayKeyMexico(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Merida',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function dateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}
