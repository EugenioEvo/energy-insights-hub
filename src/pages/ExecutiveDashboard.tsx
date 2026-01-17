import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { GenerationChart } from '@/components/charts/GenerationChart';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { SubscriptionChart } from '@/components/charts/SubscriptionChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { SavingsTrendChart } from '@/components/charts/SavingsTrendChart';
import { Button } from '@/components/ui/button';
import { useEnergy } from '@/contexts/EnergyContext';
import { useExportPDF } from '@/hooks/useExportPDF';
import { formatCurrency, formatNumber, formatPercent } from '@/data/mockData';
import { 
  DollarSign, TrendingUp, Zap, Activity, Sun, Battery, Plug, 
  Receipt, TrendingDown, AlertTriangle, FileText, Percent, AlertCircle,
  Download, Loader2
} from 'lucide-react';

export default function ExecutiveDashboard() {
  const { kpis, faturas, mesAtual, isLoading } = useEnergy();
  const { exportToPDF, isExporting } = useExportPDF();

  // Format month for display
  const mesFormatado = (() => {
    if (!mesAtual) return '';
    const [year, month] = mesAtual.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  })();

  const handleExportPDF = async () => {
    await exportToPDF('dashboard-content', `relatorio-executivo-${mesAtual}.pdf`, {
      companyName: 'Evolight Energia',
      reportTitle: 'Relatório Executivo de Energia',
      mesRef: mesFormatado,
    });
  };

  // Current month data - usa apenas faturas
  const faturaMesAtualDB = faturas.find(f => f.mes_ref === mesAtual);

  // Valores da fatura atual (pré-calculados pelo wizard)
  const valorTotal = Number(faturaMesAtualDB?.valor_total) || 0;
  const consumoTotal = Number(faturaMesAtualDB?.consumo_total_kwh) || 0;
  const pontaKwh = Number(faturaMesAtualDB?.ponta_kwh) || 0;
  const foraPontaKwh = Number(faturaMesAtualDB?.fora_ponta_kwh) || 0;
  const economiaLiquida = Number(faturaMesAtualDB?.economia_liquida_rs) || 0;
  const custoAssinatura = Number(faturaMesAtualDB?.custo_assinatura_rs) || 0;
  const autoconsumoRs = Number(faturaMesAtualDB?.autoconsumo_rs) || 0;
  const creditoRemotoRs = Number(faturaMesAtualDB?.credito_remoto_compensado_rs) || 0;
  const totalCompensado = autoconsumoRs + creditoRemotoRs;

  // Trend calculation
  const faturasOrdenadas = [...faturas].sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
  const indexMesAtual = faturasOrdenadas.findIndex(f => f.mes_ref === mesAtual);
  const faturaMesAnteriorDB = indexMesAtual >= 0 && indexMesAtual < faturasOrdenadas.length - 1 
    ? faturasOrdenadas[indexMesAtual + 1] 
    : null;

  const variacao = faturaMesAnteriorDB 
    ? ((valorTotal - Number(faturaMesAnteriorDB.valor_total)) / Number(faturaMesAnteriorDB.valor_total) * 100)
    : 0;

  // Custo por kWh
  const custoKwhBase = consumoTotal > 0 ? valorTotal / consumoTotal : 0;

  // Solar - dados da fatura
  const geracaoLocalKwh = Number(faturaMesAtualDB?.geracao_local_total_kwh) || 0;
  const autoconsumoTotalKwh = Number(faturaMesAtualDB?.autoconsumo_total_kwh) || 0;
  const injecaoTotalKwh = Number(faturaMesAtualDB?.injecao_total_kwh) || 0;
  const temGeracaoLocal = geracaoLocalKwh > 0;

  // Créditos remotos - dados da fatura
  const creditoRemotoKwh = Number(faturaMesAtualDB?.credito_remoto_kwh) || 0;
  const temCreditoRemoto = creditoRemotoKwh > 0 || custoAssinatura > 0;

  // Chart data - Savings trend
  const savingsTrendData = faturasOrdenadas.slice(0, 6).map((fatura, index, arr) => {
    const economiaDoMes = Number(fatura.economia_liquida_rs) || 0;
    
    let economiaAcumulada = 0;
    for (let i = arr.length - 1; i >= index; i--) {
      economiaAcumulada += Number(arr[i].economia_liquida_rs) || 0;
    }

    return {
      mesRef: fatura.mes_ref,
      economiaMensal: economiaDoMes,
      economiaAcumulada,
    };
  }).reverse();

  // Chart data - Comparison
  const comparisonData = faturasOrdenadas.slice(0, 6).map(fatura => {
    const valorOriginal = Number(fatura.valor_total) + Number(fatura.custo_assinatura_rs || 0);
    const economia = Number(fatura.economia_liquida_rs) || 0;
    return {
      mesRef: fatura.mes_ref,
      original: valorOriginal,
      otimizado: valorOriginal - economia,
    };
  }).reverse();

  // Chart data - Generation (usa dados de geração local da fatura)
  const generationData = faturasOrdenadas.slice(0, 6).map((fatura, index, arr) => {
    const geracao = Number(fatura.geracao_local_total_kwh) || 0;
    // Calcular esperado baseado nos meses anteriores
    const previousFaturas = arr.slice(index + 1, index + 4);
    const esperado = previousFaturas.length > 0
      ? previousFaturas.reduce((acc, f) => acc + (Number(f.geracao_local_total_kwh) || 0), 0) / previousFaturas.length
      : geracao;
    return {
      mesRef: fatura.mes_ref,
      geracao,
      esperado,
    };
  }).reverse();

  // Chart data - Subscription (usa dados de crédito remoto da fatura)
  const subscriptionData = faturasOrdenadas.slice(0, 6).map(fatura => ({
    mesRef: fatura.mes_ref,
    contratada: Number(fatura.credito_assinatura_kwh) || 0,
    alocada: Number(fatura.credito_remoto_kwh) || 0,
  })).reverse();

  // Grupo A values
  const multaDemanda = Number(faturaMesAtualDB?.multa_demanda || 0);
  const multaUltrapassagem = Number(faturaMesAtualDB?.multa_demanda_ultrapassagem || 0);
  const multaUferPonta = Number(faturaMesAtualDB?.multa_ufer_ponta || 0);
  const multaUferForaPonta = Number(faturaMesAtualDB?.multa_ufer_fora_ponta || 0);
  const totalMultas = multaDemanda + multaUltrapassagem + multaUferPonta + multaUferForaPonta;
  const demandaContratadaKw = Number(faturaMesAtualDB?.demanda_contratada_kw || 0);
  const demandaMedidaKw = Number(faturaMesAtualDB?.demanda_medida_kw || 0);
  const demandaContratadaRs = Number(faturaMesAtualDB?.demanda_contratada_rs || 0);
  const demandaGeracaoRs = Number(faturaMesAtualDB?.demanda_geracao_rs || 0);
  const iluminacaoPublica = Number(faturaMesAtualDB?.iluminacao_publica || 0);
  const valorTe = Number(faturaMesAtualDB?.valor_te || 0);
  const valorTusd = Number(faturaMesAtualDB?.valor_tusd || 0);
  const outrosEncargos = Number(faturaMesAtualDB?.outros_encargos || 0);
  const bandeira = faturaMesAtualDB?.bandeiras || '-';

  // Energy distribution for solar
  const energyDistribution = temGeracaoLocal ? [
    { name: 'Autoconsumo', value: autoconsumoTotalKwh, color: 'hsl(var(--chart-optimized))' },
    { name: 'Injeção na Rede', value: injecaoTotalKwh, color: 'hsl(var(--chart-original))' },
  ].filter(item => item.value > 0) : [];

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
    <DashboardLayout title="Visão Executiva" subtitle="Resumo consolidado: Fatura, Solar e Assinatura">
      <div id="dashboard-content" className="space-y-8">
        
        {/* ===== HEADER: Status Geral ===== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Status Geral</h2>
            <p className="text-muted-foreground">Mês de referência: {mesFormatado}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </>
              )}
            </Button>
            <StatusBadge status={kpis.statusGeral} size="lg" />
          </div>
        </div>

        {/* ===== SEÇÃO 1: KPIs Principais ===== */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
                value: -((kpis.custoKwhAntes - kpis.custoKwhDepois) / (kpis.custoKwhAntes || 1) * 100),
                label: 'redução',
                isPositive: true,
              }}
              icon={<Zap className="h-6 w-6" />}
            />
            <KPICard
              title="Fatura do Mês"
              value={formatCurrency(valorTotal)}
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
        </section>

        {/* ===== SEÇÃO 2: Alertas (se houver) ===== */}
        {kpis.alertas.length > 0 && (
          <section>
            <h3 className="section-title flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertas e Recomendações
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {kpis.alertas.slice(0, 4).map((alerta, index) => (
                <AlertCard key={index} alerta={alerta} />
              ))}
            </div>
          </section>
        )}

        {/* ===== SEÇÃO 3: Gráficos Principais ===== */}
        <section>
          <h3 className="section-title">Evolução e Comparativos</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SavingsTrendChart 
              data={savingsTrendData} 
              title="Tendência de Economia"
            />
            <ComparisonChart
              data={comparisonData}
              title="Custo: Original vs Otimizado"
            />
          </div>
        </section>

        {/* ===== SEÇÃO 4: Fatura - Detalhamento ===== */}
        <section>
          <h3 className="section-title flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Fatura do Mês
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KPICard
              title="Valor da Fatura"
              value={formatCurrency(valorTotal)}
              subtitle={custoAssinatura > 0 ? `+ Assinatura: ${formatCurrency(custoAssinatura)}` : undefined}
              icon={<Receipt className="h-6 w-6" />}
            />
            <KPICard
              title="Economia Líquida"
              value={formatCurrency(economiaLiquida)}
              subtitle={`${consumoTotal > 0 ? ((economiaLiquida / valorTotal) * 100).toFixed(1) : 0}% de economia`}
              icon={<TrendingDown className="h-6 w-6" />}
              variant="success"
            />
            <KPICard
              title="Total Multas"
              value={formatCurrency(totalMultas)}
              subtitle={totalMultas > 0 ? "Demanda + UFER" : "Sem multas no mês"}
              icon={<AlertTriangle className="h-6 w-6" />}
              variant={totalMultas > 0 ? 'danger' : 'success'}
            />
            <KPICard
              title="Consumo Total"
              value={`${formatNumber(consumoTotal)} kWh`}
              subtitle={`Ponta: ${formatNumber(pontaKwh)} kWh`}
              icon={<Zap className="h-6 w-6" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DonutChart
              data={[
                { name: 'Energia (TE + TUSD)', value: valorTe + valorTusd, color: 'hsl(var(--primary))' },
                { name: 'Demanda', value: demandaContratadaRs + demandaGeracaoRs, color: 'hsl(var(--accent))' },
                { name: 'Multas', value: totalMultas, color: 'hsl(var(--destructive))' },
                { name: 'Encargos', value: iluminacaoPublica + outrosEncargos, color: 'hsl(var(--muted-foreground))' },
              ].filter(item => item.value > 0)}
              title="Composição da Fatura"
              centerLabel="Total"
              centerValue={formatCurrency(valorTotal)}
            />

            {/* Detalhes Energia */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h4 className="font-semibold text-foreground mb-4">Energia</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Consumo Ponta</span>
                  <span className="font-medium">{formatNumber(pontaKwh)} kWh</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Consumo Fora Ponta</span>
                  <span className="font-medium">{formatNumber(foraPontaKwh)} kWh</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Bandeira Tarifária</span>
                  <span className={`font-medium capitalize ${
                    bandeira === 'verde' ? 'text-success' :
                    bandeira === 'amarela' ? 'text-warning' : 'text-destructive'
                  }`}>{bandeira}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-accent/10 -mx-4 px-4 rounded-lg mt-2">
                  <span className="font-semibold">Custo por kWh</span>
                  <span className="font-bold">R$ {custoKwhBase.toFixed(4)}</span>
                </div>
              </div>
            </div>

            {/* Detalhes Demanda */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h4 className="font-semibold text-foreground mb-4">Demanda</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Demanda Contratada</span>
                  <span className="font-medium">{demandaContratadaKw} kW</span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${
                  demandaMedidaKw > demandaContratadaKw
                    ? 'border-destructive/30 bg-destructive/5 -mx-4 px-4' : 'border-border'
                }`}>
                  <span className="text-muted-foreground">Demanda Medida</span>
                  <span className={`font-medium ${
                    demandaMedidaKw > demandaContratadaKw ? 'text-destructive' : ''
                  }`}>{demandaMedidaKw} kW</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Multa Demanda</span>
                  <span className={`font-medium ${multaDemanda > 0 ? 'text-destructive' : ''}`}>
                    {formatCurrency(multaDemanda)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Multa Ultrapassagem</span>
                  <span className={`font-medium ${multaUltrapassagem > 0 ? 'text-destructive' : ''}`}>
                    {formatCurrency(multaUltrapassagem)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SEÇÃO 5: Solar (se houver geração local) ===== */}
        {temGeracaoLocal && (
          <section>
            <h3 className="section-title flex items-center gap-2">
              <Sun className="h-5 w-5 text-accent" />
              Geração Solar Local
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <KPICard
                title="Geração Total"
                value={`${formatNumber(geracaoLocalKwh)} kWh`}
                icon={<Sun className="h-6 w-6" />}
                variant="success"
              />
              <KPICard
                title="Autoconsumo"
                value={`${formatNumber(autoconsumoTotalKwh)} kWh`}
                subtitle={`${geracaoLocalKwh > 0 ? ((autoconsumoTotalKwh / geracaoLocalKwh) * 100).toFixed(1) : 0}% da geração`}
                icon={<Battery className="h-6 w-6" />}
              />
              <KPICard
                title="Injeção na Rede"
                value={`${formatNumber(injecaoTotalKwh)} kWh`}
                icon={<Plug className="h-6 w-6" />}
              />
              <KPICard
                title="Economia Autoconsumo"
                value={formatCurrency(autoconsumoRs)}
                subtitle="Valor evitado"
                icon={<DollarSign className="h-6 w-6" />}
                variant="success"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <GenerationChart data={generationData} title="Geração Real vs Esperada" />
              </div>
              <DonutChart
                data={energyDistribution}
                title="Distribuição da Energia"
                centerLabel="Total"
                centerValue={`${formatNumber(geracaoLocalKwh / 1000, 1)}k`}
              />
            </div>
          </section>
        )}

        {/* ===== SEÇÃO 6: Créditos Remotos / Assinatura ===== */}
        {temCreditoRemoto && (
          <section>
            <h3 className="section-title flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Créditos Remotos / Assinatura
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <KPICard
                title="Créditos Recebidos"
                value={`${formatNumber(creditoRemotoKwh)} kWh`}
                icon={<Plug className="h-6 w-6" />}
              />
              <KPICard
                title="Valor Compensado"
                value={formatCurrency(creditoRemotoRs)}
                subtitle="Cost Avoidance"
                icon={<TrendingDown className="h-6 w-6" />}
                variant="success"
              />
              <KPICard
                title="Custo da Assinatura"
                value={formatCurrency(custoAssinatura)}
                subtitle="Fatura da usina remota"
                icon={<FileText className="h-6 w-6" />}
              />
              <KPICard
                title="Economia Líquida"
                value={formatCurrency(economiaLiquida)}
                subtitle="Compensado - Custo"
                icon={<DollarSign className="h-6 w-6" />}
                variant={economiaLiquida > 0 ? 'success' : 'warning'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SubscriptionChart data={subscriptionData} title="Energia Contratada vs Alocada" />
              
              <div className="bg-card rounded-xl border border-border p-6">
                <h4 className="font-semibold text-foreground mb-4">Análise da Compensação</h4>
                <div className="space-y-4">
                  {economiaLiquida >= 0 ? (
                    <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                      <p className="font-medium text-success">✓ Economia positiva</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Você está economizando {formatCurrency(economiaLiquida)} com a compensação de créditos.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                      <p className="font-medium text-warning">⚠ Custo maior que benefício</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        O custo da assinatura está {formatCurrency(Math.abs(economiaLiquida))} acima do valor compensado.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Compensado</p>
                      <p className="font-bold text-lg">{formatCurrency(totalCompensado)}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Custo por kWh Remoto</p>
                      <p className="font-bold text-lg">
                        R$ {(creditoRemotoKwh > 0 ? custoAssinatura / creditoRemotoKwh : 0).toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}