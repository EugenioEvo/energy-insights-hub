import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Calculator, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TarifaInfo, useTarifaAtual } from '../TarifaInfo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Step6Tributos() {
  const { data, updateData, setCanProceed } = useWizard();
  const tarifa = useTarifaAtual();
  
  // Track which fields were auto-filled
  const [autoFilled, setAutoFilled] = useState({
    pis_aliquota: false,
    cofins_aliquota: false,
    icms_aliquota: false,
    pis_rs: false,
    cofins_rs: false,
    icms_rs: false,
  });

  // Auto-preencher alíquotas quando tarifa estiver disponível
  useEffect(() => {
    if (tarifa) {
      const updates: Record<string, number> = {};
      const newAutoFilled = { ...autoFilled };

      // PIS
      if (tarifa.pis_percent && tarifa.pis_percent > 0 && (!data.pis_aliquota_percent || data.pis_aliquota_percent === 0)) {
        updates.pis_aliquota_percent = tarifa.pis_percent;
        newAutoFilled.pis_aliquota = true;
      }

      // COFINS
      if (tarifa.cofins_percent && tarifa.cofins_percent > 0 && (!data.cofins_aliquota_percent || data.cofins_aliquota_percent === 0)) {
        updates.cofins_aliquota_percent = tarifa.cofins_percent;
        newAutoFilled.cofins_aliquota = true;
      }

      // ICMS
      if (tarifa.icms_percent && tarifa.icms_percent > 0 && (!data.icms_aliquota_percent || data.icms_aliquota_percent === 0)) {
        updates.icms_aliquota_percent = tarifa.icms_percent;
        newAutoFilled.icms_aliquota = true;
      }

      if (Object.keys(updates).length > 0) {
        updateData(updates);
        setAutoFilled(newAutoFilled);
      }
    }
  }, [tarifa]);

  // Calcular valores sugeridos de PIS/COFINS quando base mudar
  useEffect(() => {
    if (data.base_pis_cofins_rs > 0) {
      const newAutoFilled = { ...autoFilled };
      const updates: Record<string, number> = {};

      // Sugerir PIS
      if (data.pis_aliquota_percent > 0 && (!data.pis_rs || data.pis_rs === 0)) {
        const pisCalculado = data.base_pis_cofins_rs * (data.pis_aliquota_percent / 100);
        updates.pis_rs = parseFloat(pisCalculado.toFixed(2));
        newAutoFilled.pis_rs = true;
      }

      // Sugerir COFINS
      if (data.cofins_aliquota_percent > 0 && (!data.cofins_rs || data.cofins_rs === 0)) {
        const cofinsCalculado = data.base_pis_cofins_rs * (data.cofins_aliquota_percent / 100);
        updates.cofins_rs = parseFloat(cofinsCalculado.toFixed(2));
        newAutoFilled.cofins_rs = true;
      }

      if (Object.keys(updates).length > 0) {
        updateData(updates);
        setAutoFilled(newAutoFilled);
      }
    }
  }, [data.base_pis_cofins_rs, data.pis_aliquota_percent, data.cofins_aliquota_percent]);

  // Calcular valor sugerido de ICMS quando base mudar
  useEffect(() => {
    if (data.base_icms_rs > 0 && data.icms_aliquota_percent > 0 && (!data.icms_rs || data.icms_rs === 0)) {
      const icmsCalculado = data.base_icms_rs * (data.icms_aliquota_percent / 100);
      updateData({ icms_rs: parseFloat(icmsCalculado.toFixed(2)) });
      setAutoFilled(prev => ({ ...prev, icms_rs: true }));
    }
  }, [data.base_icms_rs, data.icms_aliquota_percent]);

  // Validação
  useEffect(() => {
    const isValid = 
      data.pis_rs >= 0 && 
      data.cofins_rs >= 0 && 
      data.icms_rs >= 0;
    setCanProceed(isValid);
  }, [data.pis_rs, data.cofins_rs, data.icms_rs, setCanProceed]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPercent = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + '%';
  };

  // Validar se base >= valor
  const pisWarning = data.base_pis_cofins_rs > 0 && data.pis_rs > data.base_pis_cofins_rs;
  const cofinsWarning = data.base_pis_cofins_rs > 0 && data.cofins_rs > data.base_pis_cofins_rs;
  const icmsWarning = data.base_icms_rs > 0 && data.icms_rs > data.base_icms_rs;

  // Total tributos
  const totalTributos = (data.pis_rs || 0) + (data.cofins_rs || 0) + (data.icms_rs || 0);

  // Recalcular valor a partir da alíquota
  const recalcularPIS = () => {
    if (data.base_pis_cofins_rs > 0 && data.pis_aliquota_percent > 0) {
      const pisCalculado = data.base_pis_cofins_rs * (data.pis_aliquota_percent / 100);
      updateData({ pis_rs: parseFloat(pisCalculado.toFixed(2)) });
      setAutoFilled(prev => ({ ...prev, pis_rs: true }));
    }
  };

  const recalcularCOFINS = () => {
    if (data.base_pis_cofins_rs > 0 && data.cofins_aliquota_percent > 0) {
      const cofinsCalculado = data.base_pis_cofins_rs * (data.cofins_aliquota_percent / 100);
      updateData({ cofins_rs: parseFloat(cofinsCalculado.toFixed(2)) });
      setAutoFilled(prev => ({ ...prev, cofins_rs: true }));
    }
  };

  const recalcularICMS = () => {
    if (data.base_icms_rs > 0 && data.icms_aliquota_percent > 0) {
      const icmsCalculado = data.base_icms_rs * (data.icms_aliquota_percent / 100);
      updateData({ icms_rs: parseFloat(icmsCalculado.toFixed(2)) });
      setAutoFilled(prev => ({ ...prev, icms_rs: true }));
    }
  };

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
            <p>Valor preenchido automaticamente da tarifa</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Passo 6 — Tributos
        </CardTitle>
        <CardDescription>
          PIS, COFINS e ICMS para relatório e auditoria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info da Tarifa */}
        <TarifaInfo compact />

        {tarifa && (tarifa.pis_percent || tarifa.cofins_percent || tarifa.icms_percent) && (
          <Alert className="bg-primary/5 border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription>
              Alíquotas de tributos preenchidas automaticamente com base na tarifa vigente
              {tarifa.resolucao_aneel && ` (${tarifa.resolucao_aneel})`}.
            </AlertDescription>
          </Alert>
        )}

        {/* PIS/COFINS */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            PIS/COFINS
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Base de Cálculo PIS/COFINS (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.base_pis_cofins_rs || ''} 
                onChange={(e) => updateData({ base_pis_cofins_rs: parseFloat(e.target.value) || 0 })}
                placeholder="30374.37"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label>PIS Alíquota (%)</Label>
                  <AutoBadge show={autoFilled.pis_aliquota} />
                </div>
                <Input 
                  type="number"
                  step="0.0001"
                  value={data.pis_aliquota_percent || ''} 
                  onChange={(e) => {
                    updateData({ pis_aliquota_percent: parseFloat(e.target.value) || 0 });
                    setAutoFilled(prev => ({ ...prev, pis_aliquota: false }));
                  }}
                  placeholder="0.5358"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Label>PIS Valor (R$)</Label>
                    <AutoBadge show={autoFilled.pis_rs} />
                  </div>
                  {data.base_pis_cofins_rs > 0 && data.pis_aliquota_percent > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={recalcularPIS}
                      className="h-6 px-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Recalcular
                    </Button>
                  )}
                </div>
                <Input 
                  type="number"
                  step="0.01"
                  value={data.pis_rs || ''} 
                  onChange={(e) => {
                    updateData({ pis_rs: parseFloat(e.target.value) || 0 });
                    setAutoFilled(prev => ({ ...prev, pis_rs: false }));
                  }}
                  placeholder="162.75"
                  className={pisWarning ? 'border-warning' : ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label>COFINS Alíquota (%)</Label>
                  <AutoBadge show={autoFilled.cofins_aliquota} />
                </div>
                <Input 
                  type="number"
                  step="0.0001"
                  value={data.cofins_aliquota_percent || ''} 
                  onChange={(e) => {
                    updateData({ cofins_aliquota_percent: parseFloat(e.target.value) || 0 });
                    setAutoFilled(prev => ({ ...prev, cofins_aliquota: false }));
                  }}
                  placeholder="2.4769"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Label>COFINS Valor (R$)</Label>
                    <AutoBadge show={autoFilled.cofins_rs} />
                  </div>
                  {data.base_pis_cofins_rs > 0 && data.cofins_aliquota_percent > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={recalcularCOFINS}
                      className="h-6 px-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Recalcular
                    </Button>
                  )}
                </div>
                <Input 
                  type="number"
                  step="0.01"
                  value={data.cofins_rs || ''} 
                  onChange={(e) => {
                    updateData({ cofins_rs: parseFloat(e.target.value) || 0 });
                    setAutoFilled(prev => ({ ...prev, cofins_rs: false }));
                  }}
                  placeholder="752.34"
                  className={cofinsWarning ? 'border-warning' : ''}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* ICMS */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            ICMS
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Base de Cálculo ICMS (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.base_icms_rs || ''} 
                onChange={(e) => updateData({ base_icms_rs: parseFloat(e.target.value) || 0 })}
                placeholder="37499.20"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label>ICMS Alíquota (%)</Label>
                  <AutoBadge show={autoFilled.icms_aliquota} />
                </div>
                <Input 
                  type="number"
                  step="0.01"
                  value={data.icms_aliquota_percent || ''} 
                  onChange={(e) => {
                    updateData({ icms_aliquota_percent: parseFloat(e.target.value) || 0 });
                    setAutoFilled(prev => ({ ...prev, icms_aliquota: false }));
                  }}
                  placeholder="19"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Label>ICMS Valor (R$)</Label>
                    <AutoBadge show={autoFilled.icms_rs} />
                  </div>
                  {data.base_icms_rs > 0 && data.icms_aliquota_percent > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={recalcularICMS}
                      className="h-6 px-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Recalcular
                    </Button>
                  )}
                </div>
                <Input 
                  type="number"
                  step="0.01"
                  value={data.icms_rs || ''} 
                  onChange={(e) => {
                    updateData({ icms_rs: parseFloat(e.target.value) || 0 });
                    setAutoFilled(prev => ({ ...prev, icms_rs: false }));
                  }}
                  placeholder="7124.85"
                  className={icmsWarning ? 'border-warning' : ''}
                />
              </div>
            </div>
          </div>
        </div>

        {(pisWarning || cofinsWarning || icmsWarning) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Atenção: Valor do tributo maior que a base de cálculo. Verifique os dados.
            </AlertDescription>
          </Alert>
        )}

        {/* Resumo */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h5 className="font-medium mb-3">Resumo de Tributos</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">PIS ({formatPercent(data.pis_aliquota_percent || 0)})</span>
              <span className="font-medium">{formatCurrency(data.pis_rs || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">COFINS ({formatPercent(data.cofins_aliquota_percent || 0)})</span>
              <span className="font-medium">{formatCurrency(data.cofins_rs || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ICMS ({data.icms_aliquota_percent || 0}%)</span>
              <span className="font-medium">{formatCurrency(data.icms_rs || 0)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base">
              <span className="font-medium">Total Tributos</span>
              <span className="font-bold text-primary">{formatCurrency(totalTributos)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
