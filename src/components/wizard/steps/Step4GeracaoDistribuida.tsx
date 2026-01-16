/**
 * PASSO 4 — GERAÇÃO DISTRIBUÍDA (Consolidado)
 * Unifica geração local (autoconsumo/injeção) + créditos remotos
 * Calcula automaticamente valores financeiros usando tarifa do contexto
 */

import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Sun, Zap, ArrowRight, ArrowDown, Building2, Calculator, Info, Shield, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { obterPercentualFioB } from '@/lib/lei14300';

export function Step4GeracaoDistribuida() {
  const { data, updateData, setCanProceed, isGrupoA, tarifa, tarifaLoading, calculosAuto } = useWizard();

  // Classificação GD (usa valor do wizard ou padrão GD1)
  const classificacaoGD = useMemo(() => {
    const anoRef = data.mes_ref 
      ? parseInt(data.mes_ref.split('-')[0]) 
      : new Date().getFullYear();
    const percentualFioB = obterPercentualFioB(anoRef);
    const tipo: 'gd1' | 'gd2' = (data.classificacao_gd_aplicada as 'gd1' | 'gd2') || 'gd1';
    return { tipo, percentualFioB, anoRef };
  }, [data.mes_ref, data.classificacao_gd_aplicada]);

  // Cálculos consolidados
  const calculos = useMemo(() => {
    const geracaoLocal = data.geracao_local_total_kwh || 0;
    
    const autoconsumoTotal = isGrupoA
      ? (data.autoconsumo_ponta_kwh || 0) + (data.autoconsumo_fp_kwh || 0) + (data.autoconsumo_hr_kwh || 0)
      : (data.autoconsumo_total_kwh || 0);
    
    const injecaoTotal = isGrupoA
      ? (data.injecao_ponta_kwh || 0) + (data.injecao_fp_kwh || 0) + (data.injecao_hr_kwh || 0)
      : (data.injecao_total_kwh || 0);
    
    const creditosRemotos = data.credito_remoto_kwh || 0;
    const totalCreditos = injecaoTotal + creditosRemotos;
    const consumoRede = data.consumo_total_kwh || 0;
    const consumoCompensado = Math.min(consumoRede, totalCreditos);
    const consumoNaoCompensado = Math.max(0, consumoRede - totalCreditos);
    const creditosSobrando = Math.max(0, totalCreditos - consumoRede);
    
    return {
      geracaoLocal,
      autoconsumoTotal,
      injecaoTotal,
      creditosRemotos,
      totalCreditos,
      consumoRede,
      consumoCompensado,
      consumoNaoCompensado,
      creditosSobrando,
    };
  }, [data, isGrupoA]);

  // Cálculo de valores R$ por posto horário para créditos remotos
  const valoresPorPosto = useMemo(() => {
    if (!tarifa) return null;

    // Tarifas por posto (TE + TUSD)
    const tarifaPonta = (tarifa.te_ponta_rs_kwh || 0) + (tarifa.tusd_ponta_rs_kwh || 0);
    const tarifaFP = (tarifa.te_fora_ponta_rs_kwh || tarifa.te_unica_rs_kwh || 0) + 
                     (tarifa.tusd_fora_ponta_rs_kwh || tarifa.tusd_unica_rs_kwh || 0);
    const tarifaHR = (tarifa.te_reservado_rs_kwh || tarifa.te_fora_ponta_rs_kwh || tarifa.te_unica_rs_kwh || 0) + 
                     (tarifa.tusd_reservado_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || tarifa.tusd_unica_rs_kwh || 0);

    // Créditos alocados por posto
    const creditoPonta = data.credito_remoto_ponta_kwh || 0;
    const creditoFP = data.credito_remoto_fp_kwh || 0;
    const creditoHR = data.credito_remoto_hr_kwh || 0;

    // Valores compensados
    const valorPonta = creditoPonta * tarifaPonta;
    const valorFP = creditoFP * tarifaFP;
    const valorHR = creditoHR * tarifaHR;
    const valorTotal = valorPonta + valorFP + valorHR;

    return {
      tarifaPonta,
      tarifaFP,
      tarifaHR,
      creditoPonta,
      creditoFP,
      creditoHR,
      valorPonta,
      valorFP,
      valorHR,
      valorTotal,
    };
  }, [tarifa, data.credito_remoto_ponta_kwh, data.credito_remoto_fp_kwh, data.credito_remoto_hr_kwh]);

  // Auto-calcular injeção quando geração e autoconsumo mudam
  useEffect(() => {
    if (data.geracao_local_total_kwh > 0) {
      const autoconsumo = isGrupoA
        ? (data.autoconsumo_ponta_kwh || 0) + (data.autoconsumo_fp_kwh || 0) + (data.autoconsumo_hr_kwh || 0)
        : (data.autoconsumo_total_kwh || 0);
      
      const injecaoCalculada = Math.max(0, data.geracao_local_total_kwh - autoconsumo);
      
      if (!isGrupoA && data.injecao_total_kwh !== injecaoCalculada) {
        updateData({ injecao_total_kwh: injecaoCalculada });
      }
    }
  }, [data.geracao_local_total_kwh, data.autoconsumo_total_kwh, data.autoconsumo_ponta_kwh, data.autoconsumo_fp_kwh, data.autoconsumo_hr_kwh, isGrupoA]);

  // Auto-calcular valores financeiros quando tarifa está disponível
  useEffect(() => {
    if (!tarifa) return;

    const updates: Partial<typeof data> = {};
    
    // Calcular autoconsumo_rs (valor do autoconsumo em R$)
    const tarifaLiquida = (tarifa.te_fora_ponta_rs_kwh || tarifa.te_unica_rs_kwh || 0) + 
                          (tarifa.tusd_fora_ponta_rs_kwh || tarifa.tusd_unica_rs_kwh || 0);
    
    const autoconsumoTotal = isGrupoA
      ? (data.autoconsumo_ponta_kwh || 0) + (data.autoconsumo_fp_kwh || 0) + (data.autoconsumo_hr_kwh || 0)
      : (data.autoconsumo_total_kwh || 0);
    
    const autoconsumoRsCalculado = autoconsumoTotal * tarifaLiquida;
    if (Math.abs((data.autoconsumo_rs || 0) - autoconsumoRsCalculado) > 0.01) {
      updates.autoconsumo_rs = parseFloat(autoconsumoRsCalculado.toFixed(2));
      updates.tarifa_liquida_fp_rs_kwh = tarifaLiquida;
    }

    // Calcular credito_remoto_compensado_rs
    const creditosRemotos = data.credito_remoto_kwh || 0;
    const consumoRede = data.consumo_total_kwh || 0;
    const creditoUsado = Math.min(creditosRemotos, consumoRede);
    const creditoCompensadoRs = creditoUsado * tarifaLiquida;
    
    if (creditosRemotos > 0 && Math.abs((data.credito_remoto_compensado_rs || 0) - creditoCompensadoRs) > 0.01) {
      updates.credito_remoto_compensado_rs = parseFloat(creditoCompensadoRs.toFixed(2));
    }

    // Calcular custo_assinatura_rs (85% do compensado)
    const custoAssinaturaCalculado = creditoCompensadoRs * 0.85;
    if (creditosRemotos > 0 && Math.abs((data.custo_assinatura_rs || 0) - custoAssinaturaCalculado) > 0.01) {
      updates.custo_assinatura_rs = parseFloat(custoAssinaturaCalculado.toFixed(2));
    }

    // Calcular economia_liquida_rs (15% de desconto)
    const economiaCalculada = creditoCompensadoRs * 0.15;
    if (creditosRemotos > 0 && Math.abs((data.economia_liquida_rs || 0) - economiaCalculada) > 0.01) {
      updates.economia_liquida_rs = parseFloat(economiaCalculada.toFixed(2));
    }

    if (Object.keys(updates).length > 0) {
      updateData(updates);
    }
  }, [tarifa, data.autoconsumo_ponta_kwh, data.autoconsumo_fp_kwh, data.autoconsumo_hr_kwh, 
      data.autoconsumo_total_kwh, data.credito_remoto_kwh, data.consumo_total_kwh, isGrupoA]);

  // Validação
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const formatKwh = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kWh';
  const formatReais = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatPercent = (value: number) => value.toFixed(1) + '%';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          Passo 4 — Geração Distribuída
        </CardTitle>
        <CardDescription>
          Autoconsumo, injeção e créditos remotos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Status da Tarifa */}
        {tarifaLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Carregando tarifas para cálculos automáticos...</AlertDescription>
          </Alert>
        )}

        {/* Classificação GD - Selecionável */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Classificação GD</Label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => updateData({ classificacao_gd_aplicada: 'gd1' })}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                classificacaoGD.tipo === 'gd1'
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                  : 'border-muted hover:border-green-300'
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <Shield className={`h-4 w-4 ${classificacaoGD.tipo === 'gd1' ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className={`font-semibold ${classificacaoGD.tipo === 'gd1' ? 'text-green-700 dark:text-green-300' : ''}`}>
                  GD1
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Compensação integral (TE + TUSD + Encargos)
              </p>
            </button>
            <button
              type="button"
              onClick={() => updateData({ classificacao_gd_aplicada: 'gd2' })}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                classificacaoGD.tipo === 'gd2'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                  : 'border-muted hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <Shield className={`h-4 w-4 ${classificacaoGD.tipo === 'gd2' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                <span className={`font-semibold ${classificacaoGD.tipo === 'gd2' ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                  GD2
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fio B não compensável: {classificacaoGD.percentualFioB}%
              </p>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ano de referência: {classificacaoGD.anoRef}
          </p>
        </div>

        {/* Switches para habilitar seções */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="tem_geracao_local"
              checked={data.tem_geracao_local}
              onCheckedChange={(checked) => updateData({ tem_geracao_local: checked })}
            />
            <Label htmlFor="tem_geracao_local" className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-yellow-500" />
              Geração Local (Usina Própria)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="tem_usina_remota"
              checked={data.tem_usina_remota}
              onCheckedChange={(checked) => updateData({ tem_usina_remota: checked })}
            />
            <Label htmlFor="tem_usina_remota" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Créditos Remotos (Usina Assinada)
            </Label>
          </div>
        </div>

        {/* GERAÇÃO LOCAL */}
        {data.tem_geracao_local && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-yellow-500" />
                <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Geração Local
                </h4>
              </div>

              <div className="space-y-2">
                <Label>Geração Total (kWh)</Label>
                <Input 
                  type="number"
                  min="0"
                  value={data.geracao_local_total_kwh || ''} 
                  onChange={(e) => updateData({ geracao_local_total_kwh: parseFloat(e.target.value) || 0 })}
                  placeholder="Total gerado no período"
                />
              </div>

              {isGrupoA ? (
                <Tabs defaultValue="autoconsumo" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="autoconsumo">Autoconsumo</TabsTrigger>
                    <TabsTrigger value="injecao">Injeção</TabsTrigger>
                  </TabsList>
                  <TabsContent value="autoconsumo" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Ponta (kWh)</Label>
                        <Input 
                          type="number"
                          min="0"
                          value={data.autoconsumo_ponta_kwh || ''} 
                          onChange={(e) => updateData({ autoconsumo_ponta_kwh: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fora Ponta (kWh)</Label>
                        <Input 
                          type="number"
                          min="0"
                          value={data.autoconsumo_fp_kwh || ''} 
                          onChange={(e) => updateData({ autoconsumo_fp_kwh: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reservado (kWh)</Label>
                        <Input 
                          type="number"
                          min="0"
                          value={data.autoconsumo_hr_kwh || ''} 
                          onChange={(e) => updateData({ autoconsumo_hr_kwh: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="injecao" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Ponta (kWh)</Label>
                        <Input 
                          type="number"
                          min="0"
                          value={data.injecao_ponta_kwh || ''} 
                          onChange={(e) => updateData({ injecao_ponta_kwh: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fora Ponta (kWh)</Label>
                        <Input 
                          type="number"
                          min="0"
                          value={data.injecao_fp_kwh || ''} 
                          onChange={(e) => updateData({ injecao_fp_kwh: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reservado (kWh)</Label>
                        <Input 
                          type="number"
                          min="0"
                          value={data.injecao_hr_kwh || ''} 
                          onChange={(e) => updateData({ injecao_hr_kwh: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Autoconsumo (kWh)</Label>
                    <Input 
                      type="number"
                      min="0"
                      value={data.autoconsumo_total_kwh || ''} 
                      onChange={(e) => updateData({ autoconsumo_total_kwh: parseFloat(e.target.value) || 0 })}
                      placeholder="Energia consumida direto da geração"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Injeção (kWh)
                      <Badge variant="outline" className="text-xs">Calculado</Badge>
                    </Label>
                    <Input 
                      type="number"
                      min="0"
                      value={data.injecao_total_kwh || ''} 
                      onChange={(e) => updateData({ injecao_total_kwh: parseFloat(e.target.value) || 0 })}
                      placeholder="Energia injetada na rede"
                      className="bg-muted/50"
                    />
                  </div>
                </div>
              )}

              {/* Valor do Autoconsumo */}
              {calculos.autoconsumoTotal > 0 && (
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Economia do Autoconsumo (tarifa evitada):
                    </span>
                    <span className="font-bold text-green-600">{formatReais(data.autoconsumo_rs || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* CRÉDITOS REMOTOS */}
        {data.tem_usina_remota && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Créditos Remotos (Assinatura)
                </h4>
              </div>

              {/* Campo UC Geradora - editável manualmente */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  UC Geradora (Usina Remota)
                  {data.scee_uc_geradora && data.scee_uc_geradora !== data.uc_numero && (
                    <Badge variant="secondary" className="text-xs">Detectada</Badge>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="text"
                    value={data.scee_uc_geradora || ''} 
                    onChange={(e) => updateData({ scee_uc_geradora: e.target.value })}
                    placeholder="Número da UC que está injetando energia"
                    className={data.scee_uc_geradora ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20" : ""}
                  />
                </div>
                {data.scee_uc_geradora && data.scee_uc_geradora !== data.uc_numero && (
                  <p className="text-xs text-muted-foreground">
                    UC diferente da consumidora ({data.uc_numero}) - créditos de geração remota
                  </p>
                )}
              </div>

              {/* Indicador com valores de injeção detectados */}
              {data.scee_uc_geradora && (() => {
                const totalSCEE = (data.scee_geracao_ciclo_ponta_kwh || 0) + 
                                 (data.scee_geracao_ciclo_fp_kwh || 0) + 
                                 (data.scee_geracao_ciclo_hr_kwh || 0);
                if (totalSCEE > 0) {
                  return (
                    <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm">
                        <strong>Injeção detectada na fatura:</strong>
                        <div className="mt-1 text-xs">
                          Ponta: {data.scee_geracao_ciclo_ponta_kwh || 0} kWh | 
                          Fora Ponta: {data.scee_geracao_ciclo_fp_kwh || 0} kWh | 
                          Reservado: {data.scee_geracao_ciclo_hr_kwh || 0} kWh
                        </div>
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}

              {/* Total de créditos recebidos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Créditos Recebidos (kWh)</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={data.credito_remoto_kwh || ''} 
                    onChange={(e) => updateData({ credito_remoto_kwh: parseFloat(e.target.value) || 0 })}
                    placeholder="Créditos transferidos da usina remota"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Custo Assinatura (R$)
                    <Badge variant="outline" className="text-xs">Calculado (85%)</Badge>
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.custo_assinatura_rs || ''} 
                    onChange={(e) => updateData({ custo_assinatura_rs: parseFloat(e.target.value) || 0 })}
                    placeholder="Valor pago à usina"
                    className="bg-muted/50"
                  />
                </div>
              </div>

              {/* Alocação por posto horário - apenas Grupo A */}
              {isGrupoA && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-sm text-muted-foreground">Alocação por Posto Horário</Label>
                    <div className="flex items-center gap-3">
                      {/* Botão: Usar dados SCEE da fatura */}
                      <button
                        type="button"
                        onClick={() => {
                          // Usar campos de injeção SCEE (geração de UC diferente na fatura)
                          const injecaoP = data.scee_geracao_ciclo_ponta_kwh || 0;
                          const injecaoFP = data.scee_geracao_ciclo_fp_kwh || 0;
                          const injecaoHR = data.scee_geracao_ciclo_hr_kwh || 0;
                          const totalInjecao = injecaoP + injecaoFP + injecaoHR;
                          
                          if (totalInjecao > 0) {
                            updateData({
                              credito_remoto_ponta_kwh: injecaoP,
                              credito_remoto_fp_kwh: injecaoFP,
                              credito_remoto_hr_kwh: injecaoHR,
                              credito_remoto_kwh: totalInjecao
                            });
                          }
                        }}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        title="Usar valores de injeção SCEE da fatura (UC diferente)"
                      >
                        <ArrowDown className="h-3 w-3" />
                        Usar SCEE Fatura
                      </button>
                      
                      {/* Botão: Distribuir proporcional ao consumo */}
                      <button
                        type="button"
                        onClick={() => {
                          const totalCreditos = data.credito_remoto_kwh || 0;
                          const consumoP = data.consumo_ponta_kwh || 0;
                          const consumoFP = data.consumo_fora_ponta_kwh || 0;
                          const consumoHR = data.consumo_reservado_kwh || 0;
                          const totalConsumo = consumoP + consumoFP + consumoHR;
                          
                          if (totalConsumo > 0 && totalCreditos > 0) {
                            const creditoP = Math.min(consumoP, Math.round((consumoP / totalConsumo) * totalCreditos));
                            const creditoFP = Math.min(consumoFP, Math.round((consumoFP / totalConsumo) * totalCreditos));
                            const creditoHR = Math.max(0, totalCreditos - creditoP - creditoFP);
                            
                            updateData({
                              credito_remoto_ponta_kwh: creditoP,
                              credito_remoto_fp_kwh: creditoFP,
                              credito_remoto_hr_kwh: creditoHR
                            });
                          }
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        title="Distribuir proporcionalmente ao consumo de cada posto"
                      >
                        <Zap className="h-3 w-3" />
                        Proporcional
                      </button>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>Usar SCEE Fatura:</strong> Usa os valores de injeção por posto da seção SCEE da fatura (geração de UC diferente).</p>
                            <p className="mt-1"><strong>Proporcional:</strong> Distribui o total de créditos proporcionalmente ao consumo de cada posto.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Ponta (kWh)</Label>
                      <Input 
                        type="number"
                        min="0"
                        value={data.credito_remoto_ponta_kwh || ''} 
                        onChange={(e) => updateData({ credito_remoto_ponta_kwh: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      {valoresPorPosto && (data.credito_remoto_ponta_kwh || 0) > 0 && (
                        <div className="text-xs space-y-0.5">
                          <div className="text-green-600 font-medium">
                            {formatReais(valoresPorPosto.valorPonta)}
                          </div>
                          <div className="text-muted-foreground">
                            Tarifa: {valoresPorPosto.tarifaPonta.toFixed(5)} R$/kWh
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Fora Ponta (kWh)</Label>
                      <Input 
                        type="number"
                        min="0"
                        value={data.credito_remoto_fp_kwh || ''} 
                        onChange={(e) => updateData({ credito_remoto_fp_kwh: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      {valoresPorPosto && (data.credito_remoto_fp_kwh || 0) > 0 && (
                        <div className="text-xs space-y-0.5">
                          <div className="text-green-600 font-medium">
                            {formatReais(valoresPorPosto.valorFP)}
                          </div>
                          <div className="text-muted-foreground">
                            Tarifa: {valoresPorPosto.tarifaFP.toFixed(5)} R$/kWh
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Reservado (kWh)</Label>
                      <Input 
                        type="number"
                        min="0"
                        value={data.credito_remoto_hr_kwh || ''} 
                        onChange={(e) => updateData({ credito_remoto_hr_kwh: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      {valoresPorPosto && (data.credito_remoto_hr_kwh || 0) > 0 && (
                        <div className="text-xs space-y-0.5">
                          <div className="text-green-600 font-medium">
                            {formatReais(valoresPorPosto.valorHR)}
                          </div>
                          <div className="text-muted-foreground">
                            Tarifa: {valoresPorPosto.tarifaHR.toFixed(5)} R$/kWh
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total compensado por posto */}
                  {valoresPorPosto && valoresPorPosto.valorTotal > 0 && (
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700 dark:text-green-300">
                          Total Compensado (por posto):
                        </span>
                        <span className="font-bold text-green-600">
                          {formatReais(valoresPorPosto.valorTotal)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Validação de alocação */}
                  {(() => {
                    const totalAlocado = (data.credito_remoto_ponta_kwh || 0) + (data.credito_remoto_fp_kwh || 0) + (data.credito_remoto_hr_kwh || 0);
                    const totalRecebido = data.credito_remoto_kwh || 0;
                    const diferenca = totalRecebido - totalAlocado;

                    if (totalAlocado > 0 && Math.abs(diferenca) > 0.1) {
                      return (
                        <Alert variant={diferenca > 0 ? "default" : "destructive"} className="py-2">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {diferenca > 0 
                              ? `Faltam ${formatKwh(diferenca)} para alocar`
                              : `Alocação excede em ${formatKwh(Math.abs(diferenca))} o total recebido`
                            }
                          </AlertDescription>
                        </Alert>
                      );
                    }
                    if (totalAlocado > 0 && Math.abs(diferenca) <= 0.1) {
                      return (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                          <Zap className="h-3 w-3" />
                          <span>Alocação completa: {formatKwh(totalAlocado)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Resumo TOTAL de compensação (local + remota) */}
              {(data.tem_geracao_local || data.tem_usina_remota) && (
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-300 space-y-3">
                  <h5 className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Resumo de Compensação (Cost Avoidance)
                  </h5>
                  <div className="space-y-2 text-sm">
                    {/* Geração Simultânea (Autoconsumo) */}
                    {data.tem_geracao_local && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Geração Simultânea (Autoconsumo):</span>
                        <span className="font-medium">{formatReais(data.autoconsumo_rs || data.energia_simultanea_rs || 0)}</span>
                      </div>
                    )}
                    
                    {/* Créditos Alocados (Remotos) */}
                    {data.tem_usina_remota && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Créditos Alocados (Remotos):</span>
                        <span className="font-medium">{formatReais(valoresPorPosto?.valorTotal || data.credito_remoto_compensado_rs || 0)}</span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    {/* Total Compensado */}
                    <div className="flex items-center justify-between text-green-700 dark:text-green-300">
                      <span className="font-semibold">Total Compensado:</span>
                      <span className="font-bold text-lg">
                        {formatReais(
                          (data.autoconsumo_rs || data.energia_simultanea_rs || 0) + 
                          (valoresPorPosto?.valorTotal || data.credito_remoto_compensado_rs || 0)
                        )}
                      </span>
                    </div>
                    
                    {/* Custo da Assinatura (85% do total compensado) */}
                    {data.tem_usina_remota && (
                      (() => {
                        const totalCompensado = (data.autoconsumo_rs || data.energia_simultanea_rs || 0) + 
                                               (valoresPorPosto?.valorTotal || data.credito_remoto_compensado_rs || 0);
                        const custoAssinatura = totalCompensado * 0.85;
                        const economiaLiquida = totalCompensado * 0.15;
                        
                        return totalCompensado > 0 ? (
                          <>
                            <Separator />
                            <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
                              <span>Custo Assinatura (85% do total):</span>
                              <span className="font-medium">- {formatReais(custoAssinatura)}</span>
                            </div>
                            <div className="flex items-center justify-between text-green-600 font-semibold">
                              <span>Economia Líquida (15%):</span>
                              <span className="font-bold">{formatReais(economiaLiquida)}</span>
                            </div>
                          </>
                        ) : null;
                      })()
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* RESUMO DE BALANÇO */}
        {(data.tem_geracao_local || data.tem_usina_remota) && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Balanço Energético
                </h4>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Consumo da Rede</span>
                    <p className="font-semibold">{formatKwh(calculos.consumoRede)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Créditos Próprios</span>
                    <p className="font-semibold text-green-600">{formatKwh(calculos.injecaoTotal)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Créditos Remotos</span>
                    <p className="font-semibold text-blue-600">{formatKwh(calculos.creditosRemotos)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Créditos</span>
                    <p className="font-bold">{formatKwh(calculos.totalCreditos)}</p>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Compensado</span>
                    <p className="font-semibold text-green-600">{formatKwh(calculos.consumoCompensado)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Não Compensado</span>
                    <p className={`font-semibold ${calculos.consumoNaoCompensado > 0 ? 'text-destructive' : ''}`}>
                      {formatKwh(calculos.consumoNaoCompensado)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Créditos Sobram</span>
                    <p className="font-semibold text-amber-600">{formatKwh(calculos.creditosSobrando)}</p>
                  </div>
                </div>
              </div>

              {calculos.autoconsumoTotal > 0 && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20">
                  <Sun className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Autoconsumo simultâneo:</strong> {formatKwh(calculos.autoconsumoTotal)} — 
                    essa energia não passa pelo medidor e representa economia direta.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}

        {/* Mensagem quando não há geração */}
        {!data.tem_geracao_local && !data.tem_usina_remota && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta UC não possui geração distribuída. Ative as opções acima se houver geração local ou créditos remotos.
            </AlertDescription>
          </Alert>
        )}

      </CardContent>
    </Card>
  );
}
