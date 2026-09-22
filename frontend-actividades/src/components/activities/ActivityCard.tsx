import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { approvalLabel, formatDate, formatFullName } from '@/lib/utils';
import type { Activity, ApprovalStatus, PublicActivity } from '@/types';

function approvalVariant(status: ApprovalStatus) {
  switch (status) {
    case 'APPROVED':
      return 'success' as const;
    case 'REJECTED':
      return 'destructive' as const;
    case 'CHANGES_REQUESTED':
      return 'warning' as const;
    default:
      return 'secondary' as const;
  }
}

export function ActivityCard({ activity }: { activity: Activity }) {
  const primary = activity.responsibles?.find((r) => r.type === 'PRIMARY')?.participant;
  const timeLabel = activity.endTime
    ? `${activity.startTime} – ${activity.endTime}`
    : activity.startTime;

  return (
    <Link to={`/actividades/${activity.id}`} className="block min-w-0">
      <Card className="transition-all hover:border-leaf/40 hover:shadow-md active:scale-[0.99] overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground leading-snug break-words">
                {activity.name}
              </h3>
              {activity.team && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.team.name}</p>
              )}
            </div>
            <Badge
              variant={approvalVariant(activity.approvalStatus)}
              className="shrink-0 max-w-[9.5rem] whitespace-normal text-center leading-tight"
            >
              {approvalLabel(activity.approvalStatus)}
            </Badge>
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-start gap-2 min-w-0">
              <Calendar className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">
                {formatDate(activity.date)}
                <span className="text-border mx-1.5">·</span>
                {timeLabel}
              </span>
            </p>
            <p className="flex items-start gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{activity.location}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {activity.status && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium min-w-0"
                style={{ color: activity.status.color }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: activity.status.color }}
                />
                <span className="truncate">{activity.status.name}</span>
              </span>
            )}
            {activity.progress && activity.progress.total > 0 && (
              <span className="text-xs text-muted-foreground shrink-0">
                Tareas {activity.progress.completed}/{activity.progress.total}
              </span>
            )}
          </div>

          {primary && (
            <p className="text-xs text-muted-foreground truncate">
              Responsable: {formatFullName(primary)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function PublicActivityCard({ activity }: { activity: PublicActivity }) {
  const timeLabel = activity.endTime
    ? `${activity.startTime} – ${activity.endTime}`
    : activity.startTime;

  return (
    <Link to={`/public/${activity.id}`} className="block min-w-0">
      <Card className="transition-all hover:border-leaf/40 hover:shadow-md active:scale-[0.99] overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-foreground leading-snug break-words">{activity.name}</h3>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-start gap-2 min-w-0">
              <Calendar className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">
                {formatDate(activity.date)}
                <span className="text-border mx-1.5">·</span>
                {timeLabel}
              </span>
            </p>
            <p className="flex items-start gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{activity.location}</span>
            </p>
          </div>

          {activity.team && (
            <p className="text-xs text-muted-foreground truncate">{activity.team.name}</p>
          )}
          <p className="text-sm text-muted-foreground line-clamp-3 break-words">
            {activity.publicDescription}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
