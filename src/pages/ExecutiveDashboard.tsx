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
import { calcularKPIsMensais } from '@/lib/calculations';
import { FaturaMensal, GeracaoMensal, AssinaturaMensal } from '@/types/energy';
import { 
  DollarSign, TrendingUp, Zap, Activity, Sun, Battery, Plug, 
  Receipt, TrendingDown, AlertTriangle, FileText, Percent, AlertCircle,
  Download, Loader2
} from 'lucide-react';

// Helper functions
function convertFatura(f: any): FaturaMensal {
  return {
    id: f.id,
    ucId: f.uc_id,
    mesRef: f.mes_ref,
    consumoTotalKwh: Number(f.consumo_total_kwh),
    pontaKwh: Number(f.ponta_kwh),
    foraPontaKwh: Number(f.fora_ponta_kwh),
    demandaContratadaKw: Number(f.demanda_contratada_kw),
    demandaMedidaKw: Number(f.demanda_medida_kw),
    valorTotal: Number(f.valor_total),
    valorTe: Number(f.valor_te),
    valorTusd: Number(f.valor_tusd),
    bandeiras: f.bandeiras as 'verde' | 'amarela' | 'vermelha1' | 'vermelha2',
    multaDemanda: Number(f.multa_demanda),
    multaReativo: Number(f.multa_reativo),
    outrosEncargos: Number(f.outros_encargos),
  };
}

function convertGeracao(g: any): GeracaoMensal {
  return {
    id: g.id,
    ucId: g.uc_id,
    mesRef: g.mes_ref,
    geracaoTotalKwh: Number(g.geracao_total_kwh),
    autoconsumoKwh: Number(g.autoconsumo_kwh),
    injecaoKwh: Number(g.injecao_kwh),
    compensacaoKwh: Number(g.compensacao_kwh),
    disponibilidadePercent: Number(g.disponibilidade_percent),
    perdasEstimadasKwh: Number(g.perdas_estimadas_kwh),
  };
}

function convertAssinatura(a: any): AssinaturaMensal {
  return {
    id: a.id,
    ucId: a.uc_id,
    mesRef: a.mes_ref,
    ucRemota: a.uc_remota,
    energiaContratadaKwh: Number(a.energia_contratada_kwh),
    energiaAlocadaKwh: Number(a.energia_alocada_kwh),
    valorAssinatura: Number(a.valor_assinatura),
    economiaPrometidaPercent: Number(a.economia_prometida_percent),
  };
}

