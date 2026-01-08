import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { useEnergy } from '@/contexts/EnergyContext';
import { formatCurrency, formatNumber, getMonthName } from '@/data/mockData';
import { calcularKPIsMensais } from '@/lib/calculations';
import { Receipt, TrendingDown, AlertTriangle, Zap } from 'lucide-react';

export default function EnergiaFatura() {
  const { faturas, geracoes, assinaturas, mesAtual } = useEnergy();

  const faturaMesAtual = faturas.find(f => f.mesRef === mesAtual);
  const geracaoMesAtual = geracoes.find(g => g.mesRef === mesAtual);
  const assinaturaMesAtual = assinaturas.find(a => a.mesRef === mesAtual);

  const kpisMensais = faturaMesAtual && geracaoMesAtual && assinaturaMesAtual
    ? calcularKPIsMensais(faturaMesAtual, geracaoMesAtual, assinaturaMesAtual)
    : null;

  // Prepare comparison chart data
  const comparisonData = faturas
    .slice(0, 6)
    .map(fatura => {
      const geracao = geracoes.find(g => g.mesRef === fatura.mesRef);
      const assinatura = assinaturas.find(a => a.mesRef === fatura.mesRef);
      const kpis = geracao && assinatura
        ? calcularKPIsMensais(fatura, geracao, assinatura)
        : null;

      return {
        mesRef: fatura.mesRef,
        original: fatura.valorTotal + (assinatura?.valorAssinatura || 0),
        otimizado: (fatura.valorTotal + (assinatura?.valorAssinatura || 0)) - (kpis?.economiaMensalRs || 0),
      };
    })
    .reverse();

  const totalMultas = (faturaMesAtual?.multaDemanda || 0) + (faturaMesAtual?.multaReativo || 0);

  return (
    <DashboardLayout title="Energia & Fatura" subtitle="Análise detalhada da conta de energia">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Valor da Fatura"
            value={formatCurrency(faturaMesAtual?.valorTotal || 0)}
            subtitle={`+ Assinatura: ${formatCurrency(assinaturaMesAtual?.valorAssinatura || 0)}`}
            icon={<Receipt className="h-6 w-6" />}
          />

          <KPICard
            title="Economia Mensal"
            value={formatCurrency(kpisMensais?.economiaMensalRs || 0)}
            subtitle={`${kpisMensais?.economiaMensalPercent.toFixed(1)}% de economia`}
            icon={<TrendingDown className="h-6 w-6" />}
            variant="success"
          />

          <KPICard
            title="Multas"
            value={formatCurrency(totalMultas)}
            subtitle={totalMultas > 0 ? "Demanda + Reativo" : "Sem multas no mês"}
            icon={<AlertTriangle className="h-6 w-6" />}
            variant={totalMultas > 0 ? 'danger' : 'success'}
          />

          <KPICard
            title="Consumo Ponta"
            value={`${formatNumber(faturaMesAtual?.pontaKwh || 0)} kWh`}
            subtitle={`${((faturaMesAtual?.pontaKwh || 0) / (faturaMesAtual?.consumoTotalKwh || 1) * 100).toFixed(1)}% do total`}
            icon={<Zap className="h-6 w-6" />}
          />
        </div>

        {/* Comparison Chart */}
        <ComparisonChart
          data={comparisonData}
          title="Comparativo: Conta Original vs Conta Otimizada"
        />

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Breakdown */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="section-title">Composição da Fatura</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Tarifa de Energia (TE)</span>
                <span className="font-medium">{formatCurrency(faturaMesAtual?.valorTe || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Tarifa de Uso (TUSD)</span>
                <span className="font-medium">{formatCurrency(faturaMesAtual?.valorTusd || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Bandeira Tarifária</span>
                <span className={`font-medium capitalize ${
                  faturaMesAtual?.bandeiras === 'verde' ? 'text-success' :
                  faturaMesAtual?.bandeiras === 'amarela' ? 'text-warning' : 'text-destructive'
                }`}>
                  {faturaMesAtual?.bandeiras}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Outros Encargos</span>
                <span className="font-medium">{formatCurrency(faturaMesAtual?.outrosEncargos || 0)}</span>
              </div>
              {totalMultas > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-destructive/30 bg-destructive/5 -mx-6 px-6">
                  <span className="text-destructive font-medium">Multas</span>
                  <span className="text-destructive font-bold">{formatCurrency(totalMultas)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-3 bg-primary/5 -mx-6 px-6 rounded-lg mt-4">
                <span className="font-semibold">Total da Fatura</span>
                <span className="font-bold text-lg">{formatCurrency(faturaMesAtual?.valorTotal || 0)}</span>
              </div>
            </div>
          </div>

          {/* Consumption Breakdown */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="section-title">Análise de Consumo</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Consumo Total</span>
                <span className="font-medium">{formatNumber(faturaMesAtual?.consumoTotalKwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Consumo Ponta</span>
                <span className="font-medium">{formatNumber(faturaMesAtual?.pontaKwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Consumo Fora Ponta</span>
                <span className="font-medium">{formatNumber(faturaMesAtual?.foraPontaKwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Demanda Contratada</span>
                <span className="font-medium">{faturaMesAtual?.demandaContratadaKw} kW</span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${
                (faturaMesAtual?.demandaMedidaKw || 0) > (faturaMesAtual?.demandaContratadaKw || 0)
                  ? 'border-destructive/30 bg-destructive/5 -mx-6 px-6'
                  : 'border-border'
              }`}>
                <span className={`${
                  (faturaMesAtual?.demandaMedidaKw || 0) > (faturaMesAtual?.demandaContratadaKw || 0)
                    ? 'text-destructive font-medium'
                    : 'text-muted-foreground'
                }`}>Demanda Medida</span>
                <span className={`font-medium ${
                  (faturaMesAtual?.demandaMedidaKw || 0) > (faturaMesAtual?.demandaContratadaKw || 0)
                    ? 'text-destructive'
                    : ''
                }`}>{faturaMesAtual?.demandaMedidaKw} kW</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-accent/10 -mx-6 px-6 rounded-lg mt-4">
                <span className="font-semibold">Custo por kWh</span>
                <span className="font-bold text-lg">
                  R$ {kpisMensais?.custoKwhBase.toFixed(4) || '0.0000'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
