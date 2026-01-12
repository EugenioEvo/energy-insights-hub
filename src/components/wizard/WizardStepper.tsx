import { cn } from '@/lib/utils';
import { Check, AlertCircle, FileText, Calendar, Zap, Activity, Sun, Receipt, Calculator, ClipboardCheck, PlugZap } from 'lucide-react';
import { useWizard } from './WizardContext';

// Mapeamento de ícones por ID do step
const stepIcons: Record<string, React.ElementType> = {
  contexto: FileText,
  cabecalho: Calendar,
  consumo: Zap,
  demanda: Activity,
  geracao_local: Sun,
  creditos_remotos: PlugZap,
  itens_fatura: Receipt,
  tributos: Calculator,
  conferencia: ClipboardCheck,
};

export function WizardStepper() {
  const { currentStep, setCurrentStep, data, steps } = useWizard();

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = stepIcons[step.id] || FileText;
          const isCompleted = currentStep > index;
          const isCurrent = currentStep === index;
          const hasAlerts = step.id === 'conferencia' && data.alertas.length > 0;

          return (
            <li key={step.id} className="flex-1 relative">
              {index !== 0 && (
                <div
                  className={cn(
                    'absolute left-0 right-1/2 top-5 h-0.5 -translate-y-1/2',
                    isCompleted || isCurrent ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-1/2 right-0 top-5 h-0.5 -translate-y-1/2',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'relative flex flex-col items-center gap-2 cursor-pointer group',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg p-2'
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors z-10',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-background text-primary',
                    !isCompleted && !isCurrent && 'border-border bg-background text-muted-foreground',
                    'group-hover:border-primary group-hover:text-primary'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : hasAlerts ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium text-center whitespace-nowrap',
                    isCurrent ? 'text-primary' : 'text-muted-foreground',
                    'group-hover:text-primary'
                  )}
                >
                  {step.name}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
