import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Receipt, AlertCircle, Sparkles, RefreshCw, Calculator, Info, ArrowDown, ArrowUp, Zap, Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TarifaInfo, useTarifaAtual } from '../TarifaInfo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FormulaTooltip } from '../FormulaTooltip';
import { classificarGD, obterPercentualFioB, type ClassificacaoGD } from '@/lib/lei14300';

export function Step5ItensFatura() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();
  const tarifa = useTarifaAtual();
  
  // Track which fields were auto-filled
  const [autoFilled, setAutoFilled] = useState({
    bandeira_te_p: false,
    bandeira_te_fp: false,
    bandeira_te_hr: false,
    tusd_p: false,
    tusd_fp: false,
    tusd_hr: false,
    te_p: false,
    te_fp: false,
    te_hr: false,
    scee_consumo_fp_tusd: false,
    scee_parcela_te_fp: false,
    scee_injecao_fp_te: false,
    scee_injecao_fp_tusd: false,
  });

  // =====================================
  // CLASSIFICAÇÃO GD1/GD2 (Lei 14.300)
  // =====================================
  const classificacaoGD = useMemo((): { 
    tipo: ClassificacaoGD; 
    percentualFioB: number;
    anoRef: number;
  } => {
    // Determinar ano de referência
    const anoRef = data.mes_ref 
      ? parseInt(data.mes_ref.split('-')[0]) 
      : new Date().getFullYear();
    
    // Por padrão, usar GD2 (mais conservador)
    // TODO: Buscar data_protocolo_gd da UC ou usina remota para determinar GD1
    const tipo = 'gd2' as ClassificacaoGD;
    
    // Percentual de Fio B para GD2 no ano de referência
    // GD1 = 0% (compensa tudo), GD2 = conforme escalonamento
    const percentualFioB = obterPercentualFioB(anoRef);
    
    return { tipo, percentualFioB, anoRef };
  }, [data.mes_ref]);

  // =====================================
  // CÁLCULO: CRÉDITOS E COMPENSAÇÃO
  // =====================================
  const creditosInfo = useMemo(() => {
    // Créditos Próprios = Injeção local (sem indicação de UC)
    const creditosProprios = isGrupoA
      ? (data.injecao_ponta_kwh || 0) + (data.injecao_fp_kwh || 0) + (data.injecao_hr_kwh || 0)
      : (data.injecao_total_kwh || 0);
    
    // Créditos Remotos = Injeção de outra UC (com indicação de UC diferente)
    const creditosRemotos = data.credito_remoto_kwh || data.scee_credito_recebido_kwh || 0;
    
    // Total de créditos disponíveis
    const totalCreditos = creditosProprios + creditosRemotos;
    
    // Consumo da rede
    const consumoRede = data.consumo_total_kwh || 0;
    
    // Consumo compensado (SCEE)
    const consumoCompensado = Math.min(consumoRede, totalCreditos);
    
    // Consumo não compensado (paga na fatura da concessionária)
    const consumoNaoCompensado = Math.max(0, consumoRede - totalCreditos);
    
    // Créditos não utilizados (saldo)
    const creditosSobrando = Math.max(0, totalCreditos - consumoRede);
    
    return {
      creditosProprios,
      creditosRemotos,
      totalCreditos,
      consumoRede,
      consumoCompensado,
      consumoNaoCompensado,
      creditosSobrando,
    };
  }, [data, isGrupoA]);

  // Calcular consumo não compensado por posto (para Grupo A)
  const consumoNaoCompensadoPorPosto = useMemo(() => {
    if (!isGrupoA) {
      return { 
        ponta: 0, 
        fp: creditosInfo.consumoNaoCompensado, 
        hr: 0, 
        total: creditosInfo.consumoNaoCompensado 
      };
    }
    
    // Consumo por posto (usando campos corretos do wizard)
    const pontaConsumo = data.consumo_ponta_kwh || 0;
    const fpConsumo = data.consumo_fora_ponta_kwh || 0;
    const ponta = Math.max(0, pontaConsumo - (data.autoconsumo_ponta_kwh || 0));
    const fp = Math.max(0, fpConsumo - (data.autoconsumo_fp_kwh || 0));
    const hr = Math.max(0, (data.consumo_reservado_kwh || 0) - (data.autoconsumo_hr_kwh || 0));
    
    // Proporcionalizar o consumo não compensado
    const total = ponta + fp + hr;
    if (total === 0) return { ponta: 0, fp: 0, hr: 0, total: 0 };
    
    const fator = creditosInfo.consumoNaoCompensado / total;
    
    return {
      ponta: ponta * fator,
      fp: fp * fator,
      hr: hr * fator,
      total: creditosInfo.consumoNaoCompensado,
    };
  }, [data, isGrupoA, creditosInfo]);

  // Calcular valores sugeridos baseado na tarifa e classificação GD
  const valoresCalculados = useMemo(() => {
    if (!tarifa) return null;
    
    // Determinar bandeira atual baseada na seleção do usuário
    const bandeira = data.bandeira || 'verde';
    let bandeiraTarifa = 0;
    switch (bandeira) {
      case 'verde':
        bandeiraTarifa = tarifa.bandeira_verde_rs_kwh || 0;
        break;
      case 'amarela':
        bandeiraTarifa = tarifa.bandeira_amarela_rs_kwh || 0;
        break;
      case 'vermelha1':
        bandeiraTarifa = tarifa.bandeira_vermelha1_rs_kwh || 0;
        break;
      case 'vermelha2':
        bandeiraTarifa = tarifa.bandeira_vermelha2_rs_kwh || 0;
        break;
    }
    
    // =========================================
    // SCEE - COMPENSAÇÃO CONFORME LEI 14.300
    // =========================================
    const consumoCompensado = creditosInfo.consumoCompensado;
    const injecaoTotal = creditosInfo.creditosProprios;
    
    // Componentes tarifários
    const te = tarifa.te_fora_ponta_rs_kwh || tarifa.te_unica_rs_kwh || 0;
    const tusdCompleta = tarifa.tusd_fora_ponta_rs_kwh || tarifa.tusd_unica_rs_kwh || 0;
    const tusdFioA = tarifa.tusd_fio_a_rs_kwh || 0;
    const tusdFioB = tarifa.tusd_fio_b_rs_kwh || 0;
    const tusdEncargos = tarifa.tusd_encargos_rs_kwh || 0;
    
    // GD1: Compensa TE + TUSD (tudo) + Encargos + Bandeiras
    // GD2: Compensa TE + Fio A + parte do Fio B (conforme ano)
    const isGD1 = classificacaoGD.tipo === 'gd1';
    
    let scee_consumo_fp_tusd: number;
    let scee_parcela_te_fp: number;
    let scee_injecao_fp_te: number;
    let scee_injecao_fp_tusd: number;
    let encargosNaoCompensados = 0;
    let fioBNaoCompensado = 0;
    
    if (isGD1) {
      // GD1: COMPENSAÇÃO INTEGRAL (TE + TUSD + Encargos)
      scee_consumo_fp_tusd = consumoCompensado * tusdCompleta;
      scee_parcela_te_fp = consumoCompensado * te;
      
      // Injeção também compensa tudo
      scee_injecao_fp_te = -(injecaoTotal * te);
      scee_injecao_fp_tusd = -(injecaoTotal * tusdCompleta);
    } else {
      // GD2: COMPENSAÇÃO PARCIAL
      // TE: Sempre compensa
      scee_parcela_te_fp = consumoCompensado * te;
      
      // TUSD: Fio A sempre + Fio B parcial (conforme percentual do ano)
      const percentualFioBNaoCompensavel = classificacaoGD.percentualFioB / 100;
      const fioBCompensavel = tusdFioB * (1 - percentualFioBNaoCompensavel);
      fioBNaoCompensado = tusdFioB * percentualFioBNaoCompensavel * consumoCompensado;
      
      // TUSD compensável = Fio A + parte do Fio B
      const tusdCompensavel = tusdFioA + fioBCompensavel;
      scee_consumo_fp_tusd = consumoCompensado * tusdCompensavel;
      
      // Encargos NÃO compensam para GD2
      encargosNaoCompensados = tusdEncargos * consumoCompensado;
      
      // Injeção gera créditos apenas sobre o que é compensável
      scee_injecao_fp_te = -(injecaoTotal * te);
      scee_injecao_fp_tusd = -(injecaoTotal * tusdCompensavel);
    }
    
    if (isGrupoA) {
      const pontaConsumo = data.consumo_ponta_kwh || 0;
      const fpConsumo = data.consumo_fora_ponta_kwh || 0;
      return {
        // Bandeiras - aplica sobre consumo total de cada posto
        bandeira_te_p: pontaConsumo * bandeiraTarifa,
        bandeira_te_fp: fpConsumo * bandeiraTarifa,
        bandeira_te_hr: (data.consumo_reservado_kwh || 0) * bandeiraTarifa,
        
        // TUSD não compensado
        tusd_p: consumoNaoCompensadoPorPosto.ponta * (tarifa.tusd_ponta_rs_kwh || 0),
        tusd_fp: consumoNaoCompensadoPorPosto.fp * (tarifa.tusd_fora_ponta_rs_kwh || 0),
        tusd_hr: consumoNaoCompensadoPorPosto.hr * (tarifa.tusd_reservado_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0),
        
        // TE não compensado
        te_p: consumoNaoCompensadoPorPosto.ponta * (tarifa.te_ponta_rs_kwh || 0),
        te_fp: consumoNaoCompensadoPorPosto.fp * (tarifa.te_fora_ponta_rs_kwh || 0),
        te_hr: consumoNaoCompensadoPorPosto.hr * (tarifa.te_reservado_rs_kwh || tarifa.te_fora_ponta_rs_kwh || 0),
        
        // SCEE
        scee_consumo_fp_tusd,
        scee_parcela_te_fp,
        scee_injecao_fp_te,
        scee_injecao_fp_tusd,
        
        // Não compensáveis (apenas GD2)
        encargosNaoCompensados,
        fioBNaoCompensado,
      };
    } else {
      // Grupo B - tarifa única
      const consumoTotal = data.consumo_total_kwh || 0;
      return {
        bandeira_te_p: 0,
        bandeira_te_fp: consumoTotal * bandeiraTarifa,
        bandeira_te_hr: 0,
        tusd_p: 0,
        tusd_fp: consumoNaoCompensadoPorPosto.total * (tarifa.tusd_unica_rs_kwh || 0),
        tusd_hr: 0,
        te_p: 0,
        te_fp: consumoNaoCompensadoPorPosto.total * (tarifa.te_unica_rs_kwh || 0),
        te_hr: 0,
        // SCEE
        scee_consumo_fp_tusd,
        scee_parcela_te_fp,
        scee_injecao_fp_te,
        scee_injecao_fp_tusd,
        
        // Não compensáveis (apenas GD2)
        encargosNaoCompensados,
        fioBNaoCompensado,
      };
    }
  }, [tarifa, data, creditosInfo, consumoNaoCompensadoPorPosto, isGrupoA, classificacaoGD]);

  // Auto-preencher valores quando tarifa disponível e campos vazios
  useEffect(() => {
    if (!valoresCalculados || !tarifa) return;
    
    const updates: Record<string, number> = {};
    const newAutoFilled = { ...autoFilled };
    
    // Bandeiras
    if (data.bandeira_te_p_rs === 0 && valoresCalculados.bandeira_te_p > 0) {
      updates.bandeira_te_p_rs = parseFloat(valoresCalculados.bandeira_te_p.toFixed(2));
      newAutoFilled.bandeira_te_p = true;
    }
    if (data.bandeira_te_fp_rs === 0 && valoresCalculados.bandeira_te_fp > 0) {
      updates.bandeira_te_fp_rs = parseFloat(valoresCalculados.bandeira_te_fp.toFixed(2));
      newAutoFilled.bandeira_te_fp = true;
    }
    if (data.bandeira_te_hr_rs === 0 && valoresCalculados.bandeira_te_hr > 0) {
      updates.bandeira_te_hr_rs = parseFloat(valoresCalculados.bandeira_te_hr.toFixed(2));
      newAutoFilled.bandeira_te_hr = true;
    }
    
    // TUSD
    if (data.nao_compensado_tusd_p_rs === 0 && valoresCalculados.tusd_p > 0) {
      updates.nao_compensado_tusd_p_rs = parseFloat(valoresCalculados.tusd_p.toFixed(2));
      newAutoFilled.tusd_p = true;
    }
    if (data.nao_compensado_tusd_fp_rs === 0 && valoresCalculados.tusd_fp > 0) {
      updates.nao_compensado_tusd_fp_rs = parseFloat(valoresCalculados.tusd_fp.toFixed(2));
      newAutoFilled.tusd_fp = true;
    }
    if (data.nao_compensado_tusd_hr_rs === 0 && valoresCalculados.tusd_hr > 0) {
      updates.nao_compensado_tusd_hr_rs = parseFloat(valoresCalculados.tusd_hr.toFixed(2));
      newAutoFilled.tusd_hr = true;
    }
    
    // TE
    if (data.nao_compensado_te_p_rs === 0 && valoresCalculados.te_p > 0) {
      updates.nao_compensado_te_p_rs = parseFloat(valoresCalculados.te_p.toFixed(2));
      newAutoFilled.te_p = true;
    }
    if (data.nao_compensado_te_fp_rs === 0 && valoresCalculados.te_fp > 0) {
      updates.nao_compensado_te_fp_rs = parseFloat(valoresCalculados.te_fp.toFixed(2));
      newAutoFilled.te_fp = true;
    }
    if (data.nao_compensado_te_hr_rs === 0 && valoresCalculados.te_hr > 0) {
      updates.nao_compensado_te_hr_rs = parseFloat(valoresCalculados.te_hr.toFixed(2));
      newAutoFilled.te_hr = true;
    }
    
    // SCEE
    if (data.scee_consumo_fp_tusd_rs === 0 && valoresCalculados.scee_consumo_fp_tusd > 0) {
      updates.scee_consumo_fp_tusd_rs = parseFloat(valoresCalculados.scee_consumo_fp_tusd.toFixed(2));
      newAutoFilled.scee_consumo_fp_tusd = true;
    }
    if (data.scee_parcela_te_fp_rs === 0 && valoresCalculados.scee_parcela_te_fp > 0) {
      updates.scee_parcela_te_fp_rs = parseFloat(valoresCalculados.scee_parcela_te_fp.toFixed(2));
      newAutoFilled.scee_parcela_te_fp = true;
    }
    if (data.scee_injecao_fp_te_rs === 0 && valoresCalculados.scee_injecao_fp_te < 0) {
      updates.scee_injecao_fp_te_rs = parseFloat(valoresCalculados.scee_injecao_fp_te.toFixed(2));
      newAutoFilled.scee_injecao_fp_te = true;
    }
    if (data.scee_injecao_fp_tusd_rs === 0 && valoresCalculados.scee_injecao_fp_tusd < 0) {
      updates.scee_injecao_fp_tusd_rs = parseFloat(valoresCalculados.scee_injecao_fp_tusd.toFixed(2));
      newAutoFilled.scee_injecao_fp_tusd = true;
    }
    
    if (Object.keys(updates).length > 0) {
      updateData(updates);
      setAutoFilled(newAutoFilled);
    }
  }, [valoresCalculados, tarifa]);

  // Recalcular todos os valores
  const recalcularTodos = useCallback(() => {
    if (!valoresCalculados) return;
    
    updateData({
      bandeira_te_p_rs: parseFloat(valoresCalculados.bandeira_te_p.toFixed(2)),
      bandeira_te_fp_rs: parseFloat(valoresCalculados.bandeira_te_fp.toFixed(2)),
      bandeira_te_hr_rs: parseFloat(valoresCalculados.bandeira_te_hr.toFixed(2)),
      nao_compensado_tusd_p_rs: parseFloat(valoresCalculados.tusd_p.toFixed(2)),
      nao_compensado_tusd_fp_rs: parseFloat(valoresCalculados.tusd_fp.toFixed(2)),
      nao_compensado_tusd_hr_rs: parseFloat(valoresCalculados.tusd_hr.toFixed(2)),
      nao_compensado_te_p_rs: parseFloat(valoresCalculados.te_p.toFixed(2)),
      nao_compensado_te_fp_rs: parseFloat(valoresCalculados.te_fp.toFixed(2)),
      nao_compensado_te_hr_rs: parseFloat(valoresCalculados.te_hr.toFixed(2)),
      scee_consumo_fp_tusd_rs: parseFloat(valoresCalculados.scee_consumo_fp_tusd.toFixed(2)),
      scee_parcela_te_fp_rs: parseFloat(valoresCalculados.scee_parcela_te_fp.toFixed(2)),
      scee_injecao_fp_te_rs: parseFloat(valoresCalculados.scee_injecao_fp_te.toFixed(2)),
      scee_injecao_fp_tusd_rs: parseFloat(valoresCalculados.scee_injecao_fp_tusd.toFixed(2)),
    });
    
    setAutoFilled({
      bandeira_te_p: true,
      bandeira_te_fp: true,
      bandeira_te_hr: true,
      tusd_p: true,
      tusd_fp: true,
      tusd_hr: true,
      te_p: true,
      te_fp: true,
      te_hr: true,
      scee_consumo_fp_tusd: true,
      scee_parcela_te_fp: true,
      scee_injecao_fp_te: true,
      scee_injecao_fp_tusd: true,
    });
  }, [valoresCalculados, updateData]);

  // Validação - sempre permite prosseguir
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Calcular totais por categoria
  const totalBandeiras = 
    (data.bandeira_te_p_rs || 0) + 
    (data.bandeira_te_fp_rs || 0) + 
    (data.bandeira_te_hr_rs || 0);

  const totalNaoCompensadoTUSD = 
    (data.nao_compensado_tusd_p_rs || 0) + 
    (data.nao_compensado_tusd_fp_rs || 0) + 
    (data.nao_compensado_tusd_hr_rs || 0);

  const totalNaoCompensadoTE = 
    (data.nao_compensado_te_p_rs || 0) + 
    (data.nao_compensado_te_fp_rs || 0) + 
    (data.nao_compensado_te_hr_rs || 0);

  const totalSCEE = 
    (data.scee_consumo_fp_tusd_rs || 0) + 
    (data.scee_parcela_te_fp_rs || 0) + 
    (data.scee_injecao_fp_te_rs || 0) + 
    (data.scee_injecao_fp_tusd_rs || 0);

  const AutoBadge = ({ show }: { show: boolean }) => {
    if (!show) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="ml-2 gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              Auto
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Valor calculado automaticamente pela tarifa</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Passo 5 — Itens de Fatura
        </CardTitle>
        <CardDescription>
          Decomposição TE/TUSD/Bandeira para auditoria e raio-x da fatura
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Classificação GD - Lei 14.300 */}
        <Alert className={classificacaoGD.tipo === 'gd1' 
          ? "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700"
          : "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700"
        }>
          <Shield className={`h-4 w-4 ${classificacaoGD.tipo === 'gd1' ? 'text-green-600' : 'text-amber-600'}`} />
          <AlertDescription className={classificacaoGD.tipo === 'gd1' ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <strong className="text-base">
                  Classificação: {classificacaoGD.tipo.toUpperCase()}
                </strong>
                <span className="ml-2 text-sm">
                  (Ano ref: {classificacaoGD.anoRef})
                </span>
              </div>
              <Badge variant="outline" className={classificacaoGD.tipo === 'gd1' 
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
              }>
                {classificacaoGD.tipo === 'gd1' ? 'Direito Adquirido' : `Fio B: ${classificacaoGD.percentualFioB}% não compensável`}
              </Badge>
            </div>
            <p className="mt-2 text-sm">
              {classificacaoGD.tipo === 'gd1' 
                ? '✓ Compensa integralmente: TE + TUSD (Fio A + Fio B) + Encargos + Bandeiras'
                : `⚠ GD2: Compensa TE + Fio A + ${100 - classificacaoGD.percentualFioB}% Fio B. NÃO compensa: Encargos e ${classificacaoGD.percentualFioB}% Fio B`
              }
            </p>
          </AlertDescription>
        </Alert>

        {/* Explicação conceitual: Créditos */}
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Injeção = Créditos Recebidos:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Próprios
                </Badge>
                <span>Injeção <strong>sem indicação de UC</strong> = créditos da própria usina</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-xs">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  Remotos
                </Badge>
                <span>Injeção <strong>com UC diferente</strong> = créditos de outra usina (assinatura)</span>
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Resumo de Créditos e Compensação */}
        <div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-primary" />
            <h4 className="font-medium">Balanço de Créditos (kWh)</h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-background rounded-lg">
              <span className="text-muted-foreground text-xs uppercase">Consumo Rede</span>
              <p className="text-lg font-bold">{creditosInfo.consumoRede.toLocaleString('pt-BR')}</p>
            </div>
            
            <div className="p-3 bg-green-500/10 rounded-lg">
              <span className="text-green-700 dark:text-green-400 text-xs uppercase flex items-center gap-1">
                <ArrowUp className="h-3 w-3" /> Créditos Próprios
              </span>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">
                {creditosInfo.creditosProprios.toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <span className="text-purple-700 dark:text-purple-400 text-xs uppercase flex items-center gap-1">
                <ArrowDown className="h-3 w-3" /> Créditos Remotos
              </span>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                {creditosInfo.creditosRemotos.toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="p-3 bg-background rounded-lg border-2 border-primary/30">
              <span className="text-muted-foreground text-xs uppercase">Total Créditos</span>
              <p className="text-lg font-bold text-primary">
                {creditosInfo.totalCreditos.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          
          {/* Resultado da compensação */}
          <div className="mt-4 pt-4 border-t border-primary/20">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <span className="text-muted-foreground text-xs">Consumo Compensado (SCEE)</span>
                <p className="text-lg font-bold text-blue-600">
                  {creditosInfo.consumoCompensado.toLocaleString('pt-BR')} kWh
                </p>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground text-xs">Consumo NÃO Compensado</span>
                <p className="text-lg font-bold text-orange-600">
                  {creditosInfo.consumoNaoCompensado.toLocaleString('pt-BR')} kWh
                </p>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground text-xs">Créditos Sobrando</span>
                <p className="text-lg font-bold text-green-600">
                  {creditosInfo.creditosSobrando.toLocaleString('pt-BR')} kWh
                </p>
              </div>
            </div>
          </div>
          
          {/* Valores não compensáveis (GD2) */}
          {classificacaoGD.tipo === 'gd2' && valoresCalculados && (valoresCalculados.encargosNaoCompensados > 0 || valoresCalculados.fioBNaoCompensado > 0) && (
            <div className="mt-4 pt-4 border-t border-amber-300 dark:border-amber-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Valores NÃO Compensáveis (Lei 14.300 - GD2)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-2 bg-amber-100/50 dark:bg-amber-900/30 rounded">
                  <span className="text-amber-700 dark:text-amber-400 text-xs">Encargos Setoriais</span>
                  <p className="font-bold text-amber-800 dark:text-amber-200">
                    {formatCurrency(valoresCalculados.encargosNaoCompensados)}
                  </p>
                </div>
                <div className="p-2 bg-amber-100/50 dark:bg-amber-900/30 rounded">
                  <span className="text-amber-700 dark:text-amber-400 text-xs">Fio B ({classificacaoGD.percentualFioB}%)</span>
                  <p className="font-bold text-amber-800 dark:text-amber-200">
                    {formatCurrency(valoresCalculados.fioBNaoCompensado)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info da Tarifa */}
        <TarifaInfo compact />

        {tarifa && valoresCalculados && (
          <Alert className="bg-primary/5 border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span>
                  Valores calculados com tarifa vigente.
                </span>
              <Badge 
                  className={
                    data.bandeira === 'verde' ? 'bg-green-500 hover:bg-green-500' :
                    data.bandeira === 'amarela' ? 'bg-yellow-500 hover:bg-yellow-500' :
                    data.bandeira === 'vermelha1' ? 'bg-red-400 hover:bg-red-400' :
                    'bg-red-600 hover:bg-red-600'
                  }
                >
                  Bandeira {data.bandeira === 'vermelha1' ? 'Vermelha P1' : data.bandeira === 'vermelha2' ? 'Vermelha P2' : String(data.bandeira || 'verde').charAt(0).toUpperCase() + String(data.bandeira || 'verde').slice(1)}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={recalcularTodos}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalcular Todos
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Consumo não compensado info */}
        {consumoNaoCompensadoPorPosto.total > 0 && isGrupoA && (
          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Consumo Não Compensado por Posto (kWh)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Ponta</span>
                <p className="font-semibold">{consumoNaoCompensadoPorPosto.ponta.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fora Ponta</span>
                <p className="font-semibold">{consumoNaoCompensadoPorPosto.fp.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reservado</span>
                <p className="font-semibold">{consumoNaoCompensadoPorPosto.hr.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total</span>
                <p className="font-semibold text-orange-600">{consumoNaoCompensadoPorPosto.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 5A - Bandeiras TE */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center">
            5A) Bandeiras (TE) — R$
            <FormulaTooltip 
              title="Adicional de Bandeira"
              formula="Consumo (kWh) × Tarifa Bandeira (R$/kWh)"
              description="Valor adicional cobrado sobre todo o consumo, conforme bandeira tarifária vigente."
            />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Bandeira TE Ponta</Label>
                <AutoBadge show={autoFilled.bandeira_te_p} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.bandeira_te_p_rs || ''} 
                onChange={(e) => {
                  updateData({ bandeira_te_p_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, bandeira_te_p: false }));
                }}
                placeholder="348.34"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.bandeira_te_p)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Bandeira TE Fora Ponta</Label>
                <AutoBadge show={autoFilled.bandeira_te_fp} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.bandeira_te_fp_rs || ''} 
                onChange={(e) => {
                  updateData({ bandeira_te_fp_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, bandeira_te_fp: false }));
                }}
                placeholder="803.49"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.bandeira_te_fp)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Bandeira TE HR</Label>
                <AutoBadge show={autoFilled.bandeira_te_hr} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.bandeira_te_hr_rs || ''} 
                onChange={(e) => {
                  updateData({ bandeira_te_hr_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, bandeira_te_hr: false }));
                }}
                placeholder="50.70"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.bandeira_te_hr)}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Subtotal Bandeiras: <strong>{formatCurrency(totalBandeiras)}</strong>
          </p>
        </div>

        <Separator />

        {/* 5B - Não Compensado TUSD */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center">
            5B) Consumo NÃO Compensado (TUSD) — R$
            <FormulaTooltip 
              title="TUSD Não Compensado"
              formula="Consumo Não Compensado × TUSD"
              description="Tarifa de Uso do Sistema de Distribuição aplicada sobre o consumo que não foi compensado por créditos (próprios ou remotos)."
            />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>TUSD Ponta</Label>
                <AutoBadge show={autoFilled.tusd_p} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_tusd_p_rs || ''} 
                onChange={(e) => {
                  updateData({ nao_compensado_tusd_p_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, tusd_p: false }));
                }}
                placeholder="13161.92"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.tusd_p)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>TUSD Fora Ponta</Label>
                <AutoBadge show={autoFilled.tusd_fp} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_tusd_fp_rs || ''} 
                onChange={(e) => {
                  updateData({ nao_compensado_tusd_fp_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, tusd_fp: false }));
                }}
                placeholder="1762.35"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.tusd_fp)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>TUSD HR</Label>
                <AutoBadge show={autoFilled.tusd_hr} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_tusd_hr_rs || ''} 
                onChange={(e) => {
                  updateData({ nao_compensado_tusd_hr_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, tusd_hr: false }));
                }}
                placeholder="111.21"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.tusd_hr)}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Subtotal TUSD não compensado: <strong>{formatCurrency(totalNaoCompensadoTUSD)}</strong>
          </p>
        </div>

        <Separator />

        {/* 5C - Não Compensado TE */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center">
            5C) Consumo NÃO Compensado (TE) — R$
            <FormulaTooltip 
              title="TE Não Compensado"
              formula="Consumo Não Compensado × TE"
              description="Tarifa de Energia aplicada sobre o consumo que não foi compensado por créditos."
            />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>TE Ponta</Label>
                <AutoBadge show={autoFilled.te_p} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_te_p_rs || ''} 
                onChange={(e) => {
                  updateData({ nao_compensado_te_p_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, te_p: false }));
                }}
                placeholder="3264.26"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.te_p)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>TE Fora Ponta</Label>
                <AutoBadge show={autoFilled.te_fp} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_te_fp_rs || ''} 
                onChange={(e) => {
                  updateData({ nao_compensado_te_fp_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, te_fp: false }));
                }}
                placeholder="4615.01"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.te_fp)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>TE HR</Label>
                <AutoBadge show={autoFilled.te_hr} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_te_hr_rs || ''} 
                onChange={(e) => {
                  updateData({ nao_compensado_te_hr_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, te_hr: false }));
                }}
                placeholder="291.22"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.te_hr)}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Subtotal TE não compensado: <strong>{formatCurrency(totalNaoCompensadoTE)}</strong>
          </p>
        </div>

        <Separator />

        {/* 5D - SCEE Compensação */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center">
            5D) SCEE — Compensação de Créditos (R$)
            <FormulaTooltip 
              title="Sistema de Compensação de Energia Elétrica"
              formula="Consumo Compensado × (TUSD + TE) - Créditos Injeção"
              description="Valores referentes à energia compensada por créditos. Injeção (créditos próprios) gera valores negativos = abatimento na fatura."
            />
          </h4>
          
          {/* Explicação SCEE */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
            <p className="text-blue-800 dark:text-blue-200">
              <strong>SCEE Consumo:</strong> Energia compensada com créditos (valor a débito).
              <br />
              <strong>SCEE Injeção:</strong> Créditos próprios gerados pela injeção (valor a crédito/negativo).
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>SCEE Consumo FP TUSD</Label>
                <AutoBadge show={autoFilled.scee_consumo_fp_tusd} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_consumo_fp_tusd_rs || ''} 
                onChange={(e) => {
                  updateData({ scee_consumo_fp_tusd_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, scee_consumo_fp_tusd: false }));
                }}
                placeholder="905.38"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.scee_consumo_fp_tusd)} 
                  <span className="text-muted-foreground/70 ml-1">
                    ({creditosInfo.consumoCompensado.toFixed(0)} kWh compensado × TUSD)
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>SCEE Parcela TE FP</Label>
                <AutoBadge show={autoFilled.scee_parcela_te_fp} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_parcela_te_fp_rs || ''} 
                onChange={(e) => {
                  updateData({ scee_parcela_te_fp_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, scee_parcela_te_fp: false }));
                }}
                placeholder="203.67"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.scee_parcela_te_fp)}
                  <span className="text-muted-foreground/70 ml-1">
                    ({creditosInfo.consumoCompensado.toFixed(0)} kWh compensado × TE)
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label className="text-green-700 dark:text-green-400">
                  SCEE Injeção FP TE (crédito próprio)
                </Label>
                <AutoBadge show={autoFilled.scee_injecao_fp_te} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_injecao_fp_te_rs || ''} 
                onChange={(e) => {
                  updateData({ scee_injecao_fp_te_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, scee_injecao_fp_te: false }));
                }}
                placeholder="-203.67"
                className="border-green-200 dark:border-green-800"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Sugerido: {formatCurrency(valoresCalculados.scee_injecao_fp_te)}
                  <span className="opacity-70 ml-1">
                    (Injeção própria: {creditosInfo.creditosProprios.toFixed(0)} kWh)
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">Valores negativos = créditos (abatimento)</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label className="text-green-700 dark:text-green-400">
                  SCEE Injeção FP TUSD (crédito próprio)
                </Label>
                <AutoBadge show={autoFilled.scee_injecao_fp_tusd} />
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_injecao_fp_tusd_rs || ''} 
                onChange={(e) => {
                  updateData({ scee_injecao_fp_tusd_rs: parseFloat(e.target.value) || 0 });
                  setAutoFilled(prev => ({ ...prev, scee_injecao_fp_tusd: false }));
                }}
                placeholder="-905.38"
                className="border-green-200 dark:border-green-800"
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Sugerido: {formatCurrency(valoresCalculados.scee_injecao_fp_tusd)}
                  <span className="opacity-70 ml-1">
                    (Injeção própria: {creditosInfo.creditosProprios.toFixed(0)} kWh)
                  </span>
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Subtotal SCEE: <strong>{formatCurrency(totalSCEE)}</strong>
          </p>
        </div>

        <Separator />

        {/* 5E - Reativo + CIP */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center">
            5E) Reativo + CIP
            <FormulaTooltip 
              title="Encargos Adicionais"
              formula="UFER + CIP"
              description="UFER: Excedente de Energia Reativa (multa por baixo fator de potência). CIP: Contribuição para Iluminação Pública."
            />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>UFER FP (kVArh)</Label>
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.ufer_fp_kvarh || ''} 
                onChange={(e) => updateData({ ufer_fp_kvarh: parseFloat(e.target.value) || 0 })}
                placeholder="378"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>UFER FP (R$)</Label>
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.ufer_fp_rs || ''} 
                onChange={(e) => updateData({ ufer_fp_rs: parseFloat(e.target.value) || 0 })}
                placeholder="130.49"
                className={(data.ufer_fp_rs || 0) > 0 ? 'border-orange-500' : ''}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>CIP (R$)</Label>
              </div>
              <Input 
                type="number"
                step="0.01"
                value={data.cip_rs || ''} 
                onChange={(e) => updateData({ cip_rs: parseFloat(e.target.value) || 0 })}
                placeholder="34.35"
              />
            </div>
          </div>
        </div>

        {(data.ufer_fp_rs || 0) > 0 && (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/30">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Alerta Reativo/Fator de Potência:</strong> UFER detectado no valor de {formatCurrency(data.ufer_fp_rs || 0)}.
              <br />
              <span className="text-sm">Recomendação: Verificar correção de fator de potência</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Resumo */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h5 className="font-medium mb-3">Resumo de Itens de Fatura</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bandeiras TE</span>
              <span className="font-medium">{formatCurrency(totalBandeiras)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TUSD Não Compensado</span>
              <span className="font-medium">{formatCurrency(totalNaoCompensadoTUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TE Não Compensado</span>
              <span className="font-medium">{formatCurrency(totalNaoCompensadoTE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SCEE (Compensação - Injeção)</span>
              <span className="font-medium">{formatCurrency(totalSCEE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">UFER + CIP</span>
              <span className="font-medium">{formatCurrency((data.ufer_fp_rs || 0) + (data.cip_rs || 0))}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base">
              <span className="font-medium">Total Itens (sem tributos)</span>
              <span className="font-bold text-primary">
                {formatCurrency(totalBandeiras + totalNaoCompensadoTUSD + totalNaoCompensadoTE + totalSCEE + (data.ufer_fp_rs || 0) + (data.cip_rs || 0))}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