export default function ExecutiveDashboard() {
  const { kpis, faturas, geracoes, assinaturas, mesAtual, isLoading } = useEnergy();
  const { exportToPDF, isExporting } = useExportPDF();

  // Format month for display
  const mesFormatado = (() => {
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

  // Current month data
  const faturaMesAtualDB = faturas.find(f => f.mes_ref === mesAtual);
  const geracaoMesAtualDB = geracoes.find(g => g.mes_ref === mesAtual);
  const assinaturaMesAtualDB = assinaturas.find(a => a.mes_ref === mesAtual);

  const faturaMesAtual = faturaMesAtualDB ? convertFatura(faturaMesAtualDB) : null;
  const geracaoMesAtual = geracaoMesAtualDB ? convertGeracao(geracaoMesAtualDB) : null;
  const assinaturaMesAtual = assinaturaMesAtualDB ? convertAssinatura(assinaturaMesAtualDB) : null;

  const kpisMensais = faturaMesAtual && geracaoMesAtual && assinaturaMesAtual
    ? calcularKPIsMensais(faturaMesAtual, geracaoMesAtual, assinaturaMesAtual)
    : null;

  // Trend calculation
  const faturasOrdenadas = [...faturas].sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
  const indexMesAtual = faturasOrdenadas.findIndex(f => f.mes_ref === mesAtual);
  const faturaMesAnteriorDB = indexMesAtual >= 0 && indexMesAtual < faturasOrdenadas.length - 1 
    ? faturasOrdenadas[indexMesAtual + 1] 
    : null;

  const variacao = faturaMesAnteriorDB 
    ? ((faturaMesAtual?.valorTotal || 0) - Number(faturaMesAnteriorDB.valor_total)) / Number(faturaMesAnteriorDB.valor_total) * 100
    : 0;

  // Solar calculations
  const geracoesOrdenadas = [...geracoes].sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
  const indexGeracaoAtual = geracoesOrdenadas.findIndex(g => g.mes_ref === mesAtual);
  const geracoesAnteriores = geracoesOrdenadas.slice(indexGeracaoAtual + 1, indexGeracaoAtual + 4);
  const mediaEsperada = geracoesAnteriores.length > 0
    ? geracoesAnteriores.reduce((acc, g) => acc + Number(g.geracao_total_kwh), 0) / geracoesAnteriores.length
    : geracaoMesAtual?.geracaoTotalKwh || 0;

  const performancePercent = geracaoMesAtual && mediaEsperada > 0
    ? ((geracaoMesAtual.geracaoTotalKwh / mediaEsperada) * 100)
    : 100;

  // Chart data
  const generationData = geracoes.slice(0, 6).map((geracao, index, arr) => {
    const previousGeracoes = arr.slice(index + 1, index + 4);
    const esperado = previousGeracoes.length > 0
      ? previousGeracoes.reduce((acc, g) => acc + Number(g.geracao_total_kwh), 0) / previousGeracoes.length
      : Number(geracao.geracao_total_kwh);
    return {
      mesRef: geracao.mes_ref,
      geracao: Number(geracao.geracao_total_kwh),
      esperado: esperado,
    };
  }).reverse();

  const comparisonData = faturas.slice(0, 6).map(fatura => {
    const geracao = geracoes.find(g => g.mes_ref === fatura.mes_ref);
    const assinatura = assinaturas.find(a => a.mes_ref === fatura.mes_ref);
    const kpisCalc = geracao && assinatura
      ? calcularKPIsMensais(convertFatura(fatura), convertGeracao(geracao), convertAssinatura(assinatura))
      : null;
    return {
      mesRef: fatura.mes_ref,
      original: Number(fatura.valor_total) + Number(assinatura?.valor_assinatura || 0),
      otimizado: (Number(fatura.valor_total) + Number(assinatura?.valor_assinatura || 0)) - (kpisCalc?.economiaMensalRs || 0),
    };
  }).reverse();

  const subscriptionData = assinaturas.slice(0, 6).map(assinatura => ({
    mesRef: assinatura.mes_ref,
    contratada: Number(assinatura.energia_contratada_kwh),
    alocada: Number(assinatura.energia_alocada_kwh),
  })).reverse();

  // Savings trend data
  const savingsTrendData = faturas.slice(0, 6).map((fatura, index, arr) => {
    const geracao = geracoes.find(g => g.mes_ref === fatura.mes_ref);
    const assinatura = assinaturas.find(a => a.mes_ref === fatura.mes_ref);
    const kpisCalc = geracao && assinatura
      ? calcularKPIsMensais(convertFatura(fatura), convertGeracao(geracao), convertAssinatura(assinatura))
      : null;
    
    let economiaAcumulada = 0;
    for (let i = arr.length - 1; i >= index; i--) {
      const f = arr[i];
      const g = geracoes.find(gf => gf.mes_ref === f.mes_ref);
      const a = assinaturas.find(af => af.mes_ref === f.mes_ref);
      if (g && a) {
        const kpis = calcularKPIsMensais(convertFatura(f), convertGeracao(g), convertAssinatura(a));
        economiaAcumulada += kpis.economiaMensalRs;
      }
    }

    return {
      mesRef: fatura.mes_ref,
      economiaMensal: kpisCalc?.economiaMensalRs || 0,
      economiaAcumulada,
    };
  }).reverse();

  // Subscription calculations
  const utilizacao = assinaturaMesAtual
    ? (assinaturaMesAtual.energiaAlocadaKwh / assinaturaMesAtual.energiaContratadaKwh) * 100
    : 0;

  const economiaRealPercent = kpisMensais 
    ? (kpisMensais.economiaMensalRs / (faturaMesAtual?.valorTotal || 1)) * 100
    : 0;
  const economiaPrometida = assinaturaMesAtual?.economiaPrometidaPercent || 0;
  const diferencaEconomia = economiaRealPercent - economiaPrometida;

  // Grupo A values
  const multaDemanda = Number(faturaMesAtualDB?.multa_demanda || 0);
  const multaUltrapassagem = Number(faturaMesAtualDB?.multa_demanda_ultrapassagem || 0);
  const multaUferPonta = Number(faturaMesAtualDB?.multa_ufer_ponta || 0);
  const multaUferForaPonta = Number(faturaMesAtualDB?.multa_ufer_fora_ponta || 0);
  const totalMultas = multaDemanda + multaUltrapassagem + multaUferPonta + multaUferForaPonta;
  const demandaContratadaRs = Number(faturaMesAtualDB?.demanda_contratada_rs || 0);
  const demandaGeracaoRs = Number(faturaMesAtualDB?.demanda_geracao_rs || 0);
  const iluminacaoPublica = Number(faturaMesAtualDB?.iluminacao_publica || 0);

  // Energy distribution for solar
  const energyDistribution = geracaoMesAtual ? [
    { name: 'Autoconsumo', value: geracaoMesAtual.autoconsumoKwh, color: 'hsl(var(--chart-optimized))' },
    { name: 'Injeção na Rede', value: geracaoMesAtual.injecaoKwh, color: 'hsl(var(--chart-original))' },
    { name: 'Perdas', value: geracaoMesAtual.perdasEstimadasKwh, color: 'hsl(var(--muted-foreground))' },
  ] : [];

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
              value={formatCurrency(faturaMesAtual?.valorTotal || 0)}
              subtitle={`+ Assinatura: ${formatCurrency(assinaturaMesAtual?.valorAssinatura || 0)}`}
              icon={<Receipt className="h-6 w-6" />}
            />
            <KPICard
              title="Economia Mensal"
              value={formatCurrency(kpisMensais?.economiaMensalRs || 0)}
              subtitle={`${kpisMensais?.economiaMensalPercent.toFixed(1) || 0}% de economia`}
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
              value={`${formatNumber(faturaMesAtual?.consumoTotalKwh || 0)} kWh`}
              subtitle={`Ponta: ${formatNumber(faturaMesAtual?.pontaKwh || 0)} kWh`}
              icon={<Zap className="h-6 w-6" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DonutChart
              data={[
                { name: 'Energia (TE + TUSD)', value: (faturaMesAtual?.valorTe || 0) + (faturaMesAtual?.valorTusd || 0), color: 'hsl(var(--primary))' },
                { name: 'Demanda', value: demandaContratadaRs + demandaGeracaoRs, color: 'hsl(var(--accent))' },
                { name: 'Multas', value: totalMultas, color: 'hsl(var(--destructive))' },
                { name: 'Encargos', value: iluminacaoPublica + (faturaMesAtual?.outrosEncargos || 0), color: 'hsl(var(--muted-foreground))' },
              ].filter(item => item.value > 0)}
              title="Composição da Fatura"
              centerLabel="Total"
              centerValue={formatCurrency(faturaMesAtual?.valorTotal || 0)}
            />

            {/* Detalhes Energia e Demanda */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h4 className="font-semibold text-foreground mb-4">Energia</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Consumo Ponta</span>
                  <span className="font-medium">{formatNumber(faturaMesAtual?.pontaKwh || 0)} kWh</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Consumo Fora Ponta</span>
                  <span className="font-medium">{formatNumber(faturaMesAtual?.foraPontaKwh || 0)} kWh</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Bandeira Tarifária</span>
                  <span className={`font-medium capitalize ${
                    faturaMesAtual?.bandeiras === 'verde' ? 'text-success' :
                    faturaMesAtual?.bandeiras === 'amarela' ? 'text-warning' : 'text-destructive'
                  }`}>{faturaMesAtual?.bandeiras || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-accent/10 -mx-4 px-4 rounded-lg mt-2">
                  <span className="font-semibold">Custo por kWh</span>
                  <span className="font-bold">R$ {kpisMensais?.custoKwhBase.toFixed(4) || '0.0000'}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h4 className="font-semibold text-foreground mb-4">Demanda</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Demanda Contratada</span>
                  <span className="font-medium">{faturaMesAtual?.demandaContratadaKw || 0} kW</span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${
                  (faturaMesAtual?.demandaMedidaKw || 0) > (faturaMesAtual?.demandaContratadaKw || 0)
                    ? 'border-destructive/30 bg-destructive/5 -mx-4 px-4' : 'border-border'
                }`}>
                  <span className="text-muted-foreground">Demanda Medida</span>
                  <span className={`font-medium ${
                    (faturaMesAtual?.demandaMedidaKw || 0) > (faturaMesAtual?.demandaContratadaKw || 0) ? 'text-destructive' : ''
                  }`}>{faturaMesAtual?.demandaMedidaKw || 0} kW</span>
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

        {/* ===== SEÇÃO 5: Solar ===== */}
        {geracaoMesAtual && (
          <section>
            <h3 className="section-title flex items-center gap-2">
              <Sun className="h-5 w-5 text-accent" />
              Geração Solar
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
                subtitle={`Compensado: ${formatNumber(geracaoMesAtual.compensacaoKwh)} kWh`}
                icon={<Plug className="h-6 w-6" />}
              />
              <KPICard
                title="Disponibilidade"
                value={formatPercent(geracaoMesAtual.disponibilidadePercent)}
                subtitle="Performance do sistema"
                icon={<Activity className="h-6 w-6" />}
                variant={geracaoMesAtual.disponibilidadePercent >= 95 ? 'success' : 'warning'}
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
                centerValue={`${formatNumber(geracaoMesAtual.geracaoTotalKwh / 1000, 1)}k`}
              />
            </div>
          </section>
        )}

        {/* ===== SEÇÃO 6: Assinatura ===== */}
        {assinaturaMesAtual && (
          <section>
            <h3 className="section-title flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Assinatura de Energia
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <KPICard
                title="Valor da Assinatura"
                value={formatCurrency(assinaturaMesAtual.valorAssinatura)}
                subtitle={`UC Remota: ${assinaturaMesAtual.ucRemota}`}
                icon={<FileText className="h-6 w-6" />}
              />
              <KPICard
                title="Utilização"
                value={formatPercent(utilizacao)}
                subtitle={`${formatNumber(assinaturaMesAtual.energiaAlocadaKwh)} de ${formatNumber(assinaturaMesAtual.energiaContratadaKwh)} kWh`}
                icon={<Percent className="h-6 w-6" />}
                variant={utilizacao >= 90 ? 'success' : utilizacao >= 70 ? 'warning' : 'danger'}
              />
              <KPICard
                title="Economia Real"
                value={formatPercent(economiaRealPercent)}
                subtitle={`Prometida: ${formatPercent(economiaPrometida)}`}
                trend={{
                  value: diferencaEconomia,
                  label: 'vs prometido',
                  isPositive: diferencaEconomia >= 0,
                }}
                icon={<TrendingUp className="h-6 w-6" />}
                variant={diferencaEconomia >= 0 ? 'success' : 'warning'}
              />
              <KPICard
                title="Perda de Assinatura"
                value={formatCurrency(kpisMensais?.custoPerdaAssinatura || 0)}
                subtitle={`${formatNumber(kpisMensais?.perdaAssinatura || 0)} kWh não utilizados`}
                icon={<AlertCircle className="h-6 w-6" />}
                variant={(kpisMensais?.perdaAssinatura || 0) > 0 ? 'warning' : 'success'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SubscriptionChart data={subscriptionData} title="Energia Contratada vs Alocada" />
              
              <div className="bg-card rounded-xl border border-border p-6">
                <h4 className="font-semibold text-foreground mb-4">Análise da Assinatura</h4>
                <div className="space-y-4">
                  {diferencaEconomia >= 0 ? (
                    <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                      <p className="font-medium text-success">✓ Economia acima do prometido</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Você está economizando {formatPercent(Math.abs(diferencaEconomia))} a mais do que o previsto.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                      <p className="font-medium text-warning">⚠ Economia abaixo do prometido</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        A economia está {formatPercent(Math.abs(diferencaEconomia))} abaixo do previsto.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Energia Contratada</p>
                      <p className="font-bold text-lg">{formatNumber(assinaturaMesAtual.energiaContratadaKwh)} kWh</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Custo por kWh</p>
                      <p className="font-bold text-lg">
                        R$ {(assinaturaMesAtual.valorAssinatura / (assinaturaMesAtual.energiaContratadaKwh || 1)).toFixed(4)}
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
