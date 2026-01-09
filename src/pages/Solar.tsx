import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { GenerationChart } from '@/components/charts/GenerationChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useEnergy } from '@/contexts/EnergyContext';
import { formatNumber, formatPercent, formatCurrency } from '@/data/mockData';
import { Sun, Battery, Plug, Activity, Zap, Receipt } from 'lucide-react';

export default function Solar() {
  const { geracoes, faturas, mesAtual } = useEnergy();

  const geracaoMesAtualDB = geracoes.find(g => g.mes_ref === mesAtual);
  const faturaMesAtualDB = faturas.find(f => f.mes_ref === mesAtual);

  // Convert to typed object for easier access
  const geracaoMesAtual = geracaoMesAtualDB ? {
    geracaoTotalKwh: Number(geracaoMesAtualDB.geracao_total_kwh),
    autoconsumoKwh: Number(geracaoMesAtualDB.autoconsumo_kwh),
    injecaoKwh: Number(geracaoMesAtualDB.injecao_kwh),
    compensacaoKwh: Number(geracaoMesAtualDB.compensacao_kwh),
    disponibilidadePercent: Number(geracaoMesAtualDB.disponibilidade_percent),
    perdasEstimadasKwh: Number(geracaoMesAtualDB.perdas_estimadas_kwh),
    mesRef: geracaoMesAtualDB.mes_ref,
  } : null;

  // Energia simultânea e créditos de assinatura
  const energiaSimultaneaKwh = Number(faturaMesAtualDB?.energia_simultanea_kwh || 0);
  const energiaSimultaneaRs = Number(faturaMesAtualDB?.energia_simultanea_rs || 0);
  const creditoAssinaturaKwh = Number(faturaMesAtualDB?.credito_assinatura_kwh || 0);
  const creditoAssinaturaRs = Number(faturaMesAtualDB?.credito_assinatura_rs || 0);
  const descontoAssinaturaPercent = Number(faturaMesAtualDB?.desconto_assinatura_percent || 0);

  // Calculate expected generation (average of last 3 months as baseline)
  const geracoesOrdenadas = [...geracoes].sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
  const indexAtual = geracoesOrdenadas.findIndex(g => g.mes_ref === mesAtual);
  
  const geracoesAnteriores = geracoesOrdenadas.slice(indexAtual + 1, indexAtual + 4);
  const mediaEsperada = geracoesAnteriores.length > 0
    ? geracoesAnteriores.reduce((acc, g) => acc + Number(g.geracao_total_kwh), 0) / geracoesAnteriores.length
    : geracaoMesAtual?.geracaoTotalKwh || 0;

  // Prepare generation chart data
  const generationData = geracoes
    .slice(0, 6)
    .map((geracao, index, arr) => {
      // Calculate rolling average for expected
      const previousGeracoes = arr.slice(index + 1, index + 4);
      const esperado = previousGeracoes.length > 0
        ? previousGeracoes.reduce((acc, g) => acc + Number(g.geracao_total_kwh), 0) / previousGeracoes.length
        : Number(geracao.geracao_total_kwh);

      return {
        mesRef: geracao.mes_ref,
        geracao: Number(geracao.geracao_total_kwh),
        esperado: esperado,
      };
    })
    .reverse();

  // Donut chart data
  const energyDistribution = geracaoMesAtual ? [
    {
      name: 'Autoconsumo',
      value: geracaoMesAtual.autoconsumoKwh,
      color: 'hsl(var(--chart-optimized))',
    },
    {
      name: 'Injeção na Rede',
      value: geracaoMesAtual.injecaoKwh,
      color: 'hsl(var(--chart-original))',
    },
    {
      name: 'Perdas',
      value: geracaoMesAtual.perdasEstimadasKwh,
      color: 'hsl(var(--muted-foreground))',
    },
  ] : [];

  const performancePercent = geracaoMesAtual && mediaEsperada > 0
    ? ((geracaoMesAtual.geracaoTotalKwh / mediaEsperada) * 100)
    : 100;

  return (
    <DashboardLayout title="Solar" subtitle="Monitoramento da geração fotovoltaica">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Geração Total"
            value={`${formatNumber(geracaoMesAtual?.geracaoTotalKwh || 0)} kWh`}
            subtitle={`Esperado: ${formatNumber(mediaEsperada)} kWh`}
            trend={{
              value: performancePercent - 100,
              label: 'vs esperado',
              isPositive: performancePercent >= 100,
            }}
            icon={<Sun className="h-6 w-6" />}
            variant={performancePercent >= 90 ? 'success' : 'warning'}
          />

          <KPICard
            title="Autoconsumo"
            value={`${formatNumber(geracaoMesAtual?.autoconsumoKwh || 0)} kWh`}
            subtitle={`${((geracaoMesAtual?.autoconsumoKwh || 0) / (geracaoMesAtual?.geracaoTotalKwh || 1) * 100).toFixed(1)}% da geração`}
            icon={<Battery className="h-6 w-6" />}
          />

          <KPICard
            title="Injeção na Rede"
            value={`${formatNumber(geracaoMesAtual?.injecaoKwh || 0)} kWh`}
            subtitle={`Compensado: ${formatNumber(geracaoMesAtual?.compensacaoKwh || 0)} kWh`}
            icon={<Plug className="h-6 w-6" />}
          />

          <KPICard
            title="Disponibilidade"
            value={formatPercent(geracaoMesAtual?.disponibilidadePercent || 0)}
            subtitle="Performance do sistema"
            icon={<Activity className="h-6 w-6" />}
            variant={(geracaoMesAtual?.disponibilidadePercent || 0) >= 95 ? 'success' : 'warning'}
          />
        </div>

        {/* Energia Simultânea vs Créditos Assinatura */}
        {(energiaSimultaneaKwh > 0 || creditoAssinaturaKwh > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-primary/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Energia Simultânea</h3>
                  <p className="text-xs text-muted-foreground">Geração própria consumida em tempo real</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Energia</span>
                  <p className="text-2xl font-bold">{formatNumber(energiaSimultaneaKwh)} <span className="text-sm font-normal">kWh</span></p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Economia</span>
                  <p className="text-2xl font-bold text-success">{formatCurrency(energiaSimultaneaRs)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 bg-success/10 p-2 rounded">
                💡 100% de economia - energia consumida no momento da geração
              </p>
            </div>

            <div className="bg-card rounded-xl border border-chart-optimized/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-chart-optimized/10 rounded-lg">
                  <Receipt className="h-5 w-5 text-chart-optimized" />
                </div>
                <div>
                  <h3 className="font-semibold">Créditos de Assinatura</h3>
                  <p className="text-xs text-muted-foreground">Créditos recebidos de usina remota</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Créditos</span>
                  <p className="text-xl font-bold">{formatNumber(creditoAssinaturaKwh)} <span className="text-sm font-normal">kWh</span></p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <p className="text-xl font-bold text-chart-optimized">{formatCurrency(creditoAssinaturaRs)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Desconto</span>
                  <p className="text-xl font-bold">{descontoAssinaturaPercent}%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 bg-chart-optimized/10 p-2 rounded">
                📋 Créditos transferidos via contrato de assinatura
              </p>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Generation Chart */}
          <div className="lg:col-span-2">
            <GenerationChart
              data={generationData}
              title="Geração Real vs Esperada"
            />
          </div>

          {/* Distribution Donut */}
          <DonutChart
            data={energyDistribution}
            title="Distribuição da Energia"
            centerLabel="Total"
            centerValue={`${formatNumber((geracaoMesAtual?.geracaoTotalKwh || 0) / 1000, 1)}k`}
          />
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Summary */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="section-title">Resumo de Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Geração Total</span>
                <span className="font-medium">{formatNumber(geracaoMesAtual?.geracaoTotalKwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Autoconsumo</span>
                <span className="font-medium">{formatNumber(geracaoMesAtual?.autoconsumoKwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Energia Injetada</span>
                <span className="font-medium">{formatNumber(geracaoMesAtual?.injecaoKwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Energia Compensada</span>
                <span className="font-medium text-success">{formatNumber(geracaoMesAtual?.compensacaoKwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Perdas Estimadas</span>
                <span className="font-medium text-destructive">{formatNumber(geracaoMesAtual?.perdasEstimadasKwh || 0)} kWh</span>
              </div>
              <div className={`flex justify-between items-center py-3 -mx-6 px-6 rounded-lg mt-4 ${
                (geracaoMesAtual?.disponibilidadePercent || 0) >= 95
                  ? 'bg-success/10'
                  : 'bg-warning/10'
              }`}>
                <span className="font-semibold">Disponibilidade do Sistema</span>
                <span className="font-bold text-lg">{formatPercent(geracaoMesAtual?.disponibilidadePercent || 0)}</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="section-title">Análise e Recomendações</h3>
            <div className="space-y-4">
              {performancePercent >= 100 ? (
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="font-medium text-success">✓ Geração acima do esperado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A usina solar está operando {(performancePercent - 100).toFixed(1)}% acima da média histórica.
                  </p>
                </div>
              ) : performancePercent >= 90 ? (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="font-medium text-primary">Geração dentro do esperado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Performance dentro da variação normal de ±10%.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="font-medium text-warning">⚠ Geração abaixo do esperado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Queda de {(100 - performancePercent).toFixed(1)}% em relação à média. 
                    Recomenda-se verificar condições climáticas ou manutenção preventiva.
                  </p>
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Taxa de Autoconsumo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {((geracaoMesAtual?.autoconsumoKwh || 0) / (geracaoMesAtual?.geracaoTotalKwh || 1) * 100).toFixed(1)}% 
                  da energia gerada está sendo consumida diretamente, o que otimiza a economia.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Compensação de Créditos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatNumber(geracaoMesAtual?.compensacaoKwh || 0)} kWh foram compensados na fatura 
                  ({((geracaoMesAtual?.compensacaoKwh || 0) / (geracaoMesAtual?.injecaoKwh || 1) * 100).toFixed(1)}% da energia injetada).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
