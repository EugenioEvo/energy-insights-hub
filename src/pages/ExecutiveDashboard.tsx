import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { useEnergy } from '@/contexts/EnergyContext';
import { formatCurrency, formatPercent } from '@/data/mockData';
import { DollarSign, TrendingUp, Zap, Activity } from 'lucide-react';

export default function ExecutiveDashboard() {
  const { kpis, faturas, mesAtual, isLoading } = useEnergy();

  const faturaMesAtualDB = faturas.find(f => f.mes_ref === mesAtual);
  const faturaMesAtual = faturaMesAtualDB ? {
    valorTotal: Number(faturaMesAtualDB.valor_total),
    consumoTotalKwh: Number(faturaMesAtualDB.consumo_total_kwh),
    demandaMedidaKw: Number(faturaMesAtualDB.demanda_medida_kw),
    demandaContratadaKw: Number(faturaMesAtualDB.demanda_contratada_kw),
    bandeiras: faturaMesAtualDB.bandeiras,
  } : null;
  
  // Calculate trend (comparison with previous month)
  const faturasOrdenadas = [...faturas].sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
  const indexMesAtual = faturasOrdenadas.findIndex(f => f.mes_ref === mesAtual);
  const faturaMesAnteriorDB = indexMesAtual >= 0 && indexMesAtual < faturasOrdenadas.length - 1 
    ? faturasOrdenadas[indexMesAtual + 1] 
    : null;

  const variacao = faturaMesAnteriorDB 
    ? ((faturaMesAtual?.valorTotal || 0) - Number(faturaMesAnteriorDB.valor_total)) / Number(faturaMesAnteriorDB.valor_total) * 100
    : 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Visão Executiva" subtitle="Carregando dados...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (faturas.length === 0) {
    return (
      <DashboardLayout title="Visão Executiva" subtitle="Resumo do mês e indicadores principais">
        <div className="flex flex-col items-center justify-center h-64 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground text-lg">Nenhum dado cadastrado ainda.</p>
          <p className="text-muted-foreground text-sm mt-2">
            Acesse "Lançar Dados" para começar a registrar faturas, geração e assinaturas.
          </p>
        </div>
      </DashboardLayout>
    );
  }

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
            trend={faturaMesAnteriorDB ? {
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
            <p className="text-xl font-bold">{faturaMesAtual?.consumoTotalKwh?.toLocaleString('pt-BR') || 0} kWh</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Demanda Medida</p>
            <p className="text-xl font-bold">{faturaMesAtual?.demandaMedidaKw || 0} kW</p>
            <p className="text-xs text-muted-foreground">Contratada: {faturaMesAtual?.demandaContratadaKw || 0} kW</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Bandeira Tarifária</p>
            <p className="text-xl font-bold capitalize">{faturaMesAtual?.bandeiras || '-'}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
