import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { useEnergy } from '@/contexts/EnergyContext';
import { formatCurrency, formatPercent } from '@/data/mockData';
import { DollarSign, TrendingUp, Zap, Activity } from 'lucide-react';

export default function ExecutiveDashboard() {
  const { kpis, faturas, mesAtual } = useEnergy();

  const faturaMesAtual = faturas.find(f => f.mesRef === mesAtual);
  
  // Calculate trend (comparison with previous month)
  const faturasOrdenadas = [...faturas].sort((a, b) => b.mesRef.localeCompare(a.mesRef));
  const indexMesAtual = faturasOrdenadas.findIndex(f => f.mesRef === mesAtual);
  const faturaMesAnterior = indexMesAtual >= 0 && indexMesAtual < faturasOrdenadas.length - 1 
    ? faturasOrdenadas[indexMesAtual + 1] 
    : null;

  const variacao = faturaMesAnterior 
    ? ((faturaMesAtual?.valorTotal || 0) - faturaMesAnterior.valorTotal) / faturaMesAnterior.valorTotal * 100
    : 0;

  return (
    <DashboardLayout title="Visão Executiva" subtitle="Resumo do mês e indicadores principais">
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
        {/* Status Geral */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Status Geral</h2>
            <p className="text-muted-foreground">Acompanhe a performance energética</p>
          </div>
          <StatusBadge status={kpis.statusGeral} size="lg" />
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Economia do Mês"
            value={formatCurrency(kpis.economiaDoMes)}
            subtitle="Comparado ao cenário base"
            trend={{
              value: 12.5,
              label: 'vs mês anterior',
              isPositive: true,
            }}
            icon={<DollarSign className="h-6 w-6" />}
            variant="success"
          />

          <KPICard
            title="Economia Acumulada"
            value={formatCurrency(kpis.economiaAcumulada)}
            subtitle="Últimos 6 meses"
            icon={<TrendingUp className="h-6 w-6" />}
            variant="success"
          />

          <KPICard
            title="Custo Médio kWh"
            value={`R$ ${kpis.custoKwhAntes.toFixed(3)}`}
            subtitle={`Após otimização: R$ ${kpis.custoKwhDepois.toFixed(3)}`}
            trend={{
              value: -((kpis.custoKwhAntes - kpis.custoKwhDepois) / kpis.custoKwhAntes * 100),
              label: 'redução',
              isPositive: true,
            }}
            icon={<Zap className="h-6 w-6" />}
          />

          <KPICard
            title="Fatura do Mês"
            value={formatCurrency(faturaMesAtual?.valorTotal || 0)}
            subtitle="Valor total da distribuidora"
            trend={faturaMesAnterior ? {
              value: variacao,
              label: 'vs anterior',
              isPositive: variacao < 0,
            } : undefined}
            icon={<Activity className="h-6 w-6" />}
            variant={variacao > 10 ? 'warning' : 'default'}
          />
        </div>

        {/* Alertas */}
        <div className="flex-1 min-h-0">
          <h3 className="section-title">Alertas e Recomendações</h3>
          {kpis.alertas.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[calc(100%-2rem)] overflow-y-auto pr-2">
              {kpis.alertas.map((alerta, index) => (
                <AlertCard key={index} alerta={alerta} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 bg-success/5 rounded-lg border border-success/20">
              <p className="text-success font-medium">
                ✓ Nenhum alerta identificado. Operação dentro dos parâmetros.
              </p>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Consumo Total</p>
            <p className="text-xl font-bold">{faturaMesAtual?.consumoTotalKwh.toLocaleString('pt-BR')} kWh</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Demanda Medida</p>
            <p className="text-xl font-bold">{faturaMesAtual?.demandaMedidaKw} kW</p>
            <p className="text-xs text-muted-foreground">Contratada: {faturaMesAtual?.demandaContratadaKw} kW</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Bandeira Tarifária</p>
            <p className="text-xl font-bold capitalize">{faturaMesAtual?.bandeiras}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
