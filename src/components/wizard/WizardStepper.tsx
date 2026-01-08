import { cn } from '@/lib/utils';
import { Check, AlertCircle, FileText, Calendar, Zap, Activity, Sun, Receipt, Calculator, ClipboardCheck } from 'lucide-react';
import { useWizard } from './WizardContext';

const steps = [
  { id: 0, name: 'Contexto UC', icon: FileText },
  { id: 1, name: 'Cabeçalho', icon: Calendar },
  { id: 2, name: 'Consumo', icon: Zap },
  { id: 3, name: 'Demanda', icon: Activity },
  { id: 4, name: 'SCEE/GD', icon: Sun },
  { id: 5, name: 'Itens Fatura', icon: Receipt },
  { id: 6, name: 'Tributos', icon: Calculator },
  { id: 7, name: 'Conferência', icon: ClipboardCheck },
];

export function WizardStepper() {
  const { currentStep, setCurrentStep, data } = useWizard();

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const hasAlerts = step.id === 7 && data.alertas.length > 0;

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
                onClick={() => setCurrentStep(step.id)}
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
                    'text-xs font-medium text-center',
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
