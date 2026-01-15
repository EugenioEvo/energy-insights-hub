import { useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '../WizardContext';
import { PlugZap, ArrowDownRight, Wallet, TrendingUp, Info, AlertTriangle, Calculator, FileText, Zap, Minus, Plus, Equal, CircleDollarSign, Battery, Receipt, Factory } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVinculoByUC } from '@/hooks/useClienteUsinaVinculo';
import { useTarifas } from '@/hooks/useTarifas';
import { useRateioByUCMes } from '@/hooks/useUsinaRateioMensal';
import { calcularBalancoEnergetico, formatarKwh, calcularCustosDuasFaturas } from '@/lib/energyBalanceCalculations';
import { FormulaTooltip, DataSourceTooltip } from '../FormulaTooltip';

/**
 * Step 5: Créditos Remotos - Usina Assinada
 * 
 * CONCEITO DE NEGÓCIO:
 * O cliente consome energia de duas fontes:
 * 1. Usina Local (autoconsumo simultâneo) - economiza 100% da tarifa
 * 2. Rede da Concessionária - o que não veio da usina local
 * 
 * O consumo da rede pode ser abatido por:
 * - Créditos da injeção local (excedente da usina própria)
 * - Créditos remotos (assinatura de usina remota)
 * 
 * São geradas duas "faturas" conceituais:
 * 1. FATURA CONCESSIONÁRIA: Consumo não compensado × tarifa rede
 * 2. FATURA USINA: (Autoconsumo + Créditos Remotos) × 85% (15% desconto)
 * 
 * A economia total = Autoconsumo 100% evitado + 15% desconto sobre créditos
 */
