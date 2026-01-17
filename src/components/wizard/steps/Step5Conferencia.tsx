/**
 * PASSO 5 — CONFERÊNCIA E FECHAMENTO
 * Consolida todos os dados dos passos anteriores (1-4)
 * Exibe resumo financeiro, balanço energético e alertas
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWizard, FaturaWizardData } from '../WizardContext';
import { 
  ClipboardCheck, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, 
  Zap, Sun, ArrowRightLeft, Wallet, Receipt, Building2, Factory, TrendingDown, 
  Calculator, Shield, FileText, Calendar, MapPin
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ============ TIPOS ============
type AlertaWizard = { 
  tipo: string; 
  mensagem: string; 
  severidade: 'info' | 'warning' | 'error';
};

// ============ FUNÇÕES UTILITÁRIAS ============
const formatarKwh = (valor: number): string => {
  if (!valor || isNaN(valor)) return '0';
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};

const formatarReais = (valor: number): string => {
  if (!valor || isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatarPercentual = (valor: number): string => {
  if (!valor || isNaN(valor)) return '0%';
  return `${valor.toFixed(1)}%`;
};

// ============ CÁLCULO DE ALERTAS ============
function calcularAlertas(data: FaturaWizardData): AlertaWizard[] {
  const alertas: AlertaWizard[] = [];

  // Alerta de ultrapassagem de demanda
  if (data.demanda_medida_kw > data.demanda_contratada_kw && data.demanda_contratada_kw > 0) {
    const ultrapassagem = ((data.demanda_medida_kw - data.demanda_contratada_kw) / data.demanda_contratada_kw * 100);
    alertas.push({
      tipo: 'demanda',
      mensagem: `Ultrapassagem de demanda: ${data.demanda_ultrapassagem_kw?.toFixed(1) || (data.demanda_medida_kw - data.demanda_contratada_kw).toFixed(1)} kW (${ultrapassagem.toFixed(1)}%)`,
      severidade: 'error',
    });
  }

  // Alerta de energia reativa
  if ((data.ufer_fp_rs || 0) > 0) {
    alertas.push({
      tipo: 'reativo',
      mensagem: `Cobrança de energia reativa (UFER): ${formatarReais(data.ufer_fp_rs || 0)}`,
      severidade: 'warning',
    });
  }

  // Alerta de créditos a expirar
  const creditosExpirar = (data.scee_saldo_expirar_30d_kwh || 0) + (data.scee_saldo_expirar_60d_kwh || 0);
  if (creditosExpirar > 0) {
    alertas.push({
      tipo: 'creditos',
      mensagem: `${formatarKwh(creditosExpirar)} kWh de créditos a expirar nos próximos 60 dias`,
      severidade: 'info',
    });
  }

  // Alerta de consumo não compensado alto
  const consumoTotal = data.consumo_total_kwh || 0;
  const totalCreditos = (data.injecao_total_kwh || 0) + (data.credito_remoto_kwh || 0);
  const naoCompensado = Math.max(0, consumoTotal - totalCreditos - (data.autoconsumo_total_kwh || 0));
  
  if (naoCompensado > consumoTotal * 0.3 && consumoTotal > 0) {
    alertas.push({
      tipo: 'compensacao',
      mensagem: `${formatarKwh(naoCompensado)} kWh não compensado (${((naoCompensado / consumoTotal) * 100).toFixed(0)}% do consumo)`,
      severidade: 'warning',
    });
  }

  return alertas;
}

function calcularRecomendacoes(alertas: AlertaWizard[]): string[] {
  const recomendacoes: string[] = [];

  if (alertas.some(a => a.tipo === 'demanda')) {
    recomendacoes.push('Revisar demanda contratada junto à concessionária');
  }
  if (alertas.some(a => a.tipo === 'reativo')) {
    recomendacoes.push('Verificar necessidade de banco de capacitores para correção de fator de potência');
  }
  if (alertas.some(a => a.tipo === 'creditos')) {
    recomendacoes.push('Otimizar consumo para aproveitar créditos antes do vencimento');
  }
  if (alertas.some(a => a.tipo === 'compensacao')) {
    recomendacoes.push('Avaliar aumento da quota de assinatura de energia');
  }

  return recomendacoes;
}

// ============ COMPONENTE PRINCIPAL ============
export function Step5Conferencia() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const prevAlertasRef = useRef<string>('');

  // ========== DADOS DO PASSO 1 - CABEÇALHO ==========
  const dadosCabecalho = useMemo(() => ({
    ucNumero: data.uc_numero || '-',
    concessionaria: data.concessionaria || '-',
    grupoTarifario: data.grupo_tarifario || '-',
    modalidade: data.modalidade || '-',
    mesRef: data.mes_ref || '-',
    vencimento: data.vencimento || '-',
    diasFaturados: data.dias_faturados || 0,
  }), [data]);

  // ========== DADOS DO PASSO 2/3 - CONSUMO E DEMANDA ==========
  const dadosConsumo = useMemo(() => {
    const consumoTotal = data.consumo_total_kwh || 0;
    const pontaKwh = data.consumo_ponta_kwh || 0;
    const forapontaKwh = data.consumo_fora_ponta_kwh || 0;
    const reservadoKwh = data.consumo_reservado_kwh || 0;

    return {
      consumoTotal,
      pontaKwh,
      forapontaKwh,
      reservadoKwh,
      demandaContratada: data.demanda_contratada_kw || 0,
      demandaMedida: data.demanda_medida_kw || 0,
      demandaUltrapassagem: data.demanda_ultrapassagem_kw || 0,
    };
  }, [data]);

  // ========== DADOS DO PASSO 4 - GERAÇÃO DISTRIBUÍDA ==========
  const dadosGeracao = useMemo(() => {
    // Classificação GD
    const classificacaoGD = (data.classificacao_gd_aplicada as 'gd1' | 'gd2') || 'gd2';
    const anoRef = data.mes_ref ? parseInt(data.mes_ref.split('-')[0]) : new Date().getFullYear();
    // Para GD1, Fio B = 0%. Para GD2, usar percentual do ano (calculado em calculosAuto ou estimado)
    const percentualFioB = classificacaoGD === 'gd1' ? 0 : (anoRef >= 2029 ? 100 : (anoRef - 2023) * 15);

    // Geração Local (Autoconsumo) - kWh
    const autoconsumoTotal = isGrupoA
      ? (data.autoconsumo_ponta_kwh || 0) + (data.autoconsumo_fp_kwh || 0) + (data.autoconsumo_hr_kwh || 0)
      : (data.autoconsumo_total_kwh || 0);
    const autoconsumoRs = data.autoconsumo_rs || 0;
    
    // Autoconsumo R$ por posto (Cost Avoidance)
    const autoconsumoPontaRs = data.autoconsumo_ponta_rs || 0;
    const autoconsumoFPRs = data.autoconsumo_fp_rs || 0;
    const autoconsumoHRRs = data.autoconsumo_hr_rs || 0;

    // Injeção
    const injecaoTotal = isGrupoA
      ? (data.injecao_ponta_kwh || 0) + (data.injecao_fp_kwh || 0) + (data.injecao_hr_kwh || 0)
      : (data.injecao_total_kwh || 0);

    // Créditos Remotos - kWh
    const creditoRemotoKwh = data.credito_remoto_kwh || 0;
    const creditoRemotoPonta = data.credito_remoto_ponta_kwh || 0;
    const creditoRemotoFP = data.credito_remoto_fp_kwh || 0;
    const creditoRemotoHR = data.credito_remoto_hr_kwh || 0;
    
    // Créditos Remotos R$ por posto (Cost Avoidance)
    const creditoRemotoPontaRs = data.credito_remoto_ponta_rs || 0;
    const creditoRemotoFPRs = data.credito_remoto_fp_rs || 0;
    const creditoRemotoHRRs = data.credito_remoto_hr_rs || 0;
    
    // CORRIGIDO: Total R$ deve ser a soma dos postos quando há detalhamento
    const temDetalhePosto = isGrupoA && (creditoRemotoPonta > 0 || creditoRemotoFP > 0 || creditoRemotoHR > 0);
    const creditoRemotoRs = temDetalhePosto 
      ? (creditoRemotoPontaRs + creditoRemotoFPRs + creditoRemotoHRRs)
      : (data.credito_remoto_compensado_rs || 0);
    
    // CORRIGIDO: Autoconsumo R$ também deve ser a soma dos postos quando há detalhamento
    const autoconsumoRsCorrigido = isGrupoA && (data.autoconsumo_ponta_kwh || data.autoconsumo_fp_kwh || data.autoconsumo_hr_kwh)
      ? (autoconsumoPontaRs + autoconsumoFPRs + autoconsumoHRRs)
      : autoconsumoRs;

    // Valores financeiros calculados no Step 4
    const custoAssinatura = data.custo_assinatura_rs || 0;
    const economiaLiquida = data.economia_liquida_rs || 0;

    return {
      classificacaoGD,
      anoRef,
      percentualFioB,
      temGeracaoLocal: data.tem_geracao_local || false,
      temUsinaRemota: data.tem_usina_remota || false,
      autoconsumoTotal,
      autoconsumoRs: autoconsumoRsCorrigido,
      autoconsumoPontaRs,
      autoconsumoFPRs,
      autoconsumoHRRs,
      injecaoTotal,
      creditoRemotoKwh,
      creditoRemotoPonta,
      creditoRemotoFP,
      creditoRemotoHR,
      creditoRemotoRs,
      creditoRemotoPontaRs,
      creditoRemotoFPRs,
      creditoRemotoHRRs,
      custoAssinatura,
      economiaLiquida,
    };
  }, [data, isGrupoA]);

  // ========== BALANÇO ENERGÉTICO ==========
  const balancoEnergetico = useMemo(() => {
    const consumoDaRede = dadosConsumo.consumoTotal;
    const autoconsumo = dadosGeracao.autoconsumoTotal;
    const injecaoLocal = dadosGeracao.injecaoTotal;
    const creditosRemotos = dadosGeracao.creditoRemotoKwh;
    const totalCreditos = injecaoLocal + creditosRemotos;
    const consumoCompensado = Math.min(consumoDaRede, totalCreditos);
    const consumoNaoCompensado = Math.max(0, consumoDaRede - totalCreditos);
    const creditosSobrando = Math.max(0, totalCreditos - consumoDaRede);

    return {
      consumoDaRede,
      autoconsumo,
      injecaoLocal,
      creditosRemotos,
      totalCreditos,
      consumoCompensado,
      consumoNaoCompensado,
      creditosSobrando,
    };
  }, [dadosConsumo, dadosGeracao]);

  // ========== RESUMO FINANCEIRO ==========
  const resumoFinanceiro = useMemo(() => {
    // Total compensado = autoconsumo + créditos remotos (em R$)
    const totalCompensado = dadosGeracao.autoconsumoRs + dadosGeracao.creditoRemotoRs;

    // Custo e economia calculados no Step 4
    const custoAssinatura = dadosGeracao.custoAssinatura;
    const economiaLiquida = dadosGeracao.economiaLiquida || (totalCompensado - custoAssinatura);

    // Fatura concessionária
    const faturaConcessionaria = data.valor_total_pagar || 0;

    // Total a pagar = fatura + custo assinatura
    const totalAPagar = faturaConcessionaria + custoAssinatura;

    return {
      autoconsumoRs: dadosGeracao.autoconsumoRs,
      creditoRemotoRs: dadosGeracao.creditoRemotoRs,
      totalCompensado,
      custoAssinatura,
      economiaLiquida,
      faturaConcessionaria,
      totalAPagar,
    };
  }, [data, dadosGeracao]);

  // ========== ALERTAS E RECOMENDAÇÕES ==========
  const alertas = useMemo(() => calcularAlertas(data), [data]);
  const recomendacoes = useMemo(() => calcularRecomendacoes(alertas), [alertas]);

  // Atualizar dados com alertas e recomendações
  useEffect(() => {
    const alertasJson = JSON.stringify(alertas);
    const recsJson = JSON.stringify(recomendacoes);
    const currentHash = `${alertasJson}|${recsJson}`;
    
    if (prevAlertasRef.current !== currentHash) {
      prevAlertasRef.current = currentHash;
      updateData({ alertas, recomendacoes });
    }
  }, [alertas, recomendacoes, updateData]);

  // Sempre pode prosseguir na conferência
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  // ========== RENDER ==========
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Passo 5 — Conferência e Fechamento
        </CardTitle>
        <CardDescription>
          Resumo consolidado dos dados informados nos passos anteriores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* === CONTEXTO (Passo 1) === */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Contexto da Fatura
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">UC:</span>
              <p className="font-medium">{dadosCabecalho.ucNumero}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Mês Ref:</span>
              <p className="font-medium">{dadosCabecalho.mesRef}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Grupo:</span>
              <p className="font-medium">{dadosCabecalho.grupoTarifario} - {dadosCabecalho.modalidade}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Dias Faturados:</span>
              <p className="font-medium">{dadosCabecalho.diasFaturados}</p>
            </div>
          </div>
        </div>

        {/* === CLASSIFICAÇÃO GD (Passo 4) === */}
        {(dadosGeracao.temGeracaoLocal || dadosGeracao.temUsinaRemota) && (
          <Alert className={dadosGeracao.classificacaoGD === 'gd1' 
            ? "bg-green-50 border-green-300 dark:bg-green-950/30"
            : "bg-amber-50 border-amber-300 dark:bg-amber-950/30"
          }>
            <Shield className={`h-4 w-4 ${dadosGeracao.classificacaoGD === 'gd1' ? 'text-green-600' : 'text-amber-600'}`} />
            <AlertDescription>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <strong>{dadosGeracao.classificacaoGD.toUpperCase()}</strong> — Ano {dadosGeracao.anoRef}
                </div>
                <div className="text-sm">
                  {dadosGeracao.classificacaoGD === 'gd1'
                    ? 'Compensação integral (TE + TUSD + Encargos)'
                    : `Fio B não compensável: ${dadosGeracao.percentualFioB}%`}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* === RESUMO FINANCEIRO CONSOLIDADO === */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Resumo Financeiro Consolidado
          </h4>
          
          {/* Cards das Duas Faturas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fatura Concessionária */}
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800 dark:text-orange-200">Fatura Concessionária</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consumo não compensado:</span>
                  <span>{formatarKwh(balancoEnergetico.consumoNaoCompensado)} kWh</span>
                </div>
                <Separator className="bg-orange-200 dark:bg-orange-800" />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total a pagar:</span>
                  <span className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    {formatarReais(resumoFinanceiro.faturaConcessionaria)}
                  </span>
                </div>
              </div>
            </div>

            {/* Compensação / Economia */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Factory className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">Compensação (Cost Avoidance)</span>
              </div>
              <div className="space-y-2 text-sm">
                {/* Autoconsumo */}
                {dadosGeracao.temGeracaoLocal && resumoFinanceiro.autoconsumoRs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Geração Simultânea:</span>
                    <span className="font-medium">{formatarReais(resumoFinanceiro.autoconsumoRs)}</span>
                  </div>
                )}
                
                {/* Créditos Remotos */}
                {dadosGeracao.temUsinaRemota && resumoFinanceiro.creditoRemotoRs > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Créditos Alocados ({formatarKwh(dadosGeracao.creditoRemotoKwh)} kWh):</span>
                      <span className="font-medium">{formatarReais(resumoFinanceiro.creditoRemotoRs)}</span>
                    </div>
                    {/* Detalhamento por Posto */}
                    {isGrupoA && (dadosGeracao.creditoRemotoPonta > 0 || dadosGeracao.creditoRemotoFP > 0 || dadosGeracao.creditoRemotoHR > 0) && (
                      <div className="pl-4 text-xs space-y-0.5 border-l-2 border-green-300 dark:border-green-700 ml-2">
                        {dadosGeracao.creditoRemotoPonta > 0 && (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">• Ponta: {formatarKwh(dadosGeracao.creditoRemotoPonta)} kWh</span>
                            <span className="font-medium text-green-600">{formatarReais(dadosGeracao.creditoRemotoPontaRs)}</span>
                          </div>
                        )}
                        {dadosGeracao.creditoRemotoFP > 0 && (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">• Fora Ponta: {formatarKwh(dadosGeracao.creditoRemotoFP)} kWh</span>
                            <span className="font-medium text-green-600">{formatarReais(dadosGeracao.creditoRemotoFPRs)}</span>
                          </div>
                        )}
                        {dadosGeracao.creditoRemotoHR > 0 && (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">• Reservado: {formatarKwh(dadosGeracao.creditoRemotoHR)} kWh</span>
                            <span className="font-medium text-green-600">{formatarReais(dadosGeracao.creditoRemotoHRRs)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <Separator className="bg-green-200 dark:bg-green-800" />
                
                {/* Total Compensado */}
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Compensado:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatarReais(resumoFinanceiro.totalCompensado)}
                  </span>
                </div>
                
                {/* Custo Assinatura e Economia */}
                {resumoFinanceiro.custoAssinatura > 0 && (
                  <>
                    <div className="flex justify-between text-amber-600">
                      <span className="text-muted-foreground">Custo Assinatura (85%):</span>
                      <span className="font-medium">- {formatarReais(resumoFinanceiro.custoAssinatura)}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-semibold">Economia Líquida (15%):</span>
                      <span className="font-bold">{formatarReais(resumoFinanceiro.economiaLiquida)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Total Consolidado */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="font-medium">TOTAL A PAGAR NO MÊS</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {formatarReais(resumoFinanceiro.totalAPagar)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fatura Concessionária ({formatarReais(resumoFinanceiro.faturaConcessionaria)}) + Custo Assinatura ({formatarReais(resumoFinanceiro.custoAssinatura)})
            </p>
          </div>

          {/* Economia do Mês */}
          {resumoFinanceiro.economiaLiquida > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-800 dark:text-emerald-200">Economia do Mês</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Compensado:</span>
                  <span className="text-emerald-600 font-medium">
                    {formatarReais(resumoFinanceiro.totalCompensado)}
                  </span>
                </div>
                {resumoFinanceiro.custoAssinatura > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(-) Custo Assinatura (85%):</span>
                    <span className="text-amber-600 font-medium">
                      - {formatarReais(resumoFinanceiro.custoAssinatura)}
                    </span>
                  </div>
                )}
                <Separator className="bg-emerald-200 dark:bg-emerald-800" />
                <div className="flex justify-between items-center">
                  <span className="font-bold">ECONOMIA LÍQUIDA:</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatarReais(resumoFinanceiro.economiaLiquida)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* === BALANÇO ENERGÉTICO === */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Balanço Energético (kWh)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Consumo Rede</span>
              </div>
              <p className="text-lg font-bold">{formatarKwh(balancoEnergetico.consumoDaRede)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Sun className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-muted-foreground">Autoconsumo</span>
              </div>
              <p className="text-lg font-bold text-yellow-600">{formatarKwh(balancoEnergetico.autoconsumo)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Total Créditos</span>
              </div>
              <p className="text-lg font-bold text-blue-600">{formatarKwh(balancoEnergetico.totalCreditos)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Não Compensado</span>
              </div>
              <p className={`text-lg font-bold ${balancoEnergetico.consumoNaoCompensado > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatarKwh(balancoEnergetico.consumoNaoCompensado)}
              </p>
            </div>
          </div>
          
          {/* Detalhes Consumo por Posto (Grupo A) */}
          {isGrupoA && (
            <Collapsible open={detalhesAberto} onOpenChange={setDetalhesAberto} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
                  <span className="text-sm">Detalhes por Posto Horário</span>
                  {detalhesAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="grid grid-cols-3 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                  <div>
                    <span className="text-muted-foreground text-xs">Ponta</span>
                    <p className="font-medium">{formatarKwh(dadosConsumo.pontaKwh)} kWh</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Fora Ponta</span>
                    <p className="font-medium">{formatarKwh(dadosConsumo.forapontaKwh)} kWh</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Reservado</span>
                    <p className="font-medium">{formatarKwh(dadosConsumo.reservadoKwh)} kWh</p>
                  </div>
                  {dadosConsumo.demandaContratada > 0 && (
                    <>
                      <div>
                        <span className="text-muted-foreground text-xs">Demanda Contratada</span>
                        <p className="font-medium">{dadosConsumo.demandaContratada.toFixed(0)} kW</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Demanda Medida</span>
                        <p className="font-medium">{dadosConsumo.demandaMedida.toFixed(0)} kW</p>
                      </div>
                      {dadosConsumo.demandaUltrapassagem > 0 && (
                        <div>
                          <span className="text-muted-foreground text-xs">Ultrapassagem</span>
                          <p className="font-medium text-destructive">{dadosConsumo.demandaUltrapassagem.toFixed(1)} kW</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* === ALERTAS OPERACIONAIS === */}
        {alertas.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas Operacionais
              </h4>
              <div className="space-y-2">
                {alertas.map((alerta, index) => (
                  <Alert key={index} variant={alerta.severidade === 'error' ? 'destructive' : 'default'}
                    className={
                      alerta.severidade === 'warning' 
                        ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' 
                        : alerta.severidade === 'info'
                        ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/30'
                        : ''
                    }
                  >
                    {alerta.severidade === 'error' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : alerta.severidade === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Info className="h-4 w-4 text-blue-600" />
                    )}
                    <AlertDescription>{alerta.mensagem}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          </>
        )}

        {/* === RECOMENDAÇÕES === */}
        {recomendacoes.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Recomendações
              </h4>
              <ul className="space-y-2">
                {recomendacoes.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

      </CardContent>
    </Card>
  );
}

// Alias para compatibilidade
export const Step7Conferencia = Step5Conferencia;
