import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { GenerationChart } from '@/components/charts/GenerationChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useEnergy } from '@/contexts/EnergyContext';
import { formatNumber, formatPercent } from '@/data/mockData';
import { Sun, Battery, Plug, Activity } from 'lucide-react';

export default function Solar() {
  const { geracoes, mesAtual } = useEnergy();

  const geracaoMesAtual = geracoes.find(g => g.mesRef === mesAtual);

  // Calculate expected generation (average of last 3 months as baseline)
  const geracoesOrdenadas = [...geracoes].sort((a, b) => b.mesRef.localeCompare(a.mesRef));
  const indexAtual = geracoesOrdenadas.findIndex(g => g.mesRef === mesAtual);
  
  const geracoesAnteriores = geracoesOrdenadas.slice(indexAtual + 1, indexAtual + 4);
  const mediaEsperada = geracoesAnteriores.length > 0
    ? geracoesAnteriores.reduce((acc, g) => acc + g.geracaoTotalKwh, 0) / geracoesAnteriores.length
    : geracaoMesAtual?.geracaoTotalKwh || 0;

  // Prepare generation chart data
  const generationData = geracoes
    .slice(0, 6)
    .map((geracao, index, arr) => {
      // Calculate rolling average for expected
      const previousGeracoes = arr.slice(index + 1, index + 4);
      const esperado = previousGeracoes.length > 0
        ? previousGeracoes.reduce((acc, g) => acc + g.geracaoTotalKwh, 0) / previousGeracoes.length
        : geracao.geracaoTotalKwh;

      return {
        mesRef: geracao.mesRef,
        geracao: geracao.geracaoTotalKwh,
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
