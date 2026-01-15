import { useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWizard } from '../WizardContext';
import { 
  PlugZap, ArrowDownRight, Info, AlertTriangle, Calculator, FileText, 
  Zap, Minus, CircleDollarSign, Battery, Receipt, Factory, Building2,
  TrendingDown, ArrowRight, CheckCircle2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVinculoByUC } from '@/hooks/useClienteUsinaVinculo';
import { useTarifas } from '@/hooks/useTarifas';
import { useRateioByUCMes } from '@/hooks/useUsinaRateioMensal';
import { calcularBalancoEnergetico, formatarKwh, formatarReais } from '@/lib/energyBalanceCalculations';

/**
 * Passo 5: Consumo SCEE e Créditos Remotos
 * 
 * CONCEITO:
 * - Consumo SCEE = consumo da rede que é COMPENSADO através de créditos de energia
 * - Créditos vêm de: injeção da usina local ou assinatura de usina remota
 * - O que é compensado = evita pagar à concessionária
 * - Mas o cliente paga ao fornecedor de energia (85% do valor, com 15% de desconto)
 * 
 * FLUXO:
 * 1. Consumo Registrado da Rede (Step 2)
 * 2. (-) Créditos aplicados = Consumo SCEE (compensado)
 * 3. (=) Consumo Não Compensado (paga fatura concessionária)
 */
