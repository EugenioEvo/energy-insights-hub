import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { SubscriptionChart } from '@/components/charts/SubscriptionChart';
import { useFaturas } from '@/hooks/useFaturas';
import { useUnidadesConsumidoras } from '@/hooks/useUnidadesConsumidoras';
import { FileText, TrendingUp, AlertCircle, Zap, Sun, Building2, Receipt, Percent } from 'lucide-react';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (value: number) => 
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatNumber = (value: number) => 
  value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const formatPercent = (value: number) => 
  value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

export default function Assinatura() {
  const { data: faturas, isLoading: faturasLoading } = useFaturas();
  const { data: ucs } = useUnidadesConsumidoras();

  // Faturas fechadas ordenadas por mês
  const faturasFechadas = useMemo(() => {
    if (!faturas) return [];
    return faturas
      .filter(f => f.status === 'fechado')
      .sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
  }, [faturas]);

  const faturaAtual = faturasFechadas[0];
  const ucAtual = ucs?.find(uc => uc.id === faturaAtual?.uc_id);
  const isGrupoA = ucAtual?.grupo_tarifario === 'A';

  // Cálculos agregados dos últimos 6 meses
  const resumo = useMemo(() => {
    const ultimas6 = faturasFechadas.slice(0, 6);
    
    if (ultimas6.length === 0) return null;

    const totalCompensado = ultimas6.reduce((acc, f) => 
      acc + (Number(f.autoconsumo_rs) || 0) + (Number(f.credito_remoto_compensado_rs) || 0), 0);
    
    const totalAssinatura = ultimas6.reduce((acc, f) => 
      acc + (Number(f.custo_assinatura_rs) || 0), 0);
    
    const totalEconomia = ultimas6.reduce((acc, f) => 
      acc + (Number(f.economia_liquida_rs) || 0), 0);
    
    const totalFaturas = ultimas6.reduce((acc, f) => 
      acc + (Number(f.valor_total) || 0), 0);

    const mediaEconomiaPercent = totalFaturas > 0 
      ? (totalEconomia / totalFaturas) * 100 
      : 0;

    return {
      totalCompensado,
      totalAssinatura,
      totalEconomia,
      totalFaturas,
      mediaEconomiaPercent,
      meses: ultimas6.length,
    };
  }, [faturasFechadas]);

  // Dados para o gráfico
  const chartData = useMemo(() => {
    return faturasFechadas.slice(0, 6).map(f => ({
      mesRef: f.mes_ref,
      contratada: Number(f.credito_remoto_kwh) || 0,
      alocada: (Number(f.autoconsumo_total_kwh) || 0) + (Number(f.credito_remoto_kwh) || 0),
    })).reverse();
  }, [faturasFechadas]);

  if (faturasLoading) {
    return (
      <DashboardLayout title="Assinatura" subtitle="Gestão do contrato de energia por assinatura">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!faturaAtual) {
    return (
      <DashboardLayout title="Assinatura" subtitle="Gestão do contrato de energia por assinatura">
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma fatura fechada encontrada.</p>
          <p className="text-sm">Lance dados no wizard para visualizar o dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  // CORRIGIDO: Usar valores direto do banco (calculados pelo wizard)
  const autoconsumoRs = Number(faturaAtual.autoconsumo_rs) || 0;
  const creditoRemotoRs = Number(faturaAtual.credito_remoto_compensado_rs) || 0;
  const totalCompensado = autoconsumoRs + creditoRemotoRs;
  
  // CORRIGIDO: Usar custo_assinatura_rs e economia_liquida_rs do banco
  const custoAssinatura = Number(faturaAtual.custo_assinatura_rs) || 0;
  const economiaLiquida = Number(faturaAtual.economia_liquida_rs) || 0;
  
  const valorFatura = Number(faturaAtual.valor_total) || 0;
  const economiaPercent = valorFatura > 0 ? (economiaLiquida / valorFatura) * 100 : 0;

  // Energia
  const consumoTotal = Number(faturaAtual.consumo_total_kwh) || 0;
  const creditoRemotoKwh = Number(faturaAtual.credito_remoto_kwh) || 0;
  const geracaoLocal = Number(faturaAtual.geracao_local_total_kwh) || 0;
  
  // CORRIGIDO: Autoconsumo kWh com fallback robusto
  const autoconsumoPontaKwh = Number(faturaAtual.autoconsumo_ponta_kwh) || 0;
  const autoconsumoFPKwh = Number(faturaAtual.autoconsumo_fp_kwh) || 0;
  const autoconsumoHRKwh = Number(faturaAtual.autoconsumo_hr_kwh) || 0;
  const autoconsumoSomaPosto = autoconsumoPontaKwh + autoconsumoFPKwh + autoconsumoHRKwh;
  const autoconsumoKwh = autoconsumoSomaPosto > 0 
    ? autoconsumoSomaPosto 
    : Number(faturaAtual.autoconsumo_total_kwh) || 
      Number(faturaAtual.energia_simultanea_kwh) || 0;
  
  // Detalhamento por posto horário (R$)
  const creditoRemotoPontaRs = Number(faturaAtual.credito_remoto_ponta_rs) || 0;
  const creditoRemotoFPRs = Number(faturaAtual.credito_remoto_fp_rs) || 0;
  const creditoRemotoHRRs = Number(faturaAtual.credito_remoto_hr_rs) || 0;
  
  const autoconsumoPontaRs = Number(faturaAtual.autoconsumo_ponta_rs) || 0;
  const autoconsumoFPRs = Number(faturaAtual.autoconsumo_fp_rs) || 0;
  const autoconsumoHRRs = Number(faturaAtual.autoconsumo_hr_rs) || 0;
  
  // kWh por posto - Créditos Remotos
  const creditoRemotoPontaKwh = Number(faturaAtual.credito_remoto_ponta_kwh) || 0;
  const creditoRemotoFPKwh = Number(faturaAtual.credito_remoto_fp_kwh) || 0;
  const creditoRemotoHRKwh = Number(faturaAtual.credito_remoto_hr_kwh) || 0;
  
  // CORRIGIDO: Detectar se tem detalhamento por posto (autoconsumo OU crédito remoto)
  const temDetalheAutoconsumo = isGrupoA && (
    autoconsumoPontaKwh > 0 || autoconsumoFPKwh > 0 || autoconsumoHRKwh > 0 ||
    autoconsumoPontaRs > 0 || autoconsumoFPRs > 0 || autoconsumoHRRs > 0
  );
  const temDetalheCredito = isGrupoA && (
    creditoRemotoPontaKwh > 0 || creditoRemotoFPKwh > 0 || creditoRemotoHRKwh > 0 ||
    creditoRemotoPontaRs > 0 || creditoRemotoFPRs > 0 || creditoRemotoHRRs > 0
  );

  return (
    <DashboardLayout title="Assinatura" subtitle={`Fatura ${faturaAtual.mes_ref} • ${ucAtual?.numero || 'UC não identificada'}`}>
      <div className="space-y-6">
        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Compensado"
            value={formatCurrency(totalCompensado)}
            subtitle={`Autoconsumo + Créditos Remotos`}
            icon={<Zap className="h-6 w-6" />}
            variant="success"
          />

          <KPICard
            title="Custo Assinatura"
            value={formatCurrency(custoAssinatura)}
            subtitle="Valor pago à usina"
            icon={<Building2 className="h-6 w-6" />}
          />

          <KPICard
            title="Economia Líquida"
            value={formatCurrency(economiaLiquida)}
            subtitle={`${formatPercent(economiaPercent)} da fatura`}
            icon={<TrendingUp className="h-6 w-6" />}
            variant="success"
          />

          <KPICard
            title="Valor da Fatura"
            value={formatCurrency(valorFatura)}
            subtitle={`Bandeira: ${faturaAtual.bandeiras}`}
            icon={<FileText className="h-6 w-6" />}
          />
        </div>

        {/* Detalhamento de Compensação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Geração e Compensação */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Geração Distribuída — {faturaAtual.mes_ref}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Geração Local</span>
                <span className="font-medium">{formatNumber(geracaoLocal)} kWh</span>
              </div>
              
              {/* Autoconsumo com detalhamento */}
              <div className="py-2 border-b border-border">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Autoconsumo (Simultaneidade)</span>
                  <div className="text-right">
                    <span className="font-medium">{formatNumber(autoconsumoKwh)} kWh</span>
                    <span className="text-sm text-green-600 ml-2">{formatCurrency(autoconsumoRs)}</span>
                  </div>
                </div>
                {temDetalheAutoconsumo && (
                  <div className="pl-4 mt-2 text-xs space-y-1 border-l-2 border-green-300 dark:border-green-700 ml-2">
                    {autoconsumoPontaKwh > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">• Ponta: {formatNumber(autoconsumoPontaKwh)} kWh</span>
                        <span className="font-medium text-green-600">{formatCurrency(autoconsumoPontaRs)}</span>
                      </div>
                    )}
                    {autoconsumoFPKwh > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">• Fora Ponta: {formatNumber(autoconsumoFPKwh)} kWh</span>
                        <span className="font-medium text-green-600">{formatCurrency(autoconsumoFPRs)}</span>
                      </div>
                    )}
                    {autoconsumoHRKwh > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">• Reservado: {formatNumber(autoconsumoHRKwh)} kWh</span>
                        <span className="font-medium text-green-600">{formatCurrency(autoconsumoHRRs)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Créditos Remotos com detalhamento */}
              <div className="py-2 border-b border-border">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Créditos Remotos</span>
                  <div className="text-right">
                    <span className="font-medium">{formatNumber(creditoRemotoKwh)} kWh</span>
                    <span className="text-sm text-green-600 ml-2">{formatCurrency(creditoRemotoRs)}</span>
                  </div>
                </div>
                {temDetalheCredito && (
                  <div className="pl-4 mt-2 text-xs space-y-1 border-l-2 border-green-300 dark:border-green-700 ml-2">
                    {creditoRemotoPontaKwh > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">• Ponta: {formatNumber(creditoRemotoPontaKwh)} kWh</span>
                        <span className="font-medium text-green-600">{formatCurrency(creditoRemotoPontaRs)}</span>
                      </div>
                    )}
                    {creditoRemotoFPKwh > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">• Fora Ponta: {formatNumber(creditoRemotoFPKwh)} kWh</span>
                        <span className="font-medium text-green-600">{formatCurrency(creditoRemotoFPRs)}</span>
                      </div>
                    )}
                    {creditoRemotoHRKwh > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">• Reservado: {formatNumber(creditoRemotoHRKwh)} kWh</span>
                        <span className="font-medium text-green-600">{formatCurrency(creditoRemotoHRRs)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Consumo Total</span>
                <span className="font-medium">{formatNumber(consumoTotal)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-3 -mx-6 px-6 bg-green-50 dark:bg-green-950/30 rounded-lg mt-2">
                <span className="font-semibold">Total Compensado</span>
                <span className="font-bold text-lg text-green-600">{formatCurrency(totalCompensado)}</span>
              </div>
            </div>
          </div>

          {/* Card: Resumo Financeiro */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Resumo Financeiro — {faturaAtual.mes_ref}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Valor Bruto Fatura</span>
                <span className="font-medium">{formatCurrency(valorFatura)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">(-) Total Compensado</span>
                <span className="font-medium text-green-600">- {formatCurrency(totalCompensado)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">(+) Custo Assinatura</span>
                <span className="font-medium text-amber-600">+ {formatCurrency(custoAssinatura)}</span>
              </div>
              <div className="flex justify-between items-center py-3 -mx-6 px-6 bg-green-50 dark:bg-green-950/30 rounded-lg mt-2">
                <span className="font-semibold">Economia Líquida</span>
                <span className="font-bold text-lg text-green-600">{formatCurrency(economiaLiquida)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm">
                <span className="text-muted-foreground">Classificação GD</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  faturaAtual.classificacao_gd_aplicada === 'gd1' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                    : faturaAtual.classificacao_gd_aplicada === 'gd2'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {faturaAtual.classificacao_gd_aplicada?.toUpperCase() || 'Não definido'}
                </span>
              </div>
              {(faturaAtual.percentual_fio_b_aplicado ?? 0) > 0 && (
                <div className="flex justify-between items-center py-2 text-sm">
                  <span className="text-muted-foreground">% Fio B Aplicado</span>
                  <span className="font-medium">{formatPercent(faturaAtual.percentual_fio_b_aplicado || 0)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico de Evolução */}
        {chartData.length > 1 && (
          <SubscriptionChart
            data={chartData}
            title="Evolução de Créditos (kWh)"
          />
        )}

        {/* Histórico de Faturas Fechadas */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Histórico de Faturas Fechadas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Mês</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Consumo</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Autoconsumo</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Créditos</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Compensado</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Economia</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">GD</th>
                </tr>
              </thead>
              <tbody>
                {faturasFechadas.slice(0, 6).map((fatura) => {
                  const autoRs = Number(fatura.autoconsumo_rs) || 0;
                  const credRs = Number(fatura.credito_remoto_compensado_rs) || 0;
                  const compTotal = autoRs + credRs;
                  // CORRIGIDO: Usar economia_liquida_rs do banco
                  const ecoLiq = Number(fatura.economia_liquida_rs) || 0;
                  
                  return (
                    <tr key={fatura.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2 font-medium">{fatura.mes_ref}</td>
                      <td className="text-right py-3 px-2">{formatNumber(Number(fatura.consumo_total_kwh))} kWh</td>
                      <td className="text-right py-3 px-2">{formatCurrency(autoRs)}</td>
                      <td className="text-right py-3 px-2">{formatCurrency(credRs)}</td>
                      <td className="text-right py-3 px-2 font-medium text-green-600">{formatCurrency(compTotal)}</td>
                      <td className="text-right py-3 px-2 font-bold text-green-600">{formatCurrency(ecoLiq)}</td>
                      <td className="text-right py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          fatura.classificacao_gd_aplicada === 'gd1' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                            : fatura.classificacao_gd_aplicada === 'gd2'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {fatura.classificacao_gd_aplicada?.toUpperCase() || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo Acumulado */}
        {resumo && resumo.meses > 1 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800 p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-green-800 dark:text-green-200 mb-4">
              Resumo Acumulado ({resumo.meses} meses)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Compensado</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(resumo.totalCompensado)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Assinaturas</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(resumo.totalAssinatura)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Economia Total</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(resumo.totalEconomia)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">% Médio Economia</p>
                <p className="text-xl font-bold text-green-600">{formatPercent(resumo.mediaEconomiaPercent)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
