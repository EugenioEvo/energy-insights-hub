import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Receipt, AlertCircle, Sparkles, RefreshCw, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TarifaInfo, useTarifaAtual } from '../TarifaInfo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  // Calcular consumo não compensado (consumo - autoconsumo - créditos remotos)
  const consumoNaoCompensado = useMemo(() => {
    // Consumo por posto
    const ponta = Math.max(0, (data.consumo_ponta_kwh || 0) - (data.autoconsumo_ponta_kwh || 0) - (data.credito_remoto_ponta_kwh || 0));
    const fp = Math.max(0, (data.consumo_fora_ponta_kwh || 0) - (data.autoconsumo_fp_kwh || 0) - (data.credito_remoto_fp_kwh || 0));
    const hr = Math.max(0, (data.consumo_reservado_kwh || 0) - (data.autoconsumo_hr_kwh || 0) - (data.credito_remoto_hr_kwh || 0));
    
    return { ponta, fp, hr, total: ponta + fp + hr };
  }, [data]);

  // Calcular valores sugeridos baseado na tarifa
  const valoresCalculados = useMemo(() => {
    if (!tarifa) return null;
    
    // Determinar bandeira atual baseada na seleção do usuário
    let bandeiraTarifa = 0;
    switch (data.bandeira) {
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
    
    // Calcular energia compensada (créditos usados neste ciclo)
    const energiaCompensadaFP = data.scee_credito_recebido_kwh || data.credito_assinatura_kwh || 0;
    
    // SCEE - valores baseados na energia compensada
    const scee_consumo_fp_tusd = energiaCompensadaFP * (tarifa.tusd_fora_ponta_rs_kwh || tarifa.tusd_unica_rs_kwh || 0);
    const scee_parcela_te_fp = energiaCompensadaFP * (tarifa.te_fora_ponta_rs_kwh || tarifa.te_unica_rs_kwh || 0);
    // Créditos de injeção são negativos (abatimentos)
    const injecaoTotal = (data.injecao_fp_kwh || 0) + (data.scee_geracao_ciclo_fp_kwh || 0);
    const scee_injecao_fp_te = -(injecaoTotal * (tarifa.te_fora_ponta_rs_kwh || tarifa.te_unica_rs_kwh || 0));
    const scee_injecao_fp_tusd = -(injecaoTotal * (tarifa.tusd_fora_ponta_rs_kwh || tarifa.tusd_unica_rs_kwh || 0));
    
    if (isGrupoA) {
      return {
        // Bandeiras - aplica sobre consumo total de cada posto
        bandeira_te_p: (data.consumo_ponta_kwh || 0) * bandeiraTarifa,
        bandeira_te_fp: (data.consumo_fora_ponta_kwh || 0) * bandeiraTarifa,
        bandeira_te_hr: (data.consumo_reservado_kwh || 0) * bandeiraTarifa,
        
        // TUSD não compensado
        tusd_p: consumoNaoCompensado.ponta * (tarifa.tusd_ponta_rs_kwh || 0),
        tusd_fp: consumoNaoCompensado.fp * (tarifa.tusd_fora_ponta_rs_kwh || 0),
        tusd_hr: consumoNaoCompensado.hr * (tarifa.tusd_reservado_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0),
        
        // TE não compensado
        te_p: consumoNaoCompensado.ponta * (tarifa.te_ponta_rs_kwh || 0),
        te_fp: consumoNaoCompensado.fp * (tarifa.te_fora_ponta_rs_kwh || 0),
        te_hr: consumoNaoCompensado.hr * (tarifa.te_reservado_rs_kwh || tarifa.te_fora_ponta_rs_kwh || 0),
        
        // SCEE
        scee_consumo_fp_tusd,
        scee_parcela_te_fp,
        scee_injecao_fp_te,
        scee_injecao_fp_tusd,
      };
    } else {
      // Grupo B - tarifa única
      const consumoTotal = data.consumo_total_kwh || 0;
      return {
        bandeira_te_p: 0,
        bandeira_te_fp: consumoTotal * bandeiraTarifa,
        bandeira_te_hr: 0,
        tusd_p: 0,
        tusd_fp: consumoNaoCompensado.total * (tarifa.tusd_unica_rs_kwh || 0),
        tusd_hr: 0,
        te_p: 0,
        te_fp: consumoNaoCompensado.total * (tarifa.te_unica_rs_kwh || 0),
        te_hr: 0,
        // SCEE
        scee_consumo_fp_tusd,
        scee_parcela_te_fp,
        scee_injecao_fp_te,
        scee_injecao_fp_tusd,
      };
    }
  }, [tarifa, data, consumoNaoCompensado, isGrupoA]);

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
          Decomposição TE/TUSD/Bandeira/SCEE para auditoria e raio-x
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
                  Bandeira {data.bandeira === 'vermelha1' ? 'Vermelha P1' : data.bandeira === 'vermelha2' ? 'Vermelha P2' : data.bandeira.charAt(0).toUpperCase() + data.bandeira.slice(1)}
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
        {consumoNaoCompensado.total > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Consumo Não Compensado (kWh)</span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Ponta</span>
                <p className="font-semibold">{consumoNaoCompensado.ponta.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fora Ponta</span>
                <p className="font-semibold">{consumoNaoCompensado.fp.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reservado</span>
                <p className="font-semibold">{consumoNaoCompensado.hr.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total</span>
                <p className="font-semibold text-primary">{consumoNaoCompensado.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 5A - Bandeiras TE */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5A) Bandeiras (TE) — R$
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
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5B) Consumo NÃO Compensado (TUSD) — R$
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
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5C) Consumo NÃO Compensado (TE) — R$
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
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5D) SCEE (Compensação) — R$
          </h4>
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
                    ({(data.scee_credito_recebido_kwh || data.credito_assinatura_kwh || 0).toFixed(0)} kWh × TUSD FP)
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
                    ({(data.scee_credito_recebido_kwh || data.credito_assinatura_kwh || 0).toFixed(0)} kWh × TE FP)
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>SCEE Injeção FP TE (crédito)</Label>
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
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.scee_injecao_fp_te)}
                  <span className="text-muted-foreground/70 ml-1">
                    (Injeção: {((data.injecao_fp_kwh || 0) + (data.scee_geracao_ciclo_fp_kwh || 0)).toFixed(0)} kWh)
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">Valores negativos para créditos</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>SCEE Injeção FP TUSD (crédito)</Label>
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
              />
              {valoresCalculados && tarifa && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(valoresCalculados.scee_injecao_fp_tusd)}
                  <span className="text-muted-foreground/70 ml-1">
                    (Injeção: {((data.injecao_fp_kwh || 0) + (data.scee_geracao_ciclo_fp_kwh || 0)).toFixed(0)} kWh)
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
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5E) Reativo + CIP
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>UFER FP (kVArh)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.ufer_fp_kvarh || ''} 
                onChange={(e) => updateData({ ufer_fp_kvarh: parseFloat(e.target.value) || 0 })}
                placeholder="378"
              />
            </div>
            <div className="space-y-2">
              <Label>UFER FP (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.ufer_fp_rs || ''} 
                onChange={(e) => updateData({ ufer_fp_rs: parseFloat(e.target.value) || 0 })}
                placeholder="130.49"
                className={data.ufer_fp_rs > 0 ? 'border-warning' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>CIP (R$)</Label>
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

        {data.ufer_fp_rs > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Alerta Reativo/Fator de Potência:</strong> UFER detectado no valor de {formatCurrency(data.ufer_fp_rs)}.
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
              <span className="text-muted-foreground">SCEE Compensação</span>
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
