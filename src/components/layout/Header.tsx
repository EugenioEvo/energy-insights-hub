import { Bell, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEnergy } from '@/contexts/EnergyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMonthName } from '@/data/mockData';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { mesAtual, setMesAtual, faturas, kpis } = useEnergy();
  
  const mesesDisponiveis = [...new Set(faturas.map(f => f.mesRef))].sort().reverse();

  const alertCount = kpis.alertas.filter(a => a.severidade !== 'info').length;

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={mesAtual} onValueChange={setMesAtual}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {mesesDisponiveis.map((mes) => (
                  <SelectItem key={mes} value={mes}>
                    {getMonthName(mes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