export function Step5CreditosRemotos() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();

  // Buscar vínculo da UC com usina
  const { data: vinculo, isLoading: loadingVinculo } = useVinculoByUC(data.uc_id);
  
  // Buscar tarifa vigente
  const { data: tarifa, isLoading: loadingTarifa } = useTarifas(
    data.concessionaria || null,
    data.grupo_tarifario || null,
    data.modalidade || null
  );

  // Buscar rateio existente para o mês
  const { data: rateioRemoto } = useRateioByUCMes(data.uc_id, data.mes_ref);

  // Ref para evitar auto-preenchimento repetido
  const autoFilledRef = useRef(false);

  // Percentual de desconto: usa o valor do vínculo ou 15% como padrão
  const descontoPercent = vinculo?.desconto_garantido_percent ?? 15;
  const percentualPago = 100 - descontoPercent;

  // =====================================
  // BALANÇO ENERGÉTICO (fonte única de verdade)
  // =====================================
  const balanco = useMemo(() => {
    return calcularBalancoEnergetico(data, isGrupoA);
  }, [data, isGrupoA]);

  // =====================================
  // CÁLCULO DE CRÉDITOS DISPONÍVEIS E ALOCAÇÃO
  // =====================================
  const creditosCalculados = useMemo(() => {
    // Consumo da rede que precisa ser compensado
    const consumoDaRede = data.consumo_total_kwh || 0;
    
    // Créditos disponíveis (do rateio mensal ou contrato)
    const creditosDisponiveis = rateioRemoto?.energia_alocada_kwh 
      || data.scee_credito_recebido_kwh 
      || 0;

    // Alocar créditos para cobrir o consumo da rede
    const creditosAlocados = Math.min(creditosDisponiveis, consumoDaRede);
    
    // Consumo não compensado (vai pagar na fatura da concessionária)
    const consumoNaoCompensado = Math.max(0, consumoDaRede - creditosAlocados);
    
    // Créditos sobram (virão saldo)
    const creditosSobrando = Math.max(0, creditosDisponiveis - creditosAlocados);

    return {
      consumoDaRede,
      creditosDisponiveis,
      creditosAlocados,
      consumoNaoCompensado,
      creditosSobrando,
    };
  }, [data.consumo_total_kwh, data.scee_credito_recebido_kwh, rateioRemoto]);

  // Auto-preencher créditos alocados quando calculados (apenas uma vez)
  useEffect(() => {
    if (
      creditosCalculados.creditosAlocados > 0 && 
      !data.credito_remoto_kwh &&
      !autoFilledRef.current
    ) {
      autoFilledRef.current = true;
      updateData({
        credito_remoto_kwh: creditosCalculados.creditosAlocados,
      });
    }
  }, [creditosCalculados.creditosAlocados, data.credito_remoto_kwh, updateData]);

  // Impostos padrão
  const IMPOSTOS_DEFAULT = {
    icms: 0.17,
    pis: 0.0076,
    cofins: 0.0352
  };

  const obterImpostos = (tarifa: any) => ({
    icms: (tarifa?.icms_percent || IMPOSTOS_DEFAULT.icms * 100) / 100,
    pis: (tarifa?.pis_percent || IMPOSTOS_DEFAULT.pis * 100) / 100,
    cofins: (tarifa?.cofins_percent || IMPOSTOS_DEFAULT.cofins * 100) / 100,
  });

  // =====================================
  // CÁLCULO DE VALORES (R$)
  // =====================================
  
  // Valor compensado pelos créditos remotos (TUSD + encargos + impostos)
  const valorCompensadoCalculado = useMemo(() => {
    const creditoTotal = data.credito_remoto_kwh || creditosCalculados.creditosAlocados;
    if (!tarifa || !creditoTotal) return 0;

    // Se modalidade PPA, usar tarifa fixa do contrato
    if (vinculo?.modalidade_economia === 'ppa_tarifa' && vinculo?.tarifa_ppa_rs_kwh) {
      return creditoTotal * vinculo.tarifa_ppa_rs_kwh;
    }

    const encargos = tarifa.tusd_encargos_rs_kwh || 0;
    const impostos = obterImpostos(tarifa);
    const fatorImpostos = 1 - (impostos.icms + impostos.pis + impostos.cofins);

    // Grupo A: TUSD por posto, Grupo B: TUSD única
    const tusd = isGrupoA 
      ? (tarifa.tusd_fora_ponta_rs_kwh || 0) // Simplificado: usar FP como base
      : (tarifa.tusd_unica_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0);
    
    const valorBase = creditoTotal * (tusd + encargos);
    return fatorImpostos > 0 ? valorBase / fatorImpostos : valorBase;
  }, [tarifa, vinculo, data.credito_remoto_kwh, creditosCalculados.creditosAlocados, isGrupoA]);

  // Custo da assinatura = 85% do valor compensado (desconto de 15%)
  const custoAssinaturaCalculado = useMemo(() => {
    const valorCompensado = data.credito_remoto_compensado_rs || valorCompensadoCalculado;
    if (valorCompensado <= 0) return 0;
    return valorCompensado * (percentualPago / 100);
  }, [data.credito_remoto_compensado_rs, valorCompensadoCalculado, percentualPago]);

  // Auto-atualizar valor compensado
  useEffect(() => {
    if (valorCompensadoCalculado > 0 && !data.credito_remoto_compensado_rs) {
      updateData({ credito_remoto_compensado_rs: Math.round(valorCompensadoCalculado * 100) / 100 });
    }
  }, [valorCompensadoCalculado, data.credito_remoto_compensado_rs, updateData]);

  // Auto-atualizar custo da assinatura
  useEffect(() => {
    if (custoAssinaturaCalculado > 0 && !data.custo_assinatura_rs) {
      updateData({ custo_assinatura_rs: Math.round(custoAssinaturaCalculado * 100) / 100 });
    }
  }, [custoAssinaturaCalculado, data.custo_assinatura_rs, updateData]);

  // =====================================
  // RESUMO FINANCEIRO - DUAS FATURAS
  // =====================================
  const resumoFinanceiro = useMemo(() => {
    // Autoconsumo (economia de tarifa cheia)
    const autoconsumoKwh = balanco.autoconsumoSimultaneo;
    const autoconsumoRs = data.autoconsumo_rs || 0;
    
    // Créditos remotos
    const creditosKwh = data.credito_remoto_kwh || 0;
    const valorCompensado = data.credito_remoto_compensado_rs || 0;
    const custoAssinatura = data.custo_assinatura_rs || 0;
    
    // Economia do autoconsumo = 100% (evitou pagar tarifa)
    const economiaAutoconsumo = autoconsumoRs;
    
    // Economia dos créditos = valor compensado - custo assinatura
    const economiaCreditos = valorCompensado - custoAssinatura;
    
    // Economia total
    const economiaTotal = economiaAutoconsumo + economiaCreditos;
    
    // Percentual de desconto efetivo sobre créditos
    const descontoEfetivo = valorCompensado > 0 
      ? ((economiaCreditos / valorCompensado) * 100).toFixed(1)
      : '0';

    // "Fatura" da usina (o que paga ao fornecedor de energia solar)
    // PPA local (se houver) + Assinatura remota
    const custoPPALocal = data.tem_geracao_local && vinculo?.tarifa_ppa_rs_kwh
      ? autoconsumoKwh * vinculo.tarifa_ppa_rs_kwh * (percentualPago / 100)
      : 0; // Geração própria = sem custo mensal adicional
    
    const faturaUsina = custoAssinatura + custoPPALocal;

    return {
      // Energia
      autoconsumoKwh,
      creditosKwh,
      consumoNaoCompensado: creditosCalculados.consumoNaoCompensado,
      
      // Valores
      autoconsumoRs,
      valorCompensado,
      custoAssinatura,
      custoPPALocal,
      faturaUsina,
      
      // Economia
      economiaAutoconsumo,
      economiaCreditos,
      economiaTotal,
      descontoEfetivo,
    };
  }, [data, balanco, creditosCalculados, vinculo, percentualPago]);

  // Atualizar contexto
  useEffect(() => {
    if (data.economia_liquida_rs !== resumoFinanceiro.economiaCreditos) {
      updateData({
        economia_liquida_rs: resumoFinanceiro.economiaCreditos,
        consumo_final_kwh: creditosCalculados.consumoNaoCompensado,
      });
    }
  }, [resumoFinanceiro.economiaCreditos, creditosCalculados.consumoNaoCompensado]);

  // Validação
  useEffect(() => {
    if (!data.tem_usina_remota) {
      setCanProceed(true);
      return;
    }
    const hasValues = data.credito_remoto_kwh > 0 || data.credito_remoto_compensado_rs > 0;
    setCanProceed(hasValues);
  }, [data.tem_usina_remota, data.credito_remoto_kwh, data.credito_remoto_compensado_rs, setCanProceed]);

  // Helper formatação
  const formatNumber = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatKwh = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Labels
  const getModalidadeLabel = () => {
    if (!vinculo) return '';
    if (vinculo.modalidade_economia === 'ppa_tarifa') {
      return `PPA - R$ ${(vinculo.tarifa_ppa_rs_kwh || 0).toFixed(4)}/kWh`;
    }
    const refLabels: Record<string, string> = {
      valor_total: 'Valor Total',
      te_tusd: 'TE+TUSD',
      apenas_te: 'Apenas TE',
    };
    return `Desconto ${vinculo.desconto_garantido_percent || 0}% sobre ${refLabels[vinculo.referencia_desconto || 'valor_total']}`;
  };

  if (!data.tem_usina_remota) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-5 w-5" />
            Créditos Remotos
          </CardTitle>
          <CardDescription>
            Esta UC não possui assinatura de usina remota configurada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Você indicou que esta UC não recebe créditos de usina remota. 
              Se houver assinatura, volte ao Passo 0 e ative a opção "Usina Remota".
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlugZap className="h-5 w-5 text-blue-500" />
          Créditos Remotos (Assinatura)
        </CardTitle>
        <CardDescription>
          Energia compensada via assinatura de usina remota. O cliente paga {percentualPago}% do valor 
          compensado (desconto de {descontoPercent}%).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contrato */}
        {vinculo && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
            <FileText className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <strong>Contrato:</strong>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {getModalidadeLabel()}
                  </Badge>
                </div>
                {vinculo.usinas_remotas && (
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    Usina: {vinculo.usinas_remotas.nome} ({vinculo.usinas_remotas.uc_geradora})
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* ============================================= */}
        {/* SEÇÃO 1: BALANÇO ENERGÉTICO */}
        {/* ============================================= */}
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold">Balanço Energético</h3>
            <Badge variant="outline" className="text-xs">kWh</Badge>
          </div>
          
          <div className="grid gap-2 text-sm">
            {/* Consumo Real Total */}
            <div className="flex justify-between items-center py-2 bg-white/50 dark:bg-black/20 rounded px-2">
              <span className="font-medium">Consumo Real da UC</span>
              <span className="font-mono font-bold">{formatKwh(balanco.consumoRealTotal)} kWh</span>
            </div>
            
            {/* Detalhamento */}
            <div className="flex justify-between items-center py-1 pl-4 text-muted-foreground">
              <span className="text-xs flex items-center gap-1">
                <Minus className="h-3 w-3" /> Autoconsumo (usina local)
              </span>
              <span className="font-mono text-xs text-green-600">
                {balanco.autoconsumoSimultaneo > 0 ? `-${formatKwh(balanco.autoconsumoSimultaneo)}` : '0'} kWh
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-t">
              <span className="font-medium text-amber-700 dark:text-amber-300">= Consumo da Rede (fatura)</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                {formatKwh(balanco.consumoDaRede)} kWh
              </span>
            </div>
          </div>
        </div>

        {/* ============================================= */}
        {/* SEÇÃO 2: CRÉDITOS ALOCADOS */}
        {/* ============================================= */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded">
                <ArrowDownRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold">Créditos Remotos</h3>
            </div>
            <Badge variant="outline" className="text-xs gap-1">
              <Calculator className="h-3 w-3" />Automático
            </Badge>
          </div>

          {/* Créditos Disponíveis */}
          <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-green-600" />
              <span className="text-sm">Créditos Recebidos (SCEE/Rateio):</span>
            </div>
            <span className="font-bold text-green-700">{formatKwh(creditosCalculados.creditosDisponiveis)} kWh</span>
          </div>

          {/* Alocação */}
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Consumo a compensar:</span>
              <span className="font-mono">{formatKwh(creditosCalculados.consumoDaRede)} kWh</span>
            </div>
            <div className="flex justify-between items-center py-1 text-blue-600">
              <span className="flex items-center gap-1">
                <Minus className="h-3 w-3" /> Créditos Alocados:
              </span>
              <span className="font-mono font-medium">−{formatKwh(creditosCalculados.creditosAlocados)} kWh</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-dashed font-medium">
              <span>=Consumo Não Compensado:</span>
              <span className={`font-mono font-bold ${creditosCalculados.consumoNaoCompensado === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatKwh(creditosCalculados.consumoNaoCompensado)} kWh
              </span>
            </div>
          </div>

          {creditosCalculados.consumoNaoCompensado > 0 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Créditos insuficientes!</strong> {formatKwh(creditosCalculados.consumoNaoCompensado)} kWh 
                será cobrado na fatura da concessionária.
              </AlertDescription>
            </Alert>
          )}

          {creditosCalculados.consumoNaoCompensado === 0 && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              ✓ Consumo 100% compensado
            </Badge>
          )}

          {/* Campo editável (caso precise ajustar) */}
          <div className="pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Créditos Alocados (kWh)</Label>
              <Input
                type="number"
                value={data.credito_remoto_kwh || ''}
                onChange={(e) => updateData({ credito_remoto_kwh: parseFloat(e.target.value) || 0 })}
                placeholder={`Sugerido: ${formatKwh(creditosCalculados.creditosAlocados)}`}
              />
            </div>
          </div>
        </div>

        {/* ============================================= */}
        {/* SEÇÃO 3: DUAS FATURAS */}
        {/* ============================================= */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Fatura Concessionária */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-600" />
              <h3 className="font-semibold text-sm">Fatura Concessionária</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              O que ainda deve à distribuidora após compensação
            </p>
            <div className="p-3 bg-white/50 dark:bg-black/20 rounded text-center">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                {formatKwh(creditosCalculados.consumoNaoCompensado)} kWh
              </div>
              <div className="text-xs text-muted-foreground">Consumo não compensado</div>
            </div>
          </div>

          {/* Fatura Usina */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold text-sm">Fatura Usina ({percentualPago}%)</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Custo da assinatura (com {descontoPercent}% de desconto)
            </p>
            <div className="p-3 bg-white/50 dark:bg-black/20 rounded text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                R$ {formatNumber(resumoFinanceiro.custoAssinatura)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatKwh(resumoFinanceiro.creditosKwh)} kWh × {percentualPago}%
              </div>
            </div>
          </div>
        </div>

        {/* Valores editáveis */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Valor Compensado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={data.credito_remoto_compensado_rs || ''}
              onChange={(e) => updateData({ credito_remoto_compensado_rs: parseFloat(e.target.value) || 0 })}
            />
            <Badge variant="outline" className="text-xs">Calculado via tarifa TUSD</Badge>
          </div>
          <div className="space-y-2">
            <Label>Custo Assinatura (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={data.custo_assinatura_rs || ''}
              onChange={(e) => updateData({ custo_assinatura_rs: parseFloat(e.target.value) || 0 })}
            />
            <Badge variant="outline" className="text-xs">{percentualPago}% do compensado</Badge>
          </div>
        </div>

        {/* ============================================= */}
        {/* SEÇÃO 4: ECONOMIA TOTAL */}
        {/* ============================================= */}
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-300 dark:border-green-700 rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded">
              <CircleDollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold">Economia Total do Mês</h3>
          </div>
          
          <div className="grid gap-2 text-sm">
            {/* Economia do Autoconsumo */}
            {resumoFinanceiro.autoconsumoRs > 0 && (
              <div className="flex justify-between items-center py-2">
                <div className="flex flex-col">
                  <span className="font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Autoconsumo (tarifa evitada)
                  </span>
                  <span className="text-xs text-muted-foreground pl-4">
                    {formatKwh(resumoFinanceiro.autoconsumoKwh)} kWh × 100%
                  </span>
                </div>
                <span className="font-mono font-medium text-green-600">
                  R$ {formatNumber(resumoFinanceiro.economiaAutoconsumo)}
                </span>
              </div>
            )}
            
            {/* Economia dos Créditos */}
            <div className="flex justify-between items-center py-2">
              <div className="flex flex-col">
                <span className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <PlugZap className="h-3 w-3" /> Créditos Remotos ({descontoPercent}% desc.)
                </span>
                <span className="text-xs text-muted-foreground pl-4">
                  R$ {formatNumber(resumoFinanceiro.valorCompensado)} - R$ {formatNumber(resumoFinanceiro.custoAssinatura)}
                </span>
              </div>
              <span className="font-mono font-medium text-blue-600">
                R$ {formatNumber(resumoFinanceiro.economiaCreditos)}
              </span>
            </div>
            
            {/* Total */}
            <div className={`flex justify-between items-center py-3 px-3 -mx-3 rounded-lg mt-2 ${
              resumoFinanceiro.economiaTotal >= 0 
                ? 'bg-green-100 dark:bg-green-900/50' 
                : 'bg-red-100 dark:bg-red-900/50'
            }`}>
              <div className="flex flex-col">
                <span className="font-bold text-base flex items-center gap-1">
                  <Equal className="h-4 w-4" /> ECONOMIA TOTAL
                </span>
              </div>
              <span className={`font-mono font-bold text-xl ${
                resumoFinanceiro.economiaTotal >= 0 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                R$ {formatNumber(resumoFinanceiro.economiaTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Saldos de Créditos */}
        <div className="p-4 bg-muted/50 border rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <h3 className="font-medium">Saldo de Créditos (Fim do Ciclo)</h3>
          </div>

          {isGrupoA ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ponta (kWh)</Label>
                  <Input
                    type="number"
                    value={data.scee_saldo_kwh_p || ''}
                    onChange={(e) => updateData({ scee_saldo_kwh_p: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fora Ponta (kWh)</Label>
                  <Input
                    type="number"
                    value={data.scee_saldo_kwh_fp || ''}
                    onChange={(e) => updateData({ scee_saldo_kwh_fp: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reservado (kWh)</Label>
                  <Input
                    type="number"
                    value={data.scee_saldo_kwh_hr || ''}
                    onChange={(e) => updateData({ scee_saldo_kwh_hr: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-amber-600">Expiram em 30 dias (kWh)</Label>
                  <Input
                    type="number"
                    value={data.scee_saldo_expirar_30d_kwh || ''}
                    onChange={(e) => updateData({ scee_saldo_expirar_30d_kwh: parseFloat(e.target.value) || 0 })}
                    className="border-amber-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiram em 60 dias (kWh)</Label>
                  <Input
                    type="number"
                    value={data.scee_saldo_expirar_60d_kwh || ''}
                    onChange={(e) => updateData({ scee_saldo_expirar_60d_kwh: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {data.scee_saldo_expirar_30d_kwh > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription>
                    Atenção: {data.scee_saldo_expirar_30d_kwh.toLocaleString('pt-BR')} kWh de créditos 
                    expiram nos próximos 30 dias.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Label>Saldo Total (kWh)</Label>
              <Input
                type="number"
                value={data.scee_saldo_kwh_fp || ''}
                onChange={(e) => updateData({ scee_saldo_kwh_fp: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
