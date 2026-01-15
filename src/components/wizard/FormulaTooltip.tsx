import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FormulaTooltipProps {
  title: string;
  formula: string;
  variables?: {
    name: string;
    value: string | number;
    unit?: string;
  }[];
  description?: string;
}

export function FormulaTooltip({ title, formula, variables, description }: FormulaTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help ml-1" />
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-3 space-y-2"
          sideOffset={5}
        >
          <div className="font-medium text-sm">{title}</div>
          
          <div className="bg-muted/50 rounded px-2 py-1.5 font-mono text-xs">
            {formula}
          </div>
          
          {variables && variables.length > 0 && (
            <div className="space-y-1 text-xs">
              <div className="text-muted-foreground font-medium">Onde:</div>
              {variables.map((v, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{v.name}:</span>
                  <span className="font-mono font-medium">
                    {typeof v.value === 'number' 
                      ? v.value.toLocaleString('pt-BR', { maximumFractionDigits: 5 }) 
                      : v.value}
                    {v.unit && <span className="text-muted-foreground ml-0.5">{v.unit}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {description && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              {description}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Tooltip simplificado para origem de dados
interface DataSourceTooltipProps {
  source: string;
  field?: string;
}

export function DataSourceTooltip({ source, field }: DataSourceTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help ml-1" />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <div className="font-medium">Origem: {source}</div>
          {field && <div className="text-muted-foreground">Campo: {field}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
