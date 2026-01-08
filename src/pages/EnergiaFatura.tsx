import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { useEnergy } from '@/contexts/EnergyContext';
import { formatCurrency, formatNumber, getMonthName } from '@/data/mockData';
import { calcularKPIsMensais } from '@/lib/calculations';
import { FaturaMensal, GeracaoMensal, AssinaturaMensal } from '@/types/energy';
import { Receipt, TrendingDown, AlertTriangle, Zap } from 'lucide-react';

// Helper function to convert DB types to calculation types
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

export default function EnergiaFatura() {
  const { faturas, geracoes, assinaturas, mesAtual } = useEnergy();

  const faturaMesAtualDB = faturas.find(f => f.mes_ref === mesAtual);
  const geracaoMesAtualDB = geracoes.find(g => g.mes_ref === mesAtual);
  const assinaturaMesAtualDB = assinaturas.find(a => a.mes_ref === mesAtual);

  const faturaMesAtual = faturaMesAtualDB ? convertFatura(faturaMesAtualDB) : null;
  const geracaoMesAtual = geracaoMesAtualDB ? convertGeracao(geracaoMesAtualDB) : null;
  const assinaturaMesAtual = assinaturaMesAtualDB ? convertAssinatura(assinaturaMesAtualDB) : null;

  const kpisMensais = faturaMesAtual && geracaoMesAtual && assinaturaMesAtual
    ? calcularKPIsMensais(faturaMesAtual, geracaoMesAtual, assinaturaMesAtual)
    : null;

  // Prepare comparison chart data
  const comparisonData = faturas
    .slice(0, 6)
    .map(fatura => {
      const geracao = geracoes.find(g => g.mes_ref === fatura.mes_ref);
      const assinatura = assinaturas.find(a => a.mes_ref === fatura.mes_ref);
      const kpis = geracao && assinatura
        ? calcularKPIsMensais(convertFatura(fatura), convertGeracao(geracao), convertAssinatura(assinatura))
        : null;

      return {
        mesRef: fatura.mes_ref,
        original: Number(fatura.valor_total) + Number(assinatura?.valor_assinatura || 0),
        otimizado: (Number(fatura.valor_total) + Number(assinatura?.valor_assinatura || 0)) - (kpis?.economiaMensalRs || 0),
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
            subtitle={`${kpisMensais?.economiaMensalPercent.toFixed(1) || 0}% de economia`}
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
                  {faturaMesAtual?.bandeiras || '-'}
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
                <span className="font-medium">{faturaMesAtual?.demandaContratadaKw || 0} kW</span>
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
                }`}>{faturaMesAtual?.demandaMedidaKw || 0} kW</span>
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
