import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useUnidadesConsumidoras } from '@/hooks/useUnidadesConsumidoras';
import { useEnergy } from '@/contexts/EnergyContext';
import { Receipt, TrendingDown, AlertTriangle, Zap, Sun, Calculator } from 'lucide-react';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTarifas } from '@/hooks/useTarifas';
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});
const formatNumber = (value: number) => value.toLocaleString('pt-BR', {
  maximumFractionDigits: 0
});
export default function EnergiaFatura() {
  const {
    faturas,
    mesAtual,
    isLoading: faturasLoading
  } = useEnergy();
  const {
    data: ucs
  } = useUnidadesConsumidoras();

  // Faturas ordenadas por mês (mais recente primeiro)
  const faturasOrdenadas = useMemo(() => {
    if (!faturas) return [];
    return [...faturas].sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
  }, [faturas]);

  // Usa o mês selecionado globalmente
  const faturaMesAtualDB = faturasOrdenadas.find(f => f.mes_ref === mesAtual);
  const ucAtual = ucs?.find(uc => uc.id === faturaMesAtualDB?.uc_id);
  const isGrupoA = ucAtual?.grupo_tarifario === 'A';

  // Prepare comparison chart data - usando dados da fatura diretamente
  const comparisonData = useMemo(() => {
    return faturasOrdenadas.slice(0, 6).map(fatura => {
      const autoconsumoRs = Number(fatura.autoconsumo_rs) || 0;
      const creditoRemotoRs = Number(fatura.credito_remoto_compensado_rs) || 0;
      const custoAssinatura = Number(fatura.custo_assinatura_rs) || 0;
      const valorTotal = Number(fatura.valor_total) || 0;

      // Custo original = valor_total + custo_assinatura
      // Custo otimizado = original - economia (autoconsumo + creditos - assinatura)
      const original = valorTotal + custoAssinatura;
      const economiaTotal = autoconsumoRs + creditoRemotoRs - custoAssinatura;
      return {
        mesRef: fatura.mes_ref,
        original: original,
        otimizado: valorTotal // valor pago efetivamente
      };
    }).reverse();
  }, [faturasOrdenadas]);

  // Grupo A - Multas específicas
  const multaDemanda = Number(faturaMesAtualDB?.multa_demanda || 0);
  const multaUltrapassagem = Number(faturaMesAtualDB?.multa_demanda_ultrapassagem || 0);
  const multaUferPonta = Number(faturaMesAtualDB?.multa_ufer_ponta || 0);
  const multaUferForaPonta = Number(faturaMesAtualDB?.multa_ufer_fora_ponta || 0);
  const totalMultas = multaDemanda + multaUltrapassagem + multaUferPonta + multaUferForaPonta;

  // Valores Grupo A
  const energiaPontaRs = Number(faturaMesAtualDB?.energia_ponta_rs || 0);
  const energiaForaPontaRs = Number(faturaMesAtualDB?.energia_fora_ponta_rs || 0);
  const demandaContratadaRs = Number(faturaMesAtualDB?.demanda_contratada_rs || 0);
  const demandaGeracaoRs = Number(faturaMesAtualDB?.demanda_geracao_rs || 0);
  const iluminacaoPublica = Number(faturaMesAtualDB?.iluminacao_publica || 0);

  // Dados GD
  const autoconsumoRs = Number(faturaMesAtualDB?.autoconsumo_rs || 0);
  const creditoRemotoRs = Number(faturaMesAtualDB?.credito_remoto_compensado_rs || 0);
  const economiaLiquida = Number(faturaMesAtualDB?.economia_liquida_rs || 0);
  const custoAssinatura = Number(faturaMesAtualDB?.custo_assinatura_rs || 0);
  const totalCompensado = autoconsumoRs + creditoRemotoRs;

  // Valores básicos
  const pontaKwh = Number(faturaMesAtualDB?.ponta_kwh || 0);
  const foraPontaKwh = Number(faturaMesAtualDB?.fora_ponta_kwh || 0);
  const consumoTotalKwh = Number(faturaMesAtualDB?.consumo_total_kwh || 0);
  const valorTotal = Number(faturaMesAtualDB?.valor_total || 0);
  const valorTe = Number(faturaMesAtualDB?.valor_te || 0);
  const valorTusd = Number(faturaMesAtualDB?.valor_tusd || 0);
  const demandaContratadaKw = Number(faturaMesAtualDB?.demanda_contratada_kw || 0);
  const demandaMedidaKw = Number(faturaMesAtualDB?.demanda_medida_kw || 0);
  const demandaGeracaoKw = Number(faturaMesAtualDB?.demanda_geracao_kw || 0);
  const outrosEncargos = Number(faturaMesAtualDB?.outros_encargos || 0);

  // Custo por kWh
  const custoKwhBase = consumoTotalKwh > 0 ? valorTotal / consumoTotalKwh : 0;
  const economiaPercent = valorTotal > 0 ? economiaLiquida / valorTotal * 100 : 0;

  // Buscar tarifa convencional Verde A4 para simulação
  const { data: tarifaVerdeA4 } = useTarifas(
    ucAtual?.concessionaria || 'Equatorial Goiás',
    'A',
    'THS_VERDE'
  );

  // Tarifas base Verde A4 (valores de referência Equatorial GO - sem impostos)
  const tePontaTarifa = tarifaVerdeA4?.te_ponta_rs_kwh || 0.48489;
  const teFpTarifa = tarifaVerdeA4?.te_fora_ponta_rs_kwh || 0.30387;
  const tusdPontaTarifa = tarifaVerdeA4?.tusd_ponta_rs_kwh || 2.35616;
  const tusdFpTarifa = tarifaVerdeA4?.tusd_fora_ponta_rs_kwh || 0.14961;

  // Impostos (valores típicos Goiás)
  const icmsPercent = tarifaVerdeA4?.icms_percent || 29;
  const pisPercent = tarifaVerdeA4?.pis_percent || 0.76;
  const cofinsPercent = tarifaVerdeA4?.cofins_percent || 3.52;

  // Cálculos por posto - SIMULAÇÃO CONVENCIONAL
  const tePontaRs = pontaKwh * tePontaTarifa;
  const teFpRs = foraPontaKwh * teFpTarifa;
  const tusdPontaRs = pontaKwh * tusdPontaTarifa;
  const tusdFpRs = foraPontaKwh * tusdFpTarifa;

  // Subtotais
  const teTotal = tePontaRs + teFpRs;
  const tusdTotal = tusdPontaRs + tusdFpRs;
  const subtotalSemImpostos = teTotal + tusdTotal;

  // Impostos calculados "por dentro" (sobre base líquida)
  const fatorImpostos = 1 - (icmsPercent + pisPercent + cofinsPercent) / 100;
  const baseComImpostos = subtotalSemImpostos / fatorImpostos;
  const icmsRs = baseComImpostos * (icmsPercent / 100);
  const pisRs = baseComImpostos * (pisPercent / 100);
  const cofinsRs = baseComImpostos * (cofinsPercent / 100);
  const totalImpostos = icmsRs + pisRs + cofinsRs;

  // Total convencional (como se não tivesse GD)
  const totalConvencional = subtotalSemImpostos + totalImpostos;

  // Tarifa média calculada
  const tarifaMediaConvencional = consumoTotalKwh > 0 
    ? totalConvencional / consumoTotalKwh 
    : 0;

  // Economia comparada ao convencional
  const economiaVsConvencional = totalConvencional - valorTotal;
  const economiaVsConvencionalPercent = totalConvencional > 0 
    ? (economiaVsConvencional / totalConvencional) * 100 
    : 0;
  if (faturasLoading) {
    return <DashboardLayout title="Energia & Fatura" subtitle="Análise detalhada da conta de energia">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </DashboardLayout>;
  }
  if (!faturaMesAtualDB) {
    return <DashboardLayout title="Energia & Fatura" subtitle="Análise detalhada da conta de energia">
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma fatura encontrada.</p>
          <p className="text-sm">Lance dados no wizard para visualizar o dashboard.</p>
        </div>
      </DashboardLayout>;
  }
  return <DashboardLayout title="Energia & Fatura" subtitle={`Análise detalhada • ${mesAtual} • ${ucAtual?.numero || ''} • Grupo ${isGrupoA ? 'A' : 'B'}`}>
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Valor da Fatura" value={formatCurrency(valorTotal)} subtitle={custoAssinatura > 0 ? `+ Assinatura: ${formatCurrency(custoAssinatura)}` : ''} icon={<Receipt className="h-6 w-6" />} />

          <KPICard title="Economia Líquida" value={formatCurrency(economiaLiquida)} subtitle={economiaPercent > 0 ? `${economiaPercent.toFixed(1)}% de economia` : 'Sem compensação GD'} icon={<TrendingDown className="h-6 w-6" />} variant={economiaLiquida > 0 ? 'success' : 'default'} />

          <KPICard title="Total Multas" value={formatCurrency(totalMultas)} subtitle={totalMultas > 0 ? "Demanda + UFER" : "Sem multas no mês"} icon={<AlertTriangle className="h-6 w-6" />} variant={totalMultas > 0 ? 'danger' : 'success'} />

          <KPICard title="Consumo Ponta" value={`${formatNumber(pontaKwh)} kWh`} subtitle={consumoTotalKwh > 0 ? `${(pontaKwh / consumoTotalKwh * 100).toFixed(1)}% do total` : ''} icon={<Zap className="h-6 w-6" />} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Composition Chart */}
          <DonutChart data={[{
          name: 'Energia (TE + TUSD)',
          value: valorTe + valorTusd,
          color: 'hsl(var(--primary))'
        }, {
          name: 'Demanda',
          value: demandaContratadaRs + demandaGeracaoRs,
          color: 'hsl(var(--accent))'
        }, {
          name: 'Multas',
          value: totalMultas,
          color: 'hsl(var(--destructive))'
        }, {
          name: 'Encargos',
          value: iluminacaoPublica + outrosEncargos,
          color: 'hsl(var(--muted-foreground))'
        }].filter(item => item.value > 0)} title="Composição da Fatura" centerLabel="Total" centerValue={formatCurrency(valorTotal)} />

          {/* Comparison Chart */}
          <ComparisonChart data={comparisonData} title="Comparativo: Original vs Otimizado" />
        </div>

        {/* Seção: Compensação GD */}
        {totalCompensado > 0 && <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800 p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-green-800 dark:text-green-200 mb-4 flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Compensação de Geração Distribuída
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Autoconsumo</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(autoconsumoRs)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Créditos Remotos</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(creditoRemotoRs)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">(-) Custo Assinatura</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(custoAssinatura)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Economia Líquida</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(economiaLiquida)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800 flex items-center gap-4 text-sm">
              <span className={`px-2 py-1 rounded text-xs font-medium ${faturaMesAtualDB.classificacao_gd_aplicada === 'gd1' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : faturaMesAtualDB.classificacao_gd_aplicada === 'gd2' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                {faturaMesAtualDB.classificacao_gd_aplicada?.toUpperCase() || 'N/A'}
              </span>
              {(faturaMesAtualDB.percentual_fio_b_aplicado ?? 0) > 0 && <span className="text-muted-foreground">
                  Fio B: {faturaMesAtualDB.percentual_fio_b_aplicado}%
                </span>}
            </div>
          </div>}

        {/* Details Grid - Grupo A */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Energia */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Energia - Ponta e Fora Ponta</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Consumo Ponta</span>
                <div className="text-right">
                  <span className="font-medium">{formatNumber(pontaKwh)} kWh</span>
                  {isGrupoA && <span className="text-muted-foreground ml-2">({formatCurrency(energiaPontaRs)})</span>}
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Consumo Fora Ponta</span>
                <div className="text-right">
                  <span className="font-medium">{formatNumber(foraPontaKwh)} kWh</span>
                  {isGrupoA && <span className="text-muted-foreground ml-2">({formatCurrency(energiaForaPontaRs)})</span>}
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Consumo Total</span>
                <span className="font-medium">{formatNumber(consumoTotalKwh)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Tarifa de Energia (TE)</span>
                <span className="font-medium">{formatCurrency(valorTe)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Tarifa de Uso (TUSD)</span>
                <span className="font-medium">{formatCurrency(valorTusd)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Bandeira Tarifária</span>
                <span className={`font-medium capitalize ${faturaMesAtualDB?.bandeiras === 'verde' ? 'text-green-600' : faturaMesAtualDB?.bandeiras === 'amarela' ? 'text-amber-600' : 'text-red-600'}`}>
                  {faturaMesAtualDB?.bandeiras || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Demanda */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Demanda</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Demanda Contratada</span>
                
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${demandaMedidaKw > demandaContratadaKw ? 'border-red-300 bg-red-50 dark:bg-red-950/30 -mx-6 px-6' : 'border-border'}`}>
                <span className={demandaMedidaKw > demandaContratadaKw ? 'text-red-700 dark:text-red-300 font-medium' : 'text-muted-foreground'}>
                  Demanda Medida
                </span>
                <span className={`font-medium ${demandaMedidaKw > demandaContratadaKw ? 'text-red-700 dark:text-red-300' : ''}`}>
                  {demandaMedidaKw} kW
                </span>
              </div>
              {isGrupoA && demandaGeracaoKw > 0 && <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Demanda de Geração</span>
                  <div className="text-right">
                    <span className="font-medium">{demandaGeracaoKw} kW</span>
                    <span className="text-muted-foreground ml-2">({formatCurrency(demandaGeracaoRs)})</span>
                  </div>
                </div>}
              <div className="flex justify-between items-center py-3 bg-accent/10 -mx-6 px-6 rounded-lg mt-4">
                <span className="font-semibold">Custo por kWh</span>
                <span className="font-bold text-lg">R$ {custoKwhBase.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SIMULAÇÃO CONVENCIONAL VERDE A4 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulação Convencional (Verde A4)
          </h3>
          <p className="text-xs text-blue-600 dark:text-blue-300 mb-4">
            Como seria a fatura se o cliente não tivesse GD ou assinatura de usina
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TE por Posto */}
            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Tarifa de Energia (TE)
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <div>
                    <span className="text-muted-foreground">TE Ponta</span>
                    <span className="text-xs ml-2 text-blue-500">
                      {formatNumber(pontaKwh)} kWh × R$ {tePontaTarifa.toFixed(5)}
                    </span>
                  </div>
                  <span className="font-medium">{formatCurrency(tePontaRs)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <div>
                    <span className="text-muted-foreground">TE Fora Ponta</span>
                    <span className="text-xs ml-2 text-blue-500">
                      {formatNumber(foraPontaKwh)} kWh × R$ {teFpTarifa.toFixed(5)}
                    </span>
                  </div>
                  <span className="font-medium">{formatCurrency(teFpRs)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-blue-100/50 dark:bg-blue-900/30 -mx-4 px-4 rounded">
                  <span className="font-semibold text-blue-800 dark:text-blue-200">Subtotal TE</span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">{formatCurrency(teTotal)}</span>
                </div>
              </div>
            </div>

            {/* TUSD por Posto */}
            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Tarifa de Uso do Sistema (TUSD)
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <div>
                    <span className="text-muted-foreground">TUSD Ponta</span>
                    <span className="text-xs ml-2 text-blue-500">
                      {formatNumber(pontaKwh)} kWh × R$ {tusdPontaTarifa.toFixed(5)}
                    </span>
                  </div>
                  <span className="font-medium">{formatCurrency(tusdPontaRs)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <div>
                    <span className="text-muted-foreground">TUSD Fora Ponta</span>
                    <span className="text-xs ml-2 text-blue-500">
                      {formatNumber(foraPontaKwh)} kWh × R$ {tusdFpTarifa.toFixed(5)}
                    </span>
                  </div>
                  <span className="font-medium">{formatCurrency(tusdFpRs)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-blue-100/50 dark:bg-blue-900/30 -mx-4 px-4 rounded">
                  <span className="font-semibold text-blue-800 dark:text-blue-200">Subtotal TUSD</span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">{formatCurrency(tusdTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Impostos e Totais */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Impostos */}
            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Impostos e Encargos
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <span className="text-muted-foreground">ICMS ({icmsPercent}%)</span>
                  <span className="font-medium">{formatCurrency(icmsRs)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <span className="text-muted-foreground">PIS ({pisPercent}%)</span>
                  <span className="font-medium">{formatCurrency(pisRs)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <span className="text-muted-foreground">COFINS ({cofinsPercent}%)</span>
                  <span className="font-medium">{formatCurrency(cofinsRs)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-blue-100/50 dark:bg-blue-900/30 -mx-4 px-4 rounded">
                  <span className="font-semibold text-blue-800 dark:text-blue-200">Total Impostos</span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">{formatCurrency(totalImpostos)}</span>
                </div>
              </div>
            </div>

            {/* Resumo Final */}
            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Resumo Comparativo
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <span className="text-muted-foreground">Subtotal (TE + TUSD)</span>
                  <span className="font-medium">{formatCurrency(subtotalSemImpostos)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <span className="text-muted-foreground">Impostos</span>
                  <span className="font-medium">{formatCurrency(totalImpostos)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-blue-200/70 dark:bg-blue-800/50 -mx-4 px-4 rounded font-bold">
                  <span className="text-blue-900 dark:text-blue-100">Total Convencional</span>
                  <span className="text-blue-900 dark:text-blue-100">{formatCurrency(totalConvencional)}</span>
                </div>
                <div className="flex justify-between items-center py-1 text-xs text-blue-600 dark:text-blue-400">
                  <span>Tarifa média</span>
                  <span>R$ {tarifaMediaConvencional.toFixed(5)}/kWh</span>
                </div>
              </div>
            </div>
          </div>

          {/* Economia */}
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Valor Convencional</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalConvencional)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Real Pago</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(valorTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Economia com GD</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(economiaVsConvencional)}</p>
                <p className="text-xs text-green-500">({economiaVsConvencionalPercent.toFixed(1)}%)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Multas e Encargos - Grupo A */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Multas */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Multas e Penalidades</h3>
            <div className="space-y-4">
              {multaDemanda > 0 && <div className="flex justify-between items-center py-2 border-b border-red-300 bg-red-50 dark:bg-red-950/30 -mx-6 px-6">
                  <span className="text-red-700 dark:text-red-300 font-medium">Multa por Demanda</span>
                  <span className="text-red-700 dark:text-red-300 font-bold">{formatCurrency(multaDemanda)}</span>
                </div>}
              {multaUltrapassagem > 0 && <div className="flex justify-between items-center py-2 border-b border-red-300 bg-red-50 dark:bg-red-950/30 -mx-6 px-6">
                  <span className="text-red-700 dark:text-red-300 font-medium">Ultrapassagem de Demanda</span>
                  <span className="text-red-700 dark:text-red-300 font-bold">{formatCurrency(multaUltrapassagem)}</span>
                </div>}
              {multaUferPonta > 0 && <div className="flex justify-between items-center py-2 border-b border-amber-300 bg-amber-50 dark:bg-amber-950/30 -mx-6 px-6">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">UFER Ponta (Reativo)</span>
                  <span className="text-amber-700 dark:text-amber-300 font-bold">{formatCurrency(multaUferPonta)}</span>
                </div>}
              {multaUferForaPonta > 0 && <div className="flex justify-between items-center py-2 border-b border-amber-300 bg-amber-50 dark:bg-amber-950/30 -mx-6 px-6">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">UFER Fora Ponta (Reativo)</span>
                  
                </div>}
              {totalMultas === 0 && <div className="flex items-center justify-center py-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <span className="text-green-700 dark:text-green-300 font-medium">✓ Sem multas neste mês</span>
                </div>}
              {totalMultas > 0 && <div className="flex justify-between items-center py-3 bg-red-100 dark:bg-red-950/50 -mx-6 px-6 rounded-lg mt-4">
                  <span className="font-semibold text-red-700 dark:text-red-300">Total de Multas</span>
                  <span className="font-bold text-lg text-red-700 dark:text-red-300">{formatCurrency(totalMultas)}</span>
                </div>}
            </div>
          </div>

          {/* Outros Encargos */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Outros Encargos</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Iluminação Pública (CIP)</span>
                <span className="font-medium">{formatCurrency(iluminacaoPublica)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Outros Encargos</span>
                <span className="font-medium">{formatCurrency(outrosEncargos)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-primary/5 -mx-6 px-6 rounded-lg mt-4">
                <span className="font-semibold">Total da Fatura</span>
                <span className="font-bold text-lg">{formatCurrency(valorTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>;
}