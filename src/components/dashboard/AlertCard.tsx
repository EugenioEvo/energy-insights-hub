import { cn } from '@/lib/utils';
import { Alerta } from '@/types/energy';
import { AlertTriangle, AlertCircle, Info, Zap, Sun, FileText } from 'lucide-react';
import { formatCurrency } from '@/data/mockData';

interface AlertCardProps {
  alerta: Alerta;
}

const severityConfig = {
  info: {
    icon: Info,
    className: 'border-l-primary bg-primary/5',
    iconClassName: 'text-primary',
  },
  atencao: {
    icon: AlertTriangle,
    className: 'border-l-warning bg-warning/5',
    iconClassName: 'text-warning',
  },
  critico: {
    icon: AlertCircle,
    className: 'border-l-destructive bg-destructive/5',
    iconClassName: 'text-destructive',
  },
};

const tipoConfig = {
  demanda: { icon: Zap, label: 'Demanda' },
  multa: { icon: AlertCircle, label: 'Multa' },
  subgeracao: { icon: Sun, label: 'Geração Solar' },
  assinatura: { icon: FileText, label: 'Assinatura' },
};

export function AlertCard({ alerta }: AlertCardProps) {
  // Fallback para valores inválidos vindos do banco de dados
  const severity = severityConfig[alerta.severidade] || severityConfig.info;
  const tipo = tipoConfig[alerta.tipo] || { icon: Info, label: 'Alerta' };
  const SeverityIcon = severity.icon;

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 p-4 animate-fade-in',
        severity.className
      )}
    >
      <div className="flex items-start gap-3">
        <SeverityIcon className={cn('h-5 w-5 mt-0.5', severity.iconClassName)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {tipo.label}
            </span>
          </div>
          <p className="font-medium text-foreground">{alerta.titulo}</p>
          <p className="text-sm text-muted-foreground mt-1">{alerta.descricao}</p>
          {alerta.valor !== undefined && alerta.valor > 0 && (
            <p className="text-sm font-medium text-foreground mt-2">
              Impacto: {formatCurrency(alerta.valor)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
