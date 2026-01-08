import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'OK' | 'ATENCAO' | 'CRITICO';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig = {
  OK: {
    label: 'Tudo em ordem',
    icon: CheckCircle2,
    className: 'status-ok',
  },
  ATENCAO: {
    label: 'Requer atenção',
    icon: AlertTriangle,
    className: 'status-warning',
  },
  CRITICO: {
    label: 'Ação urgente',
    icon: XCircle,
    className: 'status-critical',
  },
};

const sizeStyles = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.className,
        sizeStyles[size]
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}
