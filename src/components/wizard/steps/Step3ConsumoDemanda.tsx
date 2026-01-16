/**
 * PASSO 3 — CONSUMO & DEMANDA (Consolidado)
 * Unifica os antigos passos de consumo e demanda em um único passo
 */

import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Zap, Gauge, Calculator, Info, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Step3ConsumoDemanda() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();

  // Cálculo de consumo total
  const consumoCalculado = useMemo(() => {
    if (isGrupoA) {
      return (data.consumo_ponta_kwh || 0) + 
             (data.consumo_fora_ponta_kwh || 0) + 
             (data.consumo_reservado_kwh || 0);
    }
    return data.consumo_total_kwh || 0;
  }, [data.consumo_ponta_kwh, data.consumo_fora_ponta_kwh, data.consumo_reservado_kwh, data.consumo_total_kwh, isGrupoA]);

  // Auto-atualizar consumo total para Grupo A
  useEffect(() => {
    if (isGrupoA && consumoCalculado !== data.consumo_total_kwh) {
      updateData({ consumo_total_kwh: consumoCalculado });
    }
  }, [consumoCalculado, isGrupoA]);

  // Validação
  useEffect(() => {
    const consumoOk = data.consumo_total_kwh > 0 || consumoCalculado > 0;
    const demandaOk = !isGrupoA || (data.demanda_contratada_kw > 0);
    setCanProceed(consumoOk && demandaOk);
  }, [data, consumoCalculado, isGrupoA, setCanProceed]);

  // Alerta de ultrapassagem
  const ultrapassagemPercent = data.demanda_contratada_kw > 0 
    ? ((data.demanda_medida_kw - data.demanda_contratada_kw) / data.demanda_contratada_kw * 100)
    : 0;

  const formatKwh = (value: number) => value.toLocaleString('pt-BR') + ' kWh';
  const formatKw = (value: number) => value.toLocaleString('pt-BR') + ' kW';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Passo 3 — Consumo {isGrupoA && '& Demanda'}
        </CardTitle>
        <CardDescription>
          {isGrupoA 
            ? 'Consumo por posto horário e demanda contratada/medida'
            : 'Consumo total medido no período'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* CONSUMO */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Consumo (kWh)
            </h4>
          </div>

          {isGrupoA ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Ponta
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Horário de pico: 18h-21h (dias úteis)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    value={data.consumo_ponta_kwh || ''} 
                    onChange={(e) => updateData({ consumo_ponta_kwh: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Fora Ponta
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Demais horários e fins de semana</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    value={data.consumo_fora_ponta_kwh || ''} 
                    onChange={(e) => updateData({ consumo_fora_ponta_kwh: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Reservado
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    value={data.consumo_reservado_kwh || ''} 
                    onChange={(e) => updateData({ consumo_reservado_kwh: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Consumo Total (soma dos postos)
                  </span>
                  <span className="text-lg font-bold text-primary">{formatKwh(consumoCalculado)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Consumo Total (kWh)</Label>
              <Input 
                type="number"
                min="0"
                value={data.consumo_total_kwh || ''} 
                onChange={(e) => updateData({ consumo_total_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="Consumo do mês"
                className="text-lg"
              />
            </div>
          )}
        </div>

        {/* DEMANDA - Apenas Grupo A */}
        {isGrupoA && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Demanda (kW)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Demanda Contratada</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={data.demanda_contratada_kw || ''} 
                    onChange={(e) => updateData({ demanda_contratada_kw: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demanda Medida</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={data.demanda_medida_kw || ''} 
                    onChange={(e) => updateData({ demanda_medida_kw: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className={ultrapassagemPercent > 5 ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Ultrapassagem
                    <Badge variant="outline" className="text-xs">Calculado</Badge>
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    value={data.demanda_ultrapassagem_kw || ''} 
                    onChange={(e) => updateData({ demanda_ultrapassagem_kw: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="bg-muted/50"
                  />
                </div>
              </div>

              {/* Demanda de Geração */}
              {data.tem_geracao_local && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Demanda de Geração
                    <Badge variant="secondary" className="text-xs">Mini/Microgeração</Badge>
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    value={data.demanda_geracao_kw || ''} 
                    onChange={(e) => updateData({ demanda_geracao_kw: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              )}

              {/* Alerta de ultrapassagem */}
              {ultrapassagemPercent > 5 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Atenção!</strong> Demanda medida excede a contratada em {ultrapassagemPercent.toFixed(1)}%.
                    {ultrapassagemPercent > 10 && ' Isso resulta em multa de ultrapassagem.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Resumo de demanda */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contratada</span>
                    <p className="font-semibold">{formatKw(data.demanda_contratada_kw || 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Medida</span>
                    <p className="font-semibold">{formatKw(data.demanda_medida_kw || 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Faturada</span>
                    <p className="font-bold text-primary">
                      {formatKw(Math.max(data.demanda_contratada_kw || 0, data.demanda_medida_kw || 0))}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ultrapassagem</span>
                    <p className={`font-semibold ${(data.demanda_ultrapassagem_kw || 0) > 0 ? 'text-destructive' : ''}`}>
                      {formatKw(data.demanda_ultrapassagem_kw || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </CardContent>
    </Card>
  );
}