export function Step5CreditosRemotos() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();

  // Buscar vínculo da UC com usina
  const { data: vinculo, isLoading: loadingVinculo } = useVinculoByUC(data.uc_id);
  
  // Buscar tarifa vigente
  const { data: tarifa } = useTarifas(
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
  // BALANÇO ENERGÉTICO
  // =====================================
  const balanco = useMemo(() => {
    return calcularBalancoEnergetico(data, isGrupoA);
  }, [data, isGrupoA]);

  // =====================================
  // CÁLCULO: CONSUMO SCEE (COMPENSADO)
  // =====================================
  const calculoSCEE = useMemo(() => {
    // Consumo registrado da rede (veio da fatura da concessionária)
    const consumoRegistradoRede = data.consumo_total_kwh || 0;
    
    // Créditos disponíveis para compensação
    // Podem vir de: rateio mensal da usina, campo SCEE da fatura, ou input manual
    const creditosDisponiveis = rateioRemoto?.energia_alocada_kwh 
      || data.scee_credito_recebido_kwh 
      || 0;

    // CONSUMO SCEE = consumo que será compensado (limitado aos créditos disponíveis)
    const consumoSCEE = Math.min(creditosDisponiveis, consumoRegistradoRede);
    
    // Consumo NÃO compensado = vai pagar na fatura da concessionária
    const consumoNaoCompensado = Math.max(0, consumoRegistradoRede - consumoSCEE);
    
    // Créditos que sobram (viram saldo para próximo mês)
    const creditosSobrando = Math.max(0, creditosDisponiveis - consumoSCEE);

    // Percentual compensado
    const percentualCompensado = consumoRegistradoRede > 0 
      ? ((consumoSCEE / consumoRegistradoRede) * 100).toFixed(1)
      : '0';

    return {
      consumoRegistradoRede,
      creditosDisponiveis,
      consumoSCEE,           // NOVO: Consumo compensado via SCEE
      consumoNaoCompensado,
      creditosSobrando,
      percentualCompensado,
    };
  }, [data.consumo_total_kwh, data.scee_credito_recebido_kwh, rateioRemoto]);

  // Auto-preencher campo credito_remoto_kwh com o consumo SCEE calculado
  useEffect(() => {
    if (
      calculoSCEE.consumoSCEE > 0 && 
      !data.credito_remoto_kwh &&
      !autoFilledRef.current
    ) {
      autoFilledRef.current = true;
      updateData({
        credito_remoto_kwh: calculoSCEE.consumoSCEE,
      });
    }
  }, [calculoSCEE.consumoSCEE, data.credito_remoto_kwh, updateData]);

  // =====================================
  // CÁLCULO: VALOR COMPENSADO (R$)
  // =====================================
  const valorCalculado = useMemo(() => {
    const consumoSCEE = data.credito_remoto_kwh || calculoSCEE.consumoSCEE;
    if (!tarifa || !consumoSCEE) return { valorBruto: 0, custoCliente: 0, economia: 0 };

    // Se PPA, usar tarifa fixa do contrato
    if (vinculo?.modalidade_economia === 'ppa_tarifa' && vinculo?.tarifa_ppa_rs_kwh) {
      const valorBruto = consumoSCEE * vinculo.tarifa_ppa_rs_kwh;
      const custoCliente = valorBruto * (percentualPago / 100);
      const economia = valorBruto - custoCliente;
      return { valorBruto, custoCliente, economia };
    }

    // Calcular com TUSD + encargos + impostos
    const tusd = isGrupoA 
      ? (tarifa.tusd_fora_ponta_rs_kwh || 0)
      : (tarifa.tusd_unica_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0);
    const encargos = tarifa.tusd_encargos_rs_kwh || 0;
    
    const impostos = {
      icms: (tarifa.icms_percent || 17) / 100,
      pis: (tarifa.pis_percent || 0.76) / 100,
      cofins: (tarifa.cofins_percent || 3.52) / 100,
    };
    const fatorImpostos = 1 - (impostos.icms + impostos.pis + impostos.cofins);

    const valorBase = consumoSCEE * (tusd + encargos);
    const valorBruto = fatorImpostos > 0 ? valorBase / fatorImpostos : valorBase;
    const custoCliente = valorBruto * (percentualPago / 100);
    const economia = valorBruto - custoCliente;

    return { valorBruto, custoCliente, economia };
  }, [tarifa, vinculo, data.credito_remoto_kwh, calculoSCEE.consumoSCEE, isGrupoA, percentualPago]);

  // Auto-atualizar valores monetários
  useEffect(() => {
    if (valorCalculado.valorBruto > 0 && !data.credito_remoto_compensado_rs) {
      updateData({ credito_remoto_compensado_rs: Math.round(valorCalculado.valorBruto * 100) / 100 });
    }
  }, [valorCalculado.valorBruto, data.credito_remoto_compensado_rs, updateData]);

  useEffect(() => {
    if (valorCalculado.custoCliente > 0 && !data.custo_assinatura_rs) {
      updateData({ custo_assinatura_rs: Math.round(valorCalculado.custoCliente * 100) / 100 });
    }
  }, [valorCalculado.custoCliente, data.custo_assinatura_rs, updateData]);

  // Validação
  useEffect(() => {
    if (!data.tem_usina_remota) {
      setCanProceed(true);
      return;
    }
    const hasValues = data.credito_remoto_kwh > 0 || data.credito_remoto_compensado_rs > 0;
    setCanProceed(hasValues);
  }, [data.tem_usina_remota, data.credito_remoto_kwh, data.credito_remoto_compensado_rs, setCanProceed]);

  // Labels do contrato
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

  // Sem usina remota
  if (!data.tem_usina_remota) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-5 w-5" />
            Passo 5 — Consumo SCEE / Créditos Remotos
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
          Passo 5 — Créditos Remotos (Injeção de outra UC)
        </CardTitle>
        <CardDescription>
          <strong>Créditos Remotos = Injeção com indicação de UC diferente.</strong> São créditos recebidos de outra 
          UC (usina remota) via sistema de compensação. O cliente paga {percentualPago}% do valor ({descontoPercent}% desconto).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Explicação conceitual */}
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
            <strong>Injeção na fatura:</strong>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li><strong>Sem UC indicada</strong> = Créditos próprios (da usina desta UC) → Step 4</li>
              <li><strong>Com UC diferente</strong> = Créditos remotos (de outra usina) → Este step</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        {/* Contrato Ativo */}
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
        {/* SEÇÃO 1: CÁLCULO DO CONSUMO SCEE */}
        {/* ============================================= */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Consumo SCEE (Compensado via Créditos)</h3>
              <p className="text-xs text-muted-foreground">
                Consumo que é abatido através do sistema de compensação de energia
              </p>
            </div>
          </div>

          {/* Cálculo visual */}
          <div className="space-y-3">
            {/* Linha 1: Consumo da Rede */}
            <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-black/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Consumo Registrado da Rede</span>
                <Badge variant="outline" className="text-xs">Step 2</Badge>
              </div>
              <span className="font-mono font-bold text-lg">
                {formatarKwh(calculoSCEE.consumoRegistradoRede)} kWh
              </span>
            </div>

            {/* Linha 2: Créditos Disponíveis */}
            <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-black/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4 text-green-500" />
                <span>Créditos Disponíveis (Usina)</span>
              </div>
              <span className="font-mono font-bold text-green-600">
                {formatarKwh(calculoSCEE.creditosDisponiveis)} kWh
              </span>
            </div>

            {/* Operação */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Minus className="h-4 w-4" />
              <span>Créditos aplicados para compensar</span>
              <ArrowRight className="h-4 w-4" />
            </div>

            {/* Linha 3: Consumo SCEE (resultado) */}
            <div className="flex items-center justify-between p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg border-2 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-blue-600" />
                <div>
                  <span className="font-bold text-blue-700 dark:text-blue-300">CONSUMO SCEE</span>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Compensado = evita pagar concessionária
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-2xl text-blue-700 dark:text-blue-300">
                  {formatarKwh(calculoSCEE.consumoSCEE)} kWh
                </span>
                <p className="text-xs text-blue-600">
                  ({calculoSCEE.percentualCompensado}% do consumo)
                </p>
              </div>
            </div>

            {/* Linha 4: Consumo Não Compensado */}
            {calculoSCEE.consumoNaoCompensado > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-700 dark:text-red-300">Consumo NÃO Compensado</span>
                </div>
                <span className="font-mono font-bold text-red-600">
                  {formatarKwh(calculoSCEE.consumoNaoCompensado)} kWh
                </span>
              </div>
            )}

            {calculoSCEE.consumoNaoCompensado === 0 && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Consumo 100% compensado via créditos!</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* ============================================= */}
        {/* SEÇÃO 2: VALORES FINANCEIROS */}
        {/* ============================================= */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4" />
            Valores Financeiros do Consumo SCEE
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input: Créditos Compensados */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Consumo SCEE Compensado (kWh)
                <Badge variant="secondary" className="text-xs gap-1">
                  <Calculator className="h-3 w-3" /> Auto
                </Badge>
              </Label>
              <Input 
                type="number"
                step="0.01"
                value={data.credito_remoto_kwh || ''} 
                onChange={(e) => {
                  autoFilledRef.current = true;
                  updateData({ credito_remoto_kwh: parseFloat(e.target.value) || 0 });
                }}
                placeholder={formatarKwh(calculoSCEE.consumoSCEE)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Sugerido: {formatarKwh(calculoSCEE.consumoSCEE)} kWh
              </p>
            </div>

            {/* Input: Valor Bruto */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Valor Bruto Compensado (R$)
                <Badge variant="secondary" className="text-xs gap-1">
                  <Calculator className="h-3 w-3" /> Auto
                </Badge>
              </Label>
              <Input 
                type="number"
                step="0.01"
                value={data.credito_remoto_compensado_rs || ''} 
                onChange={(e) => updateData({ credito_remoto_compensado_rs: parseFloat(e.target.value) || 0 })}
                placeholder={formatarReais(valorCalculado.valorBruto)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Valor que seria pago se comprasse da concessionária
              </p>
            </div>
          </div>

          {/* Resumo: Custo e Economia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Custo Assinatura */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Factory className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-700 dark:text-orange-300">Custo Assinatura</span>
                <Badge variant="outline" className="text-xs">{percentualPago}%</Badge>
              </div>
              <div className="space-y-1">
                <Input 
                  type="number"
                  step="0.01"
                  value={data.custo_assinatura_rs || ''} 
                  onChange={(e) => updateData({ custo_assinatura_rs: parseFloat(e.target.value) || 0 })}
                  placeholder={formatarReais(valorCalculado.custoCliente)}
                  className="font-mono text-lg font-bold"
                />
                <p className="text-xs text-muted-foreground">
                  O que o cliente paga ao fornecedor de energia solar
                </p>
              </div>
            </div>

            {/* Economia */}
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-300">Economia ({descontoPercent}%)</span>
              </div>
              <p className="font-mono text-2xl font-bold text-green-600">
                {formatarReais(valorCalculado.economia)}
              </p>
              <p className="text-xs text-muted-foreground">
                Economia garantida pelo desconto da assinatura
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* ============================================= */}
        {/* SEÇÃO 3: RESUMO DAS DUAS FATURAS */}
        {/* ============================================= */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Resumo: Duas Faturas
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fatura Concessionária */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-slate-600" />
                <span className="font-semibold">Fatura Concessionária</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consumo não compensado:</span>
                  <span className="font-mono">{formatarKwh(calculoSCEE.consumoNaoCompensado)} kWh</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total informado:</span>
                  <span className="font-mono font-bold text-lg">
                    {formatarReais(data.valor_total_pagar || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fatura Usina */}
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Factory className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800 dark:text-green-200">Fatura Usina (Assinatura)</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consumo SCEE:</span>
                  <span className="font-mono">{formatarKwh(data.credito_remoto_kwh || calculoSCEE.consumoSCEE)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor bruto:</span>
                  <span className="font-mono">{formatarReais(data.credito_remoto_compensado_rs || valorCalculado.valorBruto)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Desconto ({descontoPercent}%):</span>
                  <span className="font-mono">−{formatarReais(valorCalculado.economia)}</span>
                </div>
                <Separator className="bg-green-200 dark:bg-green-800" />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total a pagar:</span>
                  <span className="font-mono font-bold text-lg text-green-700 dark:text-green-300">
                    {formatarReais(data.custo_assinatura_rs || valorCalculado.custoCliente)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* ============================================= */}
        {/* SEÇÃO 4: SALDO DE CRÉDITOS */}
        {/* ============================================= */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Saldo de Créditos (Fim do Ciclo)
          </h4>

          {calculoSCEE.creditosSobrando > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Sobram <strong>{formatarKwh(calculoSCEE.creditosSobrando)} kWh</strong> de créditos 
                para o próximo mês.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Saldo Ponta (kWh)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_kwh_p || ''} 
                onChange={(e) => updateData({ scee_saldo_kwh_p: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo Fora Ponta (kWh)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_kwh_fp || ''} 
                onChange={(e) => updateData({ scee_saldo_kwh_fp: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo HR (kWh)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_kwh_hr || ''} 
                onChange={(e) => updateData({ scee_saldo_kwh_hr: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Créditos a expirar em 30 dias (kWh)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_expirar_30d_kwh || ''} 
                onChange={(e) => updateData({ scee_saldo_expirar_30d_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className={(data.scee_saldo_expirar_30d_kwh || 0) > 0 ? 'border-amber-500' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Créditos a expirar em 60 dias (kWh)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_expirar_60d_kwh || ''} 
                onChange={(e) => updateData({ scee_saldo_expirar_60d_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
