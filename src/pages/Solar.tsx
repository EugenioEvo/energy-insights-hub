import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { GenerationChart } from '@/components/charts/GenerationChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useFaturas } from '@/hooks/useFaturas';
import { useUnidadesConsumidoras } from '@/hooks/useUnidadesConsumidoras';
import { Sun, Battery, Plug, Activity, Zap, Receipt } from 'lucide-react';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const formatNumber = (value: number, decimals = 0) => 
  value.toLocaleString('pt-BR', { maximumFractionDigits: decimals });

const formatPercent = (value: number) => 
  value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

const formatCurrency = (value: number) => 
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Solar() {
  const { data: faturas, isLoading: faturasLoading } = useFaturas();
  const { data: ucs } = useUnidadesConsumidoras();

  // Faturas ordenadas por mês (mais recente primeiro)
  const faturasOrdenadas = useMemo(() => {
    if (!faturas) return [];
    return [...faturas].sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
  }, [faturas]);

  const mesAtual = faturasOrdenadas[0]?.mes_ref || '';
  const faturaMesAtualDB = faturasOrdenadas.find(f => f.mes_ref === mesAtual);
  const ucAtual = ucs?.find(uc => uc.id === faturaMesAtualDB?.uc_id);

  // CORRIGIDO: Usar dados de geração da faturas_mensais com fallbacks robustos
  const geracaoMesAtual = faturaMesAtualDB ? (() => {
    const geracaoTotalKwh = Number(faturaMesAtualDB.geracao_local_total_kwh) || 0;
    
    // Autoconsumo: prioriza soma dos postos, depois total, depois energia_simultanea (legado)
    const autoconsumoSomaPosto = 
      (Number(faturaMesAtualDB.autoconsumo_ponta_kwh) || 0) +
      (Number(faturaMesAtualDB.autoconsumo_fp_kwh) || 0) +
      (Number(faturaMesAtualDB.autoconsumo_hr_kwh) || 0);
    const autoconsumoKwh = autoconsumoSomaPosto > 0 
      ? autoconsumoSomaPosto 
      : Number(faturaMesAtualDB.autoconsumo_total_kwh) || 
        Number(faturaMesAtualDB.energia_simultanea_kwh) || 0;
    
    return {
      geracaoTotalKwh,
      autoconsumoKwh,
      autoconsumoRs: Number(faturaMesAtualDB.autoconsumo_rs) || Number(faturaMesAtualDB.energia_simultanea_rs) || 0,
      injecaoKwh: Number(faturaMesAtualDB.injecao_total_kwh) || 0,
      compensacaoKwh: Number(faturaMesAtualDB.credito_remoto_kwh) || 0,
      perdasEstimadasKwh: geracaoTotalKwh * 0.03,
      disponibilidadePercent: 98,
      mesRef: faturaMesAtualDB.mes_ref,
    };
  })() : null;

  // Calculate expected generation (average of last 3 months as baseline)
  const faturasAnteriores = faturasOrdenadas.slice(1, 4);
  const mediaEsperada = faturasAnteriores.length > 0
    ? faturasAnteriores.reduce((acc, f) => acc + (Number(f.geracao_local_total_kwh) || 0), 0) / faturasAnteriores.length
    : geracaoMesAtual?.geracaoTotalKwh || 0;

  // Prepare generation chart data (usando faturas)
  const generationData = faturasOrdenadas
    .slice(0, 6)
    .map((fatura, index, arr) => {
      // Calculate rolling average for expected
      const previousFaturas = arr.slice(index + 1, index + 4);
      const esperado = previousFaturas.length > 0
        ? previousFaturas.reduce((acc, f) => acc + (Number(f.geracao_local_total_kwh) || 0), 0) / previousFaturas.length
        : Number(fatura.geracao_local_total_kwh) || 0;

      return {
        mesRef: fatura.mes_ref,
        geracao: Number(fatura.geracao_local_total_kwh) || 0,
        esperado: esperado,
      };
    })
    .reverse();

  // Donut chart data
  const energyDistribution = geracaoMesAtual && geracaoMesAtual.geracaoTotalKwh > 0 ? [
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
  ].filter(d => d.value > 0) : [];

  const performancePercent = geracaoMesAtual && mediaEsperada > 0
    ? ((geracaoMesAtual.geracaoTotalKwh / mediaEsperada) * 100)
    : 100;

  // Créditos de Assinatura (remotos)
  const creditoAssinaturaKwh = Number(faturaMesAtualDB?.credito_remoto_kwh || 0);
  const creditoAssinaturaRs = Number(faturaMesAtualDB?.credito_remoto_compensado_rs || 0);
  const descontoAssinaturaPercent = Number(faturaMesAtualDB?.desconto_assinatura_percent || 0);

  if (faturasLoading) {
    return (
      <DashboardLayout title="Solar" subtitle="Monitoramento da geração fotovoltaica">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!faturaMesAtualDB || !geracaoMesAtual || geracaoMesAtual.geracaoTotalKwh === 0) {
    return (
      <DashboardLayout title="Solar" subtitle="Monitoramento da geração fotovoltaica">
        <div className="text-center py-12 text-muted-foreground">
          <Sun className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum dado de geração encontrado.</p>
          <p className="text-sm">Lance dados no wizard para visualizar o dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Solar" subtitle={`Geração fotovoltaica • ${mesAtual} • ${ucAtual?.numero || ''}`}>
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Geração Total"
            value={`${formatNumber(geracaoMesAtual.geracaoTotalKwh)} kWh`}
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
            value={`${formatNumber(geracaoMesAtual.autoconsumoKwh)} kWh`}
            subtitle={`${((geracaoMesAtual.autoconsumoKwh) / (geracaoMesAtual.geracaoTotalKwh || 1) * 100).toFixed(1)}% da geração`}
            icon={<Battery className="h-6 w-6" />}
          />

          <KPICard
            title="Injeção na Rede"
            value={`${formatNumber(geracaoMesAtual.injecaoKwh)} kWh`}
            subtitle={`Créditos: ${formatNumber(geracaoMesAtual.compensacaoKwh)} kWh`}
            icon={<Plug className="h-6 w-6" />}
          />

          <KPICard
            title="Economia Autoconsumo"
            value={formatCurrency(geracaoMesAtual.autoconsumoRs)}
            subtitle="Energia simultânea"
            icon={<Activity className="h-6 w-6" />}
            variant="success"
          />
        </div>

        {/* Energia Simultânea vs Créditos Assinatura */}
        {(geracaoMesAtual.autoconsumoKwh > 0 || creditoAssinaturaKwh > 0) && (
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
                  <p className="text-2xl font-bold">{formatNumber(geracaoMesAtual.autoconsumoKwh)} <span className="text-sm font-normal">kWh</span></p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Economia</span>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(geracaoMesAtual.autoconsumoRs)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 bg-green-50 dark:bg-green-950/30 p-2 rounded">
                💡 100% de economia - energia consumida no momento da geração
              </p>
            </div>

            {creditoAssinaturaKwh > 0 && (
              <div className="bg-card rounded-xl border border-accent/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Receipt className="h-5 w-5 text-accent" />
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
                    <p className="text-xl font-bold text-green-600">{formatCurrency(creditoAssinaturaRs)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Desconto</span>
                    <p className="text-xl font-bold">{descontoAssinaturaPercent}%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 bg-accent/10 p-2 rounded">
                  📋 Créditos transferidos via contrato de assinatura
                </p>
              </div>
            )}
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
          {energyDistribution.length > 0 && (
            <DonutChart
              data={energyDistribution}
              title="Distribuição da Energia"
              centerLabel="Total"
              centerValue={`${formatNumber((geracaoMesAtual.geracaoTotalKwh) / 1000, 1)}k`}
            />
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Summary */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Resumo de Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Geração Total</span>
                <span className="font-medium">{formatNumber(geracaoMesAtual.geracaoTotalKwh)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Autoconsumo</span>
                <div className="text-right">
                  <span className="font-medium">{formatNumber(geracaoMesAtual.autoconsumoKwh)} kWh</span>
                  <span className="text-sm text-green-600 ml-2">({formatCurrency(geracaoMesAtual.autoconsumoRs)})</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Energia Injetada</span>
                <span className="font-medium">{formatNumber(geracaoMesAtual.injecaoKwh)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Créditos Recebidos</span>
                <div className="text-right">
                  <span className="font-medium text-green-600">{formatNumber(geracaoMesAtual.compensacaoKwh)} kWh</span>
                  <span className="text-sm text-green-600 ml-2">({formatCurrency(creditoAssinaturaRs)})</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Perdas Estimadas</span>
                <span className="font-medium text-destructive">{formatNumber(geracaoMesAtual.perdasEstimadasKwh)} kWh</span>
              </div>
              <div className={`flex justify-between items-center py-3 -mx-6 px-6 rounded-lg mt-4 ${
                (geracaoMesAtual.disponibilidadePercent) >= 95
                  ? 'bg-green-50 dark:bg-green-950/30'
                  : 'bg-amber-50 dark:bg-amber-950/30'
              }`}>
                <span className="font-semibold">Disponibilidade do Sistema</span>
                <span className="font-bold text-lg">{formatPercent(geracaoMesAtual.disponibilidadePercent)}</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Análise e Recomendações</h3>
            <div className="space-y-4">
              {performancePercent >= 100 ? (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="font-medium text-green-700 dark:text-green-300">✓ Geração acima do esperado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A usina solar está operando {(performancePercent - 100).toFixed(1)}% acima da média histórica.
                  </p>
                </div>
              ) : performancePercent >= 90 ? (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-medium text-blue-700 dark:text-blue-300">Geração dentro do esperado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Performance dentro da variação normal de ±10%.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="font-medium text-amber-700 dark:text-amber-300">⚠ Geração abaixo do esperado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Queda de {(100 - performancePercent).toFixed(1)}% em relação à média. 
                    Recomenda-se verificar condições climáticas ou manutenção preventiva.
                  </p>
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Taxa de Autoconsumo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {((geracaoMesAtual.autoconsumoKwh) / (geracaoMesAtual.geracaoTotalKwh || 1) * 100).toFixed(1)}% 
                  da energia gerada está sendo consumida diretamente, o que otimiza a economia.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Créditos Recebidos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatNumber(geracaoMesAtual.compensacaoKwh)} kWh foram compensados na fatura, 
                  gerando economia de {formatCurrency(creditoAssinaturaRs)}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
