import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: 'border-border',
  success: 'border-success/30 bg-success/5',
  warning: 'border-warning/30 bg-warning/5',
  danger: 'border-destructive/30 bg-destructive/5',
};

const iconStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-destructive/20 text-destructive',
};

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'kpi-card animate-fade-in',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="kpi-label">{title}</p>
          <p className="kpi-value mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-3">
              {trend.value > 0 ? (
                <TrendingUp className={cn('h-4 w-4', trend.isPositive ? 'text-success' : 'text-destructive')} />
              ) : trend.value < 0 ? (
                <TrendingDown className={cn('h-4 w-4', trend.isPositive ? 'text-success' : 'text-destructive')} />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl', iconStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
