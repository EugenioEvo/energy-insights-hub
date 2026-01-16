/**
 * PASSO 4 — GERAÇÃO DISTRIBUÍDA (Consolidado)
 * Unifica geração local (autoconsumo/injeção) + créditos remotos
 */

import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Sun, Zap, ArrowRight, ArrowDown, Building2, Calculator, Info, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { obterPercentualFioB } from '@/lib/lei14300';

export function Step4GeracaoDistribuida() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();

  // Classificação GD
  const classificacaoGD = useMemo(() => {
    const anoRef = data.mes_ref 
      ? parseInt(data.mes_ref.split('-')[0]) 
      : new Date().getFullYear();
    const percentualFioB = obterPercentualFioB(anoRef);
    const tipo: 'gd1' | 'gd2' = 'gd2'; // TODO: buscar da UC
    return { tipo, percentualFioB, anoRef };
  }, [data.mes_ref]);

  // Cálculos consolidados
  const calculos = useMemo(() => {
    // Geração local
    const geracaoLocal = data.geracao_local_total_kwh || 0;
    
    // Autoconsumo
    const autoconsumoTotal = isGrupoA
      ? (data.autoconsumo_ponta_kwh || 0) + (data.autoconsumo_fp_kwh || 0) + (data.autoconsumo_hr_kwh || 0)
      : (data.autoconsumo_total_kwh || 0);
    
    // Injeção (créditos próprios)
    const injecaoTotal = isGrupoA
      ? (data.injecao_ponta_kwh || 0) + (data.injecao_fp_kwh || 0) + (data.injecao_hr_kwh || 0)
      : (data.injecao_total_kwh || 0);
    
    // Créditos remotos
    const creditosRemotos = data.credito_remoto_kwh || 0;
    
    // Totais
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

  // Validação
  useEffect(() => {
    // Sempre pode prosseguir (geração é opcional)
    setCanProceed(true);
  }, [setCanProceed]);

  const formatKwh = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kWh';
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

        {/* Classificação GD */}
        {(() => {
          const isGD1 = classificacaoGD.tipo === ('gd1' as 'gd1' | 'gd2');
          return (
            <Alert className={isGD1 
              ? "bg-green-50 border-green-300 dark:bg-green-950/30"
              : "bg-amber-50 border-amber-300 dark:bg-amber-950/30"
            }>
              <Shield className={`h-4 w-4 ${isGD1 ? 'text-green-600' : 'text-amber-600'}`} />
              <AlertDescription>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <strong>{classificacaoGD.tipo.toUpperCase()}</strong> — Ano {classificacaoGD.anoRef}
                  </div>
                  <div className="text-sm">
                    {isGD1 
                      ? 'Compensação integral (TE + TUSD)'
                      : `Fio B não compensável: ${classificacaoGD.percentualFioB}%`}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          );
        })()}

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Créditos Recebidos (kWh)</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={data.credito_remoto_kwh || ''} 
                    onChange={(e) => updateData({ credito_remoto_kwh: parseFloat(e.target.value) || 0 })}
                    placeholder="Créditos transferidos da usina remota"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo Assinatura (R$)</Label>
                  <Input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.custo_assinatura_rs || ''} 
                    onChange={(e) => updateData({ custo_assinatura_rs: parseFloat(e.target.value) || 0 })}
                    placeholder="Valor pago à usina"
                  />
                </div>
              </div>
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
