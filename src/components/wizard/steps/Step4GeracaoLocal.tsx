import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '../WizardContext';
import { Sun, Zap, ArrowRight, Info, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTarifas } from '@/hooks/useTarifas';

export function Step4GeracaoLocal() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();
  
  // Buscar tarifa vigente
  const { data: tarifa } = useTarifas(
    data.concessionaria || null,
    data.grupo_tarifario || null,
    data.modalidade || null
  );

  // Calcular totais automaticamente
  const totais = useMemo(() => {
    const autoconsumoTotal = isGrupoA
      ? data.autoconsumo_ponta_kwh + data.autoconsumo_fp_kwh + data.autoconsumo_hr_kwh
      : data.autoconsumo_total_kwh;
    
    const injecaoTotal = isGrupoA
      ? data.injecao_ponta_kwh + data.injecao_fp_kwh + data.injecao_hr_kwh
      : data.injecao_total_kwh;
    
    const geracaoCalculada = autoconsumoTotal + injecaoTotal;
    
    // Consumo residual = consumo total - autoconsumo
    const consumoResidual = Math.max(0, data.consumo_total_kwh - autoconsumoTotal);
    
    // Percentuais
    const pctAutoconsumo = geracaoCalculada > 0 
      ? (autoconsumoTotal / geracaoCalculada * 100).toFixed(1) 
      : '0';
    const pctInjecao = geracaoCalculada > 0 
      ? (injecaoTotal / geracaoCalculada * 100).toFixed(1) 
      : '0';

    return {
      autoconsumoTotal,
      injecaoTotal,
      geracaoCalculada,
      consumoResidual,
      pctAutoconsumo,
      pctInjecao,
    };
  }, [data, isGrupoA]);

  // Função auxiliar para obter valor da bandeira
  const obterValorBandeira = (tarifaData: typeof tarifa, bandeira: string): number => {
    if (!tarifaData) return 0;
    switch (bandeira?.toLowerCase()) {
      case 'verde': return tarifaData.bandeira_verde_rs_kwh || 0;
      case 'amarela': return tarifaData.bandeira_amarela_rs_kwh || 0;
      case 'vermelha1': return tarifaData.bandeira_vermelha1_rs_kwh || 0;
      case 'vermelha2': return tarifaData.bandeira_vermelha2_rs_kwh || 0;
      default: return 0;
    }
  };

  // Valores padrão de impostos para "cost avoidance" (economia evitada)
  // Quando não preenchidos na tarifa, usar valores típicos do setor elétrico
  const IMPOSTOS_DEFAULT = {
    icms: 29, // ICMS típico para energia elétrica (varia por estado: 17-29%)
    pis: 1.65, // PIS típico
    cofins: 7.6 // COFINS típico
  };

  // Obter impostos com fallback para valores típicos (cost avoidance)
  const obterImpostos = (tarifaData: typeof tarifa) => {
    const icms = (tarifaData?.icms_percent && tarifaData.icms_percent > 0) 
      ? tarifaData.icms_percent 
      : IMPOSTOS_DEFAULT.icms;
    const pis = (tarifaData?.pis_percent && tarifaData.pis_percent > 0) 
      ? tarifaData.pis_percent 
      : IMPOSTOS_DEFAULT.pis;
    const cofins = (tarifaData?.cofins_percent && tarifaData.cofins_percent > 0) 
      ? tarifaData.cofins_percent 
      : IMPOSTOS_DEFAULT.cofins;
    return { icms, pis, cofins };
  };

  // Calcular autoconsumo FP automaticamente: Geração Total - Injeção FP
  // Solar gera apenas durante o dia (horário Fora Ponta)
  const autoconsumoFPCalculado = useMemo(() => {
    if (data.geracao_local_total_kwh <= 0) return null;
    const injecaoFP = data.injecao_fp_kwh || 0;
    return Math.max(0, data.geracao_local_total_kwh - injecaoFP);
  }, [data.geracao_local_total_kwh, data.injecao_fp_kwh]);

  // Calcular valor de autoconsumo com precificação completa (behind the meter)
  // Inclui: TE + TUSD + Encargos + Bandeira + Impostos
  const valorAutoconsumoCalculado = useMemo(() => {
    if (!tarifa || totais.autoconsumoTotal <= 0) return null;

    if (isGrupoA) {
      // Grupo A: apenas FP (solar gera durante o dia)
      const teFP = tarifa.te_fora_ponta_rs_kwh || 0;
      const tusdFP = tarifa.tusd_fora_ponta_rs_kwh || 0;
      const encargos = tarifa.tusd_encargos_rs_kwh || 0;
      const bandeiraValor = obterValorBandeira(tarifa, data.bandeira);
      
      // Tarifa base por kWh (TE + TUSD + Encargos + Bandeira)
      const tarifaBase = teFP + tusdFP + encargos + bandeiraValor;
      const valorBase = data.autoconsumo_fp_kwh * tarifaBase;
      
      // Aplicar impostos (método "por dentro") - cost avoidance
      const impostos = obterImpostos(tarifa);
      const fatorImpostos = 1 - (impostos.icms + impostos.pis + impostos.cofins) / 100;
      
      return fatorImpostos > 0 ? valorBase / fatorImpostos : valorBase;
      
      return fatorImpostos > 0 ? valorBase / fatorImpostos : valorBase;
    } else {
      // Grupo B: tarifa única com impostos
      const teUnica = tarifa.te_unica_rs_kwh || 0;
      const tusdUnica = tarifa.tusd_unica_rs_kwh || 0;
      const encargos = tarifa.tusd_encargos_rs_kwh || 0;
      const bandeiraValor = obterValorBandeira(tarifa, data.bandeira);
      
      const tarifaBase = teUnica + tusdUnica + encargos + bandeiraValor;
      const valorBase = totais.autoconsumoTotal * tarifaBase;
      
      // Aplicar impostos (método "por dentro") - cost avoidance
      const impostos = obterImpostos(tarifa);
      const fatorImpostos = 1 - (impostos.icms + impostos.pis + impostos.cofins) / 100;
      
      return fatorImpostos > 0 ? valorBase / fatorImpostos : valorBase;
      
      return fatorImpostos > 0 ? valorBase / fatorImpostos : valorBase;
    }
  }, [tarifa, totais.autoconsumoTotal, data.autoconsumo_fp_kwh, data.bandeira, isGrupoA]);

  // Detalhamento do cálculo para exibição
  const detalhamentoCalculo = useMemo(() => {
    if (!tarifa || !isGrupoA) return null;
    
    const teFP = tarifa.te_fora_ponta_rs_kwh || 0;
    const tusdFP = tarifa.tusd_fora_ponta_rs_kwh || 0;
    const encargos = tarifa.tusd_encargos_rs_kwh || 0;
    const bandeiraValor = obterValorBandeira(tarifa, data.bandeira);
    
    // Usar impostos com fallback (cost avoidance)
    const impostos = obterImpostos(tarifa);
    
    return {
      teFP,
      tusdFP,
      encargos,
      bandeira: bandeiraValor,
      impostos,
      tarifaTotal: teFP + tusdFP + encargos + bandeiraValor
    };
  }, [tarifa, data.bandeira, isGrupoA]);

  // Auto-atualizar valor do autoconsumo quando calculado
  useEffect(() => {
    if (valorAutoconsumoCalculado !== null && valorAutoconsumoCalculado > 0) {
      updateData({ autoconsumo_rs: Math.round(valorAutoconsumoCalculado * 100) / 100 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorAutoconsumoCalculado]);

  // Auto-preencher autoconsumo FP: Geração Total - Injeção FP (solar = apenas FP)
  useEffect(() => {
    if (data.geracao_local_total_kwh > 0) {
      if (isGrupoA) {
        // Solar gera apenas durante o dia (FP) - usar apenas injeção FP
        const injecaoFP = data.injecao_fp_kwh || 0;
        const autoconsumoFP = Math.max(0, data.geracao_local_total_kwh - injecaoFP);
        
        // Preencher automaticamente: Ponta=0, FP=calculado, HR=0
        updateData({ 
          autoconsumo_fp_kwh: autoconsumoFP,
          autoconsumo_ponta_kwh: 0,  // Solar não gera em ponta
          autoconsumo_hr_kwh: 0      // Solar não gera em reservado
        });
      } else {
        // Grupo B: cálculo direto
        const autoconsumoCalculado = Math.max(0, data.geracao_local_total_kwh - data.injecao_total_kwh);
        updateData({ autoconsumo_total_kwh: autoconsumoCalculado });
      }
    }
  }, [data.geracao_local_total_kwh, data.injecao_total_kwh, data.injecao_fp_kwh, isGrupoA, updateData]);

  // Atualizar totais no contexto
  useEffect(() => {
    if (isGrupoA) {
      updateData({
        autoconsumo_total_kwh: totais.autoconsumoTotal,
        injecao_total_kwh: totais.injecaoTotal,
        consumo_residual_kwh: totais.consumoResidual,
      });
    }
  }, [totais, isGrupoA, updateData]);

  // Validação - se tem geração local, deve ter pelo menos algum valor
  useEffect(() => {
    if (!data.tem_geracao_local) {
      setCanProceed(true);
      return;
    }
    const hasValues = data.geracao_local_total_kwh > 0 || totais.geracaoCalculada > 0;
    setCanProceed(hasValues);
  }, [data.tem_geracao_local, data.geracao_local_total_kwh, totais.geracaoCalculada, setCanProceed]);

  if (!data.tem_geracao_local) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Geração Local
          </CardTitle>
          <CardDescription>
            Esta UC não possui geração local configurada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Você indicou que esta UC não possui usina junto à carga. 
              Se houver geração local, volte ao Passo 0 e ative a opção "Geração Local".
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
          <Sun className="h-5 w-5 text-amber-500" />
          Geração Local (Usina Própria)
        </CardTitle>
        <CardDescription>
          Energia gerada pela usina junto à carga. O autoconsumo (energia simultânea) 
          gera 100% de economia, enquanto a injeção gera créditos para uso futuro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Geração Total */}
        <div className="space-y-2">
          <Label htmlFor="geracao_total">Geração Total do Ciclo (kWh)</Label>
          <Input
            id="geracao_total"
            type="number"
            value={data.geracao_local_total_kwh || ''}
            onChange={(e) => updateData({ geracao_local_total_kwh: parseFloat(e.target.value) || 0 })}
            placeholder="Total gerado no mês"
          />
          <p className="text-xs text-muted-foreground">
            Valor total medido no inversor ou medidor de geração
          </p>
        </div>

        {/* Autoconsumo */}
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                <Zap className="h-4 w-4" />
                Autoconsumo (Energia Simultânea)
              </h3>
              <p className="text-sm text-muted-foreground">
                Energia consumida no momento da geração — economia de 100%
              </p>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
              {totais.pctAutoconsumo}% da geração
            </Badge>
          </div>

          {isGrupoA ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Ponta (kWh)</Label>
                  <Input
                    type="number"
                    value={data.autoconsumo_ponta_kwh || 0}
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                    title="Solar não gera em horário de ponta (noite)"
                  />
                  <p className="text-xs text-muted-foreground">Solar = 0 (noite)</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Fora Ponta (kWh)</Label>
                    {autoconsumoFPCalculado !== null && (
                      <Badge variant="outline" className="text-xs gap-1 bg-green-500/10 text-green-700">
                        <Calculator className="h-3 w-3" />
                        Auto
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="number"
                    value={data.autoconsumo_fp_kwh || ''}
                    onChange={(e) => updateData({ autoconsumo_fp_kwh: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Geração − Injeção FP</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Reservado (kWh)</Label>
                  <Input
                    type="number"
                    value={data.autoconsumo_hr_kwh || 0}
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                    title="Solar não gera em horário reservado"
                  />
                  <p className="text-xs text-muted-foreground">Solar = 0</p>
                </div>
              </div>
              
              {/* Explicação do cálculo */}
              {autoconsumoFPCalculado !== null && data.geracao_local_total_kwh > 0 && (
                <div className="p-2 bg-green-500/5 rounded text-xs text-muted-foreground">
                  <span className="font-medium">Cálculo:</span>{' '}
                  {data.geracao_local_total_kwh.toLocaleString('pt-BR')} kWh (geração) − {' '}
                  {(data.injecao_fp_kwh || 0).toLocaleString('pt-BR')} kWh (injeção FP) = {' '}
                  <span className="font-bold text-green-700">{autoconsumoFPCalculado.toLocaleString('pt-BR')} kWh</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Autoconsumo Total (kWh)</Label>
              <Input
                type="number"
                value={data.autoconsumo_total_kwh || ''}
                onChange={(e) => updateData({ autoconsumo_total_kwh: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-background rounded">
            <span className="text-sm font-medium">Total Autoconsumo:</span>
            <span className="text-lg font-bold text-green-700 dark:text-green-400">
              {totais.autoconsumoTotal.toLocaleString('pt-BR')} kWh
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Valor Economizado (R$)</Label>
              {valorAutoconsumoCalculado !== null && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Calculator className="h-3 w-3" />
                  Calculado via tarifa
                </Badge>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              value={data.autoconsumo_rs || ''}
              onChange={(e) => updateData({ autoconsumo_rs: parseFloat(e.target.value) || 0 })}
              placeholder="Economia pelo autoconsumo"
            />
            {tarifa && detalhamentoCalculo && isGrupoA && (
              <div className="p-2 bg-muted/50 rounded text-xs space-y-1">
                <p className="font-medium text-foreground">Behind the Meter - Economia 100%:</p>
                <div className="grid grid-cols-2 gap-x-4 text-muted-foreground">
                  <span>TE (FP): R$ {detalhamentoCalculo.teFP.toFixed(4)}/kWh</span>
                  <span>TUSD (FP): R$ {detalhamentoCalculo.tusdFP.toFixed(4)}/kWh</span>
                  <span>Encargos: R$ {detalhamentoCalculo.encargos.toFixed(4)}/kWh</span>
                  <span>Bandeira: R$ {detalhamentoCalculo.bandeira.toFixed(4)}/kWh</span>
                </div>
                <p className="pt-1 border-t mt-1">
                  Impostos: ICMS {detalhamentoCalculo.impostos.icms}% + PIS {detalhamentoCalculo.impostos.pis}% + COFINS {detalhamentoCalculo.impostos.cofins}%
                </p>
                <p className="font-medium text-foreground">
                  Total: R$ {detalhamentoCalculo.tarifaTotal.toFixed(4)}/kWh + impostos
                </p>
              </div>
            )}
            {tarifa && !isGrupoA && (
              <p className="text-xs text-muted-foreground">
                Tarifa TE+TUSD+Encargos: R$ {(
                  (tarifa.te_unica_rs_kwh || 0) + (tarifa.tusd_unica_rs_kwh || 0) + (tarifa.tusd_encargos_rs_kwh || 0)
                ).toFixed(4)}/kWh + impostos
              </p>
            )}
          </div>
        </div>

        {/* Injeção */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <ArrowRight className="h-4 w-4" />
                Injeção (Excedente na Rede)
              </h3>
              <p className="text-sm text-muted-foreground">
                Energia gerada não consumida — gera créditos próprios
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
              {totais.pctInjecao}% da geração
            </Badge>
          </div>

          {isGrupoA ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ponta (kWh)</Label>
                <Input
                  type="number"
                  value={data.injecao_ponta_kwh || ''}
                  onChange={(e) => updateData({ injecao_ponta_kwh: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fora Ponta (kWh)</Label>
                <Input
                  type="number"
                  value={data.injecao_fp_kwh || ''}
                  onChange={(e) => updateData({ injecao_fp_kwh: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reservado (kWh)</Label>
                <Input
                  type="number"
                  value={data.injecao_hr_kwh || ''}
                  onChange={(e) => updateData({ injecao_hr_kwh: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Injeção Total (kWh)</Label>
              <Input
                type="number"
                value={data.injecao_total_kwh || ''}
                onChange={(e) => updateData({ injecao_total_kwh: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-background rounded">
            <span className="text-sm font-medium">Total Injeção:</span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {totais.injecaoTotal.toLocaleString('pt-BR')} kWh
            </span>
          </div>
        </div>

        {/* Resumo */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h3 className="font-medium">Resumo da Geração Local</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consumo Total UC:</span>
              <span className="font-medium">{data.consumo_total_kwh.toLocaleString('pt-BR')} kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Geração Local:</span>
              <span className="font-medium">{(data.geracao_local_total_kwh || totais.geracaoCalculada).toLocaleString('pt-BR')} kWh</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>(–) Autoconsumo:</span>
              <span className="font-medium">{totais.autoconsumoTotal.toLocaleString('pt-BR')} kWh</span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>(→) Injeção:</span>
              <span className="font-medium">{totais.injecaoTotal.toLocaleString('pt-BR')} kWh</span>
            </div>
          </div>

          <div className="border-t pt-3 flex justify-between items-center">
            <span className="font-medium">Consumo Residual (após autoconsumo):</span>
            <span className="text-xl font-bold">{totais.consumoResidual.toLocaleString('pt-BR')} kWh</span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Este valor será abatido pelos créditos (próprios e remotos) no próximo passo.
          </p>
        </div>

        {/* Validação da consistência */}
        {data.geracao_local_total_kwh > 0 && 
         Math.abs(data.geracao_local_total_kwh - totais.geracaoCalculada) > 1 && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              A soma do autoconsumo ({totais.autoconsumoTotal.toLocaleString('pt-BR')} kWh) + 
              injeção ({totais.injecaoTotal.toLocaleString('pt-BR')} kWh) = {totais.geracaoCalculada.toLocaleString('pt-BR')} kWh 
              difere da geração total informada ({data.geracao_local_total_kwh.toLocaleString('pt-BR')} kWh).
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
