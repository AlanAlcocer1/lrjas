import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'destructive' | 'outline' | 'warning';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
        {
          default: 'bg-primary text-primary-foreground',
          secondary: 'bg-muted text-muted-foreground',
          success: 'bg-leaf/15 text-leaf-dark border border-leaf/25',
          destructive: 'bg-red-500/15 text-red-600 border border-red-500/20',
          outline: 'border border-border text-muted-foreground',
          warning: 'bg-amber-500/15 text-amber-700 border border-amber-500/25',
        }[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center justify-center py-8 px-4 text-center rounded-2xl border border-dashed border-border bg-muted/30'
          : 'flex flex-col items-center justify-center py-16 px-4 text-center'
      }
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border border-border">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4 break-words">{description}</p>
      {action}
    </div>
  );
}
