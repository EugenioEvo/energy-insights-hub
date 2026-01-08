import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { SubscriptionChart } from '@/components/charts/SubscriptionChart';
import { useEnergy } from '@/contexts/EnergyContext';
import { formatCurrency, formatNumber, formatPercent } from '@/data/mockData';
import { calcularKPIsMensais } from '@/lib/calculations';
import { FaturaMensal, GeracaoMensal, AssinaturaMensal } from '@/types/energy';
import { FileText, TrendingUp, AlertCircle, Percent } from 'lucide-react';

export default function Assinatura() {
  const { faturas, geracoes, assinaturas, mesAtual } = useEnergy();

  const faturaMesAtual = faturas.find(f => f.mes_ref === mesAtual);
  const geracaoMesAtual = geracoes.find(g => g.mes_ref === mesAtual);
  const assinaturaMesAtual = assinaturas.find(a => a.mes_ref === mesAtual);

  // Convert to calculation types
  const faturaMesAtualCalc: FaturaMensal | null = faturaMesAtual ? {
    id: faturaMesAtual.id,
    ucId: faturaMesAtual.uc_id,
    mesRef: faturaMesAtual.mes_ref,
    consumoTotalKwh: Number(faturaMesAtual.consumo_total_kwh),
    pontaKwh: Number(faturaMesAtual.ponta_kwh),
    foraPontaKwh: Number(faturaMesAtual.fora_ponta_kwh),
    demandaContratadaKw: Number(faturaMesAtual.demanda_contratada_kw),
    demandaMedidaKw: Number(faturaMesAtual.demanda_medida_kw),
    valorTotal: Number(faturaMesAtual.valor_total),
    valorTe: Number(faturaMesAtual.valor_te),
    valorTusd: Number(faturaMesAtual.valor_tusd),
    bandeiras: faturaMesAtual.bandeiras as 'verde' | 'amarela' | 'vermelha1' | 'vermelha2',
    multaDemanda: Number(faturaMesAtual.multa_demanda),
    multaReativo: Number(faturaMesAtual.multa_reativo),
    outrosEncargos: Number(faturaMesAtual.outros_encargos),
  } : null;

  const geracaoMesAtualCalc: GeracaoMensal | null = geracaoMesAtual ? {
    id: geracaoMesAtual.id,
    ucId: geracaoMesAtual.uc_id,
    mesRef: geracaoMesAtual.mes_ref,
    geracaoTotalKwh: Number(geracaoMesAtual.geracao_total_kwh),
    autoconsumoKwh: Number(geracaoMesAtual.autoconsumo_kwh),
    injecaoKwh: Number(geracaoMesAtual.injecao_kwh),
    compensacaoKwh: Number(geracaoMesAtual.compensacao_kwh),
    disponibilidadePercent: Number(geracaoMesAtual.disponibilidade_percent),
    perdasEstimadasKwh: Number(geracaoMesAtual.perdas_estimadas_kwh),
  } : null;

  const assinaturaMesAtualCalc: AssinaturaMensal | null = assinaturaMesAtual ? {
    id: assinaturaMesAtual.id,
    ucId: assinaturaMesAtual.uc_id,
    mesRef: assinaturaMesAtual.mes_ref,
    ucRemota: assinaturaMesAtual.uc_remota,
    energiaContratadaKwh: Number(assinaturaMesAtual.energia_contratada_kwh),
    energiaAlocadaKwh: Number(assinaturaMesAtual.energia_alocada_kwh),
    valorAssinatura: Number(assinaturaMesAtual.valor_assinatura),
    economiaPrometidaPercent: Number(assinaturaMesAtual.economia_prometida_percent),
  } : null;

  const kpisMensais = faturaMesAtualCalc && geracaoMesAtualCalc && assinaturaMesAtualCalc
    ? calcularKPIsMensais(faturaMesAtualCalc, geracaoMesAtualCalc, assinaturaMesAtualCalc)
    : null;

  // Prepare subscription chart data
  const subscriptionData = assinaturas
    .slice(0, 6)
    .map(assinatura => ({
      mesRef: assinatura.mes_ref,
      contratada: Number(assinatura.energia_contratada_kwh),
      alocada: Number(assinatura.energia_alocada_kwh),
    }))
    .reverse();

  const utilizacao = assinaturaMesAtualCalc
    ? (assinaturaMesAtualCalc.energiaAlocadaKwh / assinaturaMesAtualCalc.energiaContratadaKwh) * 100
    : 0;

  // Check for recurring underutilization
  const ultimas3Assinaturas = assinaturas.slice(0, 3);
  const mediaUtilizacao = ultimas3Assinaturas.length > 0
    ? ultimas3Assinaturas.reduce((acc, a) => 
        acc + (Number(a.energia_alocada_kwh) / Number(a.energia_contratada_kwh)), 0) / ultimas3Assinaturas.length * 100
    : 100;

  const subutilizacaoRecorrente = mediaUtilizacao < 85;

  // Calculate real vs promised economy
  const economiaRealPercent = kpisMensais 
    ? (kpisMensais.economiaMensalRs / (faturaMesAtualCalc?.valorTotal || 1)) * 100
    : 0;
  
  const economiaPrometida = assinaturaMesAtualCalc?.economiaPrometidaPercent || 0;
  const diferencaEconomia = economiaRealPercent - economiaPrometida;

  return (
    <DashboardLayout title="Assinatura" subtitle="Gestão do contrato de energia por assinatura">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Valor da Assinatura"
            value={formatCurrency(assinaturaMesAtualCalc?.valorAssinatura || 0)}
            subtitle={`UC Remota: ${assinaturaMesAtualCalc?.ucRemota || '-'}`}
            icon={<FileText className="h-6 w-6" />}
          />

          <KPICard
            title="Utilização"
            value={formatPercent(utilizacao)}
            subtitle={`${formatNumber(assinaturaMesAtualCalc?.energiaAlocadaKwh || 0)} de ${formatNumber(assinaturaMesAtualCalc?.energiaContratadaKwh || 0)} kWh`}
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

        {/* Subscription Chart */}
        <SubscriptionChart
          data={subscriptionData}
          title="Energia Contratada vs Alocada"
        />

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contract Details */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="section-title">Detalhes do Contrato</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">UC Remota</span>
                <span className="font-medium">{assinaturaMesAtualCalc?.ucRemota || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Energia Contratada</span>
                <span className="font-medium">{formatNumber(assinaturaMesAtualCalc?.energiaContratadaKwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Energia Alocada</span>
                <span className="font-medium">{formatNumber(assinaturaMesAtualCalc?.energiaAlocadaKwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Energia Não Utilizada</span>
                <span className={`font-medium ${(kpisMensais?.perdaAssinatura || 0) > 0 ? 'text-warning' : ''}`}>
                  {formatNumber(kpisMensais?.perdaAssinatura || 0)} kWh
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Economia Prometida</span>
                <span className="font-medium">{formatPercent(assinaturaMesAtualCalc?.economiaPrometidaPercent || 0)}</span>
              </div>
              <div className={`flex justify-between items-center py-3 -mx-6 px-6 rounded-lg mt-4 ${
                utilizacao >= 90 ? 'bg-success/10' : 'bg-warning/10'
              }`}>
                <span className="font-semibold">Taxa de Utilização</span>
                <span className="font-bold text-lg">{formatPercent(utilizacao)}</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="section-title">Análise e Recomendações</h3>
            <div className="space-y-4">
              {subutilizacaoRecorrente ? (
                <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="font-medium text-warning">⚠ Recomendação: Ajustar Contrato</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Subutilização recorrente detectada (média de {formatPercent(mediaUtilizacao)} nos últimos 3 meses).
                    Considere renegociar o volume contratado para otimizar custos.
                  </p>
                  <div className="mt-3 p-3 bg-card rounded border border-border">
                    <p className="text-sm font-medium">Sugestão de novo volume:</p>
                    <p className="text-lg font-bold text-accent">
                      {formatNumber(Math.round((assinaturaMesAtualCalc?.energiaContratadaKwh || 0) * (mediaUtilizacao / 100) * 1.05))} kWh
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Baseado na média de utilização + 5% de margem de segurança
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="font-medium text-success">✓ Contrato bem dimensionado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A utilização está dentro do esperado. O volume contratado está adequado ao consumo.
                  </p>
                </div>
              )}

              {diferencaEconomia >= 0 ? (
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="font-medium text-success">✓ Economia acima do prometido</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você está economizando {formatPercent(Math.abs(diferencaEconomia))} a mais do que o previsto no contrato.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="font-medium text-warning">⚠ Economia abaixo do prometido</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A economia está {formatPercent(Math.abs(diferencaEconomia))} abaixo do previsto. 
                    Verifique condições do contrato ou alterações no perfil de consumo.
                  </p>
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Custo da Energia por Assinatura</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Custo por kWh da assinatura: 
                  <span className="font-medium text-foreground ml-1">
                    R$ {((assinaturaMesAtualCalc?.valorAssinatura || 0) / (assinaturaMesAtualCalc?.energiaContratadaKwh || 1)).toFixed(4)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Historical Utilization */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="section-title">Histórico de Utilização</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th className="text-right">Contratada</th>
                  <th className="text-right">Alocada</th>
                  <th className="text-right">Não Utilizada</th>
                  <th className="text-right">Utilização</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {assinaturas.slice(0, 6).map((assinatura) => {
                  const util = (Number(assinatura.energia_alocada_kwh) / Number(assinatura.energia_contratada_kwh)) * 100;
                  const naoUtilizada = Number(assinatura.energia_contratada_kwh) - Number(assinatura.energia_alocada_kwh);
                  return (
                    <tr key={assinatura.id}>
                      <td className="font-medium">{assinatura.mes_ref}</td>
                      <td className="text-right">{formatNumber(Number(assinatura.energia_contratada_kwh))} kWh</td>
                      <td className="text-right">{formatNumber(Number(assinatura.energia_alocada_kwh))} kWh</td>
                      <td className={`text-right ${naoUtilizada > 0 ? 'text-warning' : ''}`}>
                        {formatNumber(naoUtilizada)} kWh
                      </td>
                      <td className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          util >= 90 ? 'bg-success/10 text-success' :
                          util >= 70 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {formatPercent(util)}
                        </span>
                      </td>
                      <td className="text-right font-medium">{formatCurrency(Number(assinatura.valor_assinatura))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
