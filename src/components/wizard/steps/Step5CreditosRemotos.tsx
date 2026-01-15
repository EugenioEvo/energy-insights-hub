import { useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '../WizardContext';
import { PlugZap, ArrowDownRight, Wallet, TrendingUp, Info, AlertTriangle, Calculator, FileText, Zap, Minus, Plus, Equal, ArrowRight, CircleDollarSign, Battery } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVinculoByUC } from '@/hooks/useClienteUsinaVinculo';
import { useTarifas } from '@/hooks/useTarifas';
import { useRateioByUCMes } from '@/hooks/useUsinaRateioMensal';
import { calcularBalancoEnergetico, formatarKwh } from '@/lib/energyBalanceCalculations';
import { FormulaTooltip, DataSourceTooltip } from '../FormulaTooltip';

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

  // =====================================
  // CÁLCULO AUTOMÁTICO DE CRÉDITOS ALOCADOS
  // =====================================
  // Calcular créditos alocados por posto baseado no consumo residual (Consumo - Autoconsumo)
  const creditosAlocadosCalculados = useMemo(() => {
    // Consumo residual por posto = Consumo - Autoconsumo
    const consumoResidualPonta = Math.max(0, data.consumo_ponta_kwh - (data.autoconsumo_ponta_kwh || 0));
    const consumoResidualFP = Math.max(0, data.consumo_fora_ponta_kwh - (data.autoconsumo_fp_kwh || 0));
    const consumoResidualHR = Math.max(0, data.consumo_reservado_kwh - (data.autoconsumo_hr_kwh || 0));
    const consumoResidualTotal = consumoResidualPonta + consumoResidualFP + consumoResidualHR;

    // Créditos remotos disponíveis (do contrato/rateio ou scee_credito_recebido)
    const creditosDisponiveis = rateioRemoto?.energia_alocada_kwh 
      || data.scee_credito_recebido_kwh 
      || data.credito_remoto_kwh 
      || 0;

    // Alocar créditos por posto para zerar consumo residual
    let creditoPonta = 0, creditoFP = 0, creditoHR = 0;
    let creditosRestantes = creditosDisponiveis;

    if (consumoResidualTotal > 0 && creditosDisponiveis > 0) {
      // Alocar proporcionalmente ao consumo residual, até o limite disponível
      if (creditosDisponiveis >= consumoResidualTotal) {
        // Créditos suficientes para zerar todo o consumo residual
        creditoPonta = consumoResidualPonta;
        creditoFP = consumoResidualFP;
        creditoHR = consumoResidualHR;
      } else {
        // Créditos insuficientes: distribuir proporcionalmente
        const propPonta = consumoResidualPonta / consumoResidualTotal;
        const propFP = consumoResidualFP / consumoResidualTotal;
        const propHR = consumoResidualHR / consumoResidualTotal;
        
        creditoPonta = Math.round(creditosDisponiveis * propPonta * 100) / 100;
        creditoFP = Math.round(creditosDisponiveis * propFP * 100) / 100;
        creditoHR = Math.round(creditosDisponiveis * propHR * 100) / 100;
      }
    }

    // Consumo não compensado por posto (será cobrado na fatura)
    const naoCompensadoPonta = Math.max(0, consumoResidualPonta - creditoPonta);
    const naoCompensadoFP = Math.max(0, consumoResidualFP - creditoFP);
    const naoCompensadoHR = Math.max(0, consumoResidualHR - creditoHR);
    
    const totalAlocado = creditoPonta + creditoFP + creditoHR;
    const totalNaoCompensado = naoCompensadoPonta + naoCompensadoFP + naoCompensadoHR;

    return {
      consumoResidual: { 
        ponta: consumoResidualPonta, 
        fp: consumoResidualFP, 
        hr: consumoResidualHR, 
        total: consumoResidualTotal 
      },
      creditosAlocados: { 
        ponta: creditoPonta, 
        fp: creditoFP, 
        hr: creditoHR, 
        total: totalAlocado 
      },
      naoCompensado: { 
        ponta: naoCompensadoPonta, 
        fp: naoCompensadoFP, 
        hr: naoCompensadoHR, 
        total: totalNaoCompensado 
      },
      creditosDisponiveis,
    };
  }, [
    data.consumo_ponta_kwh, data.consumo_fora_ponta_kwh, data.consumo_reservado_kwh,
    data.autoconsumo_ponta_kwh, data.autoconsumo_fp_kwh, data.autoconsumo_hr_kwh,
    data.scee_credito_recebido_kwh, data.credito_remoto_kwh,
    rateioRemoto
  ]);

  // Auto-preencher créditos alocados quando calculados (apenas uma vez)
  useEffect(() => {
    const { creditosAlocados } = creditosAlocadosCalculados;
    
    // Só auto-preencher se:
    // 1. Tiver créditos calculados
    // 2. Campos ainda estão zerados
    // 3. Não foi auto-preenchido ainda
    if (
      creditosAlocados.total > 0 && 
      !data.credito_remoto_ponta_kwh && 
      !data.credito_remoto_fp_kwh && 
      !data.credito_remoto_hr_kwh &&
      !autoFilledRef.current
    ) {
      autoFilledRef.current = true;
      updateData({
        credito_remoto_ponta_kwh: creditosAlocados.ponta,
        credito_remoto_fp_kwh: creditosAlocados.fp,
        credito_remoto_hr_kwh: creditosAlocados.hr,
        credito_remoto_kwh: creditosAlocados.total,
      });
    }
  }, [creditosAlocadosCalculados, data.credito_remoto_ponta_kwh, data.credito_remoto_fp_kwh, data.credito_remoto_hr_kwh, updateData]);

  // Impostos padrão caso não estejam configurados na tarifa
  const IMPOSTOS_DEFAULT = {
    icms: 0.17,    // 17%
    pis: 0.0076,   // 0.76%
    cofins: 0.0352 // 3.52%
  };

  // Função para obter impostos (da tarifa ou padrão)
  const obterImpostos = (tarifa: any) => {
    return {
      icms: (tarifa?.icms_percent || IMPOSTOS_DEFAULT.icms * 100) / 100,
      pis: (tarifa?.pis_percent || IMPOSTOS_DEFAULT.pis * 100) / 100,
      cofins: (tarifa?.cofins_percent || IMPOSTOS_DEFAULT.cofins * 100) / 100,
    };
  };

  // Calcular valor compensado baseado na tarifa (TUSD + Encargos + impostos "por dentro")
  const valorCompensadoCalculado = useMemo(() => {
    const creditoTotal = data.credito_remoto_kwh || creditosAlocadosCalculados.creditosAlocados.total;
    if (!tarifa || !creditoTotal) return null;

    // Se modalidade PPA, usar tarifa fixa do contrato
    if (vinculo?.modalidade_economia === 'ppa_tarifa' && vinculo?.tarifa_ppa_rs_kwh) {
      return creditoTotal * vinculo.tarifa_ppa_rs_kwh;
    }

    const encargos = tarifa.tusd_encargos_rs_kwh || 0;
    const impostos = obterImpostos(tarifa);
    const fatorImpostos = 1 - (impostos.icms + impostos.pis + impostos.cofins);

    if (isGrupoA) {
      const energiaPonta = data.credito_remoto_ponta_kwh || creditosAlocadosCalculados.creditosAlocados.ponta;
      const energiaFP = data.credito_remoto_fp_kwh || creditosAlocadosCalculados.creditosAlocados.fp;
      const energiaHR = data.credito_remoto_hr_kwh || creditosAlocadosCalculados.creditosAlocados.hr;
      
      const tusdPonta = tarifa.tusd_ponta_rs_kwh || 0;
      const valorPonta = energiaPonta * (tusdPonta + encargos);
      
      const tusdFP = tarifa.tusd_fora_ponta_rs_kwh || 0;
      const valorFP = energiaFP * (tusdFP + encargos);
      
      const tusdHR = tarifa.tusd_reservado_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0;
      const valorHR = energiaHR * (tusdHR + encargos);
      
      const valorBase = valorPonta + valorFP + valorHR;
      return fatorImpostos > 0 ? valorBase / fatorImpostos : valorBase;
    } else {
      const tusdUnica = tarifa.tusd_unica_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0;
      const valorBase = creditoTotal * (tusdUnica + encargos);
      return fatorImpostos > 0 ? valorBase / fatorImpostos : valorBase;
    }
  }, [tarifa, vinculo, data.credito_remoto_kwh, data.credito_remoto_ponta_kwh, data.credito_remoto_fp_kwh, data.credito_remoto_hr_kwh, isGrupoA, creditosAlocadosCalculados]);

  // Percentual de desconto: usa o valor do vínculo ou 15% como padrão (paga 85%)
  const descontoPercent = vinculo?.desconto_garantido_percent ?? 15;
  const percentualPago = 100 - descontoPercent;

  // Custo da assinatura automático: 85% do valor compensado (desconto de 15%)
  const custoAssinaturaCalculado = useMemo(() => {
    const valorCompensado = data.credito_remoto_compensado_rs || valorCompensadoCalculado || 0;
    if (valorCompensado <= 0) return null;
    // Custo = valor compensado × percentual que o cliente paga (85% padrão)
    return valorCompensado * (percentualPago / 100);
  }, [data.credito_remoto_compensado_rs, valorCompensadoCalculado, percentualPago]);

  // Auto-atualizar valor compensado
  useEffect(() => {
    if (valorCompensadoCalculado !== null && valorCompensadoCalculado > 0 && !data.credito_remoto_compensado_rs) {
      updateData({ credito_remoto_compensado_rs: Math.round(valorCompensadoCalculado * 100) / 100 });
    }
  }, [valorCompensadoCalculado, data.credito_remoto_compensado_rs, updateData]);

  // Auto-atualizar custo da assinatura
  useEffect(() => {
    if (custoAssinaturaCalculado !== null && custoAssinaturaCalculado > 0 && !data.custo_assinatura_rs) {
      updateData({ custo_assinatura_rs: Math.round(custoAssinaturaCalculado * 100) / 100 });
    }
  }, [custoAssinaturaCalculado, data.custo_assinatura_rs, updateData]);

  // Cálculos de economia usando função centralizada para balanço energético
  const calculos = useMemo(() => {
    // Usar função centralizada para garantir consistência com Step4
    const balanco = calcularBalancoEnergetico(data, isGrupoA);
    
    // === ECONOMIA FINANCEIRA ===
    // Economia do autoconsumo/simultaneidade (tarifa cheia evitada)
    const economiaAutoconsumo = data.autoconsumo_rs || 0;
    
    // Economia dos créditos remotos (compensação TUSD)
    const economiaCreditosRemotos = data.credito_remoto_compensado_rs || 0;
    
    // Economia bruta = autoconsumo + créditos remotos
    const economiaBruta = economiaAutoconsumo + economiaCreditosRemotos;
    
    // Custo da assinatura
    const custoAssinatura = data.custo_assinatura_rs || 0;
    
    // Economia líquida dos créditos remotos = compensado - custo assinatura
    const economiaLiquidaRemotos = economiaCreditosRemotos - custoAssinatura;
    
    // Economia total = autoconsumo (100% poupado) + economia líquida dos remotos
    const economiaTotal = economiaAutoconsumo + economiaLiquidaRemotos;
    
    // Desconto efetivo sobre o valor compensado dos créditos remotos
    const descontoEfetivo = economiaCreditosRemotos > 0
      ? ((economiaLiquidaRemotos / economiaCreditosRemotos) * 100).toFixed(1)
      : '0';

    // Créditos remotos usados (kWh)
    const creditosRemotosUsados = data.credito_remoto_kwh || 
      (data.credito_remoto_ponta_kwh + data.credito_remoto_fp_kwh + data.credito_remoto_hr_kwh) || 0;

    return {
      // Balanço energético (da função centralizada)
      ...balanco,
      // Energia
      creditosRemotosUsados,
      // Economia
      economiaAutoconsumo,
      economiaCreditosRemotos,
      economiaBruta,
      custoAssinatura,
      economiaLiquidaRemotos,
      economiaTotal,
      descontoEfetivo,
    };
  }, [data, isGrupoA]);

  // Atualizar contexto - usar valores primitivos para evitar loop infinito
  useEffect(() => {
    const novaEconomia = calculos.economiaLiquidaRemotos;
    const novoConsumoFinal = calculos.consumoFinal;
    
    // Só atualizar se os valores realmente mudaram
    if (data.economia_liquida_rs !== novaEconomia || data.consumo_final_kwh !== novoConsumoFinal) {
      updateData({
        economia_liquida_rs: novaEconomia,
        consumo_final_kwh: novoConsumoFinal,
      });
    }
  }, [calculos.economiaLiquidaRemotos, calculos.consumoFinal]);

  // Validação
  useEffect(() => {
    if (!data.tem_usina_remota) {
      setCanProceed(true);
      return;
    }
    const hasValues = data.credito_remoto_kwh > 0 || data.credito_remoto_compensado_rs > 0;
    setCanProceed(hasValues);
  }, [data.tem_usina_remota, data.credito_remoto_kwh, data.credito_remoto_compensado_rs, setCanProceed]);

  // Helper para formatar números
  const formatNumber = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatKwh = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Helpers para labels
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
          Créditos Remotos (Usina Assinada)
        </CardTitle>
        <CardDescription>
          Créditos recebidos da usina remota via contrato de assinatura. 
          Estes créditos compensam o consumo que não foi abatido pelo autoconsumo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Card de Contrato */}
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

        {loadingVinculo && (
          <div className="text-sm text-muted-foreground">Carregando dados do contrato...</div>
        )}

        {/* Fluxo de Compensação Automático */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-blue-600" />
              <h3 className="font-medium text-blue-700 dark:text-blue-400">Créditos Alocados Neste Mês</h3>
            </div>
            <Badge variant="outline" className="text-xs gap-1"><Calculator className="h-3 w-3" />Automático</Badge>
          </div>

          {/* Consumo Residual por Posto */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <Label className="text-xs text-muted-foreground mb-2 block">Consumo Residual (após autoconsumo)</Label>
            {isGrupoA ? (
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="p-2 bg-background rounded border"><span className="text-xs text-muted-foreground">Ponta</span><div className="font-semibold">{creditosAlocadosCalculados.consumoResidual.ponta.toLocaleString('pt-BR')} kWh</div></div>
                <div className="p-2 bg-background rounded border"><span className="text-xs text-muted-foreground">FP</span><div className="font-semibold">{creditosAlocadosCalculados.consumoResidual.fp.toLocaleString('pt-BR')} kWh</div></div>
                <div className="p-2 bg-background rounded border"><span className="text-xs text-muted-foreground">HR</span><div className="font-semibold">{creditosAlocadosCalculados.consumoResidual.hr.toLocaleString('pt-BR')} kWh</div></div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-300"><span className="text-xs text-muted-foreground">Total</span><div className="font-bold text-blue-700">{creditosAlocadosCalculados.consumoResidual.total.toLocaleString('pt-BR')} kWh</div></div>
              </div>
            ) : (
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-300"><span className="text-xs text-muted-foreground">Total</span><div className="font-bold text-blue-700">{creditosAlocadosCalculados.consumoResidual.total.toLocaleString('pt-BR')} kWh</div></div>
            )}
          </div>

          {/* Créditos Disponíveis */}
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
            <div className="flex items-center gap-2"><Battery className="h-4 w-4 text-green-600" /><span className="text-sm">Créditos Disponíveis:</span></div>
            <span className="font-bold text-green-700">{creditosAlocadosCalculados.creditosDisponiveis.toLocaleString('pt-BR')} kWh</span>
          </div>

          {/* Créditos Alocados */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">Créditos Alocados <Badge variant="secondary" className="text-xs">Auto-calculado</Badge></Label>
            {isGrupoA ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Ponta</Label><Input type="number" value={data.credito_remoto_ponta_kwh || ''} onChange={(e) => updateData({ credito_remoto_ponta_kwh: parseFloat(e.target.value) || 0 })} /><span className="text-xs text-muted-foreground">Sugerido: {creditosAlocadosCalculados.creditosAlocados.ponta.toLocaleString('pt-BR')}</span></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Fora Ponta</Label><Input type="number" value={data.credito_remoto_fp_kwh || ''} onChange={(e) => updateData({ credito_remoto_fp_kwh: parseFloat(e.target.value) || 0 })} /><span className="text-xs text-muted-foreground">Sugerido: {creditosAlocadosCalculados.creditosAlocados.fp.toLocaleString('pt-BR')}</span></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Reservado</Label><Input type="number" value={data.credito_remoto_hr_kwh || ''} onChange={(e) => updateData({ credito_remoto_hr_kwh: parseFloat(e.target.value) || 0 })} /><span className="text-xs text-muted-foreground">Sugerido: {creditosAlocadosCalculados.creditosAlocados.hr.toLocaleString('pt-BR')}</span></div>
              </div>
            ) : (
              <div className="space-y-1"><Input type="number" value={data.credito_remoto_kwh || ''} onChange={(e) => updateData({ credito_remoto_kwh: parseFloat(e.target.value) || 0 })} /><span className="text-xs text-muted-foreground">Sugerido: {creditosAlocadosCalculados.creditosAlocados.total.toLocaleString('pt-BR')}</span></div>
            )}
          </div>

          {/* Alerta Consumo Não Compensado */}
          {creditosAlocadosCalculados.naoCompensado.total > 0 && (
            <Alert className="bg-amber-50 border-amber-200"><AlertTriangle className="h-4 w-4 text-amber-600" /><AlertDescription className="text-amber-800"><strong>Créditos insuficientes!</strong> Consumo não compensado: <strong>{creditosAlocadosCalculados.naoCompensado.total.toLocaleString('pt-BR')} kWh</strong> (será cobrado na fatura)</AlertDescription></Alert>
          )}

          {/* Valor Compensado + Custo */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2"><Label>Valor Compensado (R$)</Label><Input type="number" step="0.01" value={data.credito_remoto_compensado_rs || ''} onChange={(e) => updateData({ credito_remoto_compensado_rs: parseFloat(e.target.value) || 0 })} /><Badge variant="outline" className="text-xs">Calculado via tarifa</Badge></div>
            <div className="space-y-2"><Label>Custo Assinatura (R$)</Label><Input type="number" step="0.01" value={data.custo_assinatura_rs || ''} onChange={(e) => updateData({ custo_assinatura_rs: parseFloat(e.target.value) || 0 })} /><Badge variant="outline" className="text-xs">{percentualPago}% do compensado</Badge></div>
          </div>
        </div>

        {/* Economia Líquida */}
        <div className={`p-4 rounded-lg border-2 ${
          calculos.economiaLiquidaRemotos >= 0 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {calculos.economiaLiquidaRemotos >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <h3 className="font-medium">Economia Líquida</h3>
            </div>
            <Badge variant={calculos.economiaLiquidaRemotos >= 0 ? "default" : "destructive"}>
              Desconto Efetivo: {calculos.descontoEfetivo}%
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Valor Compensado:</span>
              <span className="font-medium text-green-600">
                + R$ {data.credito_remoto_compensado_rs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Custo Assinatura:</span>
              <span className="font-medium text-red-600">
                − R$ {data.custo_assinatura_rs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-medium">Economia Líquida:</span>
              <span className={`text-xl font-bold ${
                calculos.economiaLiquidaRemotos >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                R$ {calculos.economiaLiquidaRemotos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {calculos.economiaLiquidaRemotos < 0 && (
            <p className="text-xs text-red-600 mt-2">
              ⚠️ O custo da assinatura é maior que o valor compensado neste mês.
            </p>
          )}
        </div>

        {/* Saldos de Créditos */}
        {isGrupoA ? (
          <div className="p-4 bg-muted/50 border rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <h3 className="font-medium">Saldo de Créditos (Fim do Ciclo)</h3>
            </div>

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
                  expiram nos próximos 30 dias. Considere otimizar o uso.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted/50 border rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <h3 className="font-medium">Saldo de Créditos (Fim do Ciclo)</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Saldo Total (kWh)</Label>
                <Input
                  type="number"
                  value={data.scee_saldo_kwh_fp || ''}
                  onChange={(e) => updateData({ scee_saldo_kwh_fp: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO 1: Balanço Energético da UC (kWh) */}
        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold">Balanço Energético da UC</h3>
            <Badge variant="outline" className="text-xs">kWh</Badge>
          </div>
          
          <div className="grid gap-2 text-sm">
            {/* Consumo Real da UC - detalhado */}
            <div className="flex justify-between items-center py-1 font-medium">
              <span>Consumo Real da UC</span>
              <span className="font-mono">{calculos.consumoRealUC.toLocaleString('pt-BR')} kWh</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4 text-muted-foreground">
              <span className="text-xs">• Energia da Rede (distribuidora)</span>
              <span className="font-mono text-xs">{calculos.energiaDaRede.toLocaleString('pt-BR')} kWh</span>
            </div>
            {calculos.energiaSimultanea > 0 && (
              <div className="flex justify-between items-center py-1 pl-4 text-green-600 dark:text-green-400">
                <span className="text-xs">• Energia Simultânea (autoconsumo GD)</span>
                <span className="font-mono text-xs">{calculos.energiaSimultanea.toLocaleString('pt-BR')} kWh</span>
              </div>
            )}
            
            {/* Geração (se houver) */}
            {calculos.geracaoLocal > 0 && (
              <>
                <div className="border-t pt-2 mt-2" />
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Geração Local Total</span>
                  <span className="font-mono font-medium">{calculos.geracaoLocal.toLocaleString('pt-BR')} kWh</span>
                </div>
                <div className="flex justify-between items-center py-1 pl-4 text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1 text-xs">
                    <Minus className="h-3 w-3" /> Autoconsumo simultâneo
                  </span>
                  <span className="font-mono text-xs">−{calculos.energiaSimultanea.toLocaleString('pt-BR')} kWh</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-dashed font-medium text-blue-600 dark:text-blue-400">
                  <span className="flex items-center gap-1">
                    <Equal className="h-3 w-3" /> Injeção → novos créditos
                  </span>
                  <span className="font-mono">{calculos.injecaoLocal.toLocaleString('pt-BR')} kWh</span>
                </div>
              </>
            )}
            
            {/* Resumo: o que precisa compensar */}
            <div className="border-t pt-2 mt-2" />
            <div className="flex justify-between items-center py-2 bg-amber-50 dark:bg-amber-950/50 -mx-2 px-2 rounded">
              <span className="text-amber-700 dark:text-amber-300 font-medium text-sm">
                → A compensar (energia da rede)
              </span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                {calculos.energiaDaRede.toLocaleString('pt-BR')} kWh
              </span>
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: Compensação de Créditos (kWh) */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded">
              <Battery className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold">Compensação de Créditos</h3>
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:text-blue-300">kWh</Badge>
          </div>
          
          <div className="grid gap-2 text-sm">
            {/* Base: Energia da Rede */}
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Energia da Rede (a compensar)</span>
              <span className="font-mono font-medium">{calculos.energiaDaRede.toLocaleString('pt-BR')} kWh</span>
            </div>
            
            {/* Créditos Locais (saldo acumulado) */}
            {calculos.saldoCreditosLocais > 0 && (
              <>
                <div className="flex justify-between items-center py-1 pl-4 text-xs text-muted-foreground">
                  <span>Saldo de créditos locais disponível</span>
                  <span className="font-mono">{calculos.saldoCreditosLocais.toLocaleString('pt-BR')} kWh</span>
                </div>
                <div className="flex justify-between items-center py-1 pl-4 text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1">
                    <Minus className="h-3 w-3" /> Créditos Locais Usados
                  </span>
                  <span className="font-mono font-medium">−{calculos.creditosLocaisUsados.toLocaleString('pt-BR')} kWh</span>
                </div>
              </>
            )}
            
            {/* Créditos Remotos */}
            {calculos.creditosRemotosUsados > 0 && (
              <div className="flex justify-between items-center py-1 pl-4 text-blue-600 dark:text-blue-400">
                <span className="flex items-center gap-1">
                  <Minus className="h-3 w-3" /> Créditos Remotos (usina)
                </span>
                <span className="font-mono font-medium">−{calculos.creditosRemotosUsados.toLocaleString('pt-BR')} kWh</span>
              </div>
            )}
            
            {/* Resultado */}
            <div className="flex justify-between items-center py-2 border-t-2 border-blue-300 dark:border-blue-700 font-bold">
              <span className="flex items-center gap-1">
                <Equal className="h-3 w-3" /> Consumo Residual a Pagar
              </span>
              <span className={`font-mono text-lg ${calculos.consumoFinal === 0 ? 'text-green-600 dark:text-green-400' : 'text-primary'}`}>
                {calculos.consumoFinal.toLocaleString('pt-BR')} kWh
              </span>
            </div>
          </div>
          
          {calculos.consumoFinal === 0 && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              ✓ Consumo 100% compensado
            </Badge>
          )}
        </div>

        {/* SEÇÃO 3: Economia Gerada (R$) */}
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded">
              <CircleDollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold">Economia Gerada</h3>
            <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-300">R$</Badge>
          </div>
          
          <div className="grid gap-2 text-sm">
            {/* Autoconsumo / Simultaneidade */}
            {calculos.economiaAutoconsumo > 0 && (
              <div className="flex justify-between items-center py-1">
                <div className="flex flex-col">
                  <span className="text-green-700 dark:text-green-300 font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Simultaneidade (tarifa cheia evitada)
                  </span>
                  <span className="text-xs text-muted-foreground pl-4">
                    {calculos.energiaSimultanea.toLocaleString('pt-BR')} kWh × tarifa completa
                  </span>
                </div>
                <span className="font-mono font-medium text-green-600 dark:text-green-400">
                  R$ {calculos.economiaAutoconsumo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            
            {/* Créditos Remotos */}
            <div className="flex justify-between items-center py-1">
              <div className="flex flex-col">
                <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Créditos Remotos Compensados
                </span>
                <span className="text-xs text-muted-foreground pl-4">
                  {calculos.creditosRemotosUsados.toLocaleString('pt-BR')} kWh × TUSD+impostos
                </span>
              </div>
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                R$ {calculos.economiaCreditosRemotos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            {/* Subtotal - Economia Bruta */}
            <div className="flex justify-between items-center py-2 border-t border-dashed">
              <span className="font-medium flex items-center gap-1">
                <Equal className="h-3 w-3" /> ECONOMIA BRUTA
              </span>
              <span className="font-mono font-medium">
                R$ {calculos.economiaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            {/* Custo Assinatura */}
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                <Minus className="h-3 w-3" /> Custo Assinatura Usina
              </span>
              <span className="font-mono font-medium text-red-600 dark:text-red-400">
                −R$ {calculos.custoAssinatura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            {/* Economia Líquida - Destaque */}
            <div className={`flex justify-between items-center py-3 px-3 -mx-3 rounded-lg mt-2 ${
              calculos.economiaTotal >= 0 
                ? 'bg-green-100 dark:bg-green-900/50' 
                : 'bg-red-100 dark:bg-red-900/50'
            }`}>
              <div className="flex flex-col">
                <span className="font-bold text-base flex items-center gap-1">
                  <Equal className="h-4 w-4" /> ECONOMIA TOTAL
                </span>
                <span className="text-xs text-muted-foreground">
                  Autoconsumo + Economia Líquida Remotos
                </span>
              </div>
              <span className={`font-mono font-bold text-xl ${
                calculos.economiaTotal >= 0 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                R$ {calculos.economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          {/* Info sobre desconto efetivo nos créditos remotos */}
          {calculos.economiaCreditosRemotos > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              <strong>Créditos Remotos:</strong> Economia líquida de R$ {calculos.economiaLiquidaRemotos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
              {' '}({calculos.descontoEfetivo}% de desconto efetivo sobre R$ {calculos.economiaCreditosRemotos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
