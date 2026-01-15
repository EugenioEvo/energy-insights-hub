import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '../WizardContext';
import { Sun, Zap, ArrowRight, Info, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTarifas } from '@/hooks/useTarifas';
import { calcularTotaisGeracaoLocal } from '@/lib/energyBalanceCalculations';

export function Step4GeracaoLocal() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();
  
  // Buscar tarifa vigente
  const { data: tarifa } = useTarifas(
    data.concessionaria || null,
    data.grupo_tarifario || null,
    data.modalidade || null
  );

  // Calcular totais usando função centralizada
  const totais = useMemo(() => {
    return calcularTotaisGeracaoLocal(data, isGrupoA);
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
  // Soma todos os postos tarifários: Ponta, Fora Ponta e Horário Reservado
  const valorAutoconsumoCalculado = useMemo(() => {
    if (totais.autoconsumoTotal <= 0) return null;

    // Se o usuário informou a tarifa líquida FP diretamente, usar ela para todos os postos
    if (data.tarifa_liquida_fp_rs_kwh && data.tarifa_liquida_fp_rs_kwh > 0) {
      // Aplica a tarifa informada ao autoconsumo total
      return totais.autoconsumoTotal * data.tarifa_liquida_fp_rs_kwh;
    }

    // Senão, calcular via componentes da tarifa cadastrada
    if (!tarifa) return null;

    if (isGrupoA) {
      // Grupo A: calcular por posto tarifário (Ponta, FP, HR)
      const bandeiraValor = obterValorBandeira(tarifa, data.bandeira);
      const encargos = tarifa.tusd_encargos_rs_kwh || 0;
      
      // Ponta
      const tePonta = tarifa.te_ponta_rs_kwh || 0;
      const tusdPonta = tarifa.tusd_ponta_rs_kwh || 0;
      const tarifaPonta = tePonta + tusdPonta + encargos + bandeiraValor;
      const valorPonta = (data.autoconsumo_ponta_kwh || 0) * tarifaPonta;
      
      // Fora Ponta
      const teFP = tarifa.te_fora_ponta_rs_kwh || 0;
      const tusdFP = tarifa.tusd_fora_ponta_rs_kwh || 0;
      const tarifaFP = teFP + tusdFP + encargos + bandeiraValor;
      const valorFP = (data.autoconsumo_fp_kwh || 0) * tarifaFP;
      
      // Horário Reservado (usa tarifa reservado se disponível, senão usa FP)
      const teHR = tarifa.te_reservado_rs_kwh || tarifa.te_fora_ponta_rs_kwh || 0;
      const tusdHR = tarifa.tusd_reservado_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0;
      const tarifaHR = teHR + tusdHR + encargos + bandeiraValor;
      const valorHR = (data.autoconsumo_hr_kwh || 0) * tarifaHR;
      
      // Soma de todos os postos
      const valorBase = valorPonta + valorFP + valorHR;
      
      // Aplicar impostos (método "por dentro") - cost avoidance
      const impostos = obterImpostos(tarifa);
      const fatorImpostos = 1 - (impostos.icms + impostos.pis + impostos.cofins) / 100;
      
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
    }
  }, [tarifa, totais.autoconsumoTotal, data.autoconsumo_ponta_kwh, data.autoconsumo_fp_kwh, data.autoconsumo_hr_kwh, data.bandeira, data.tarifa_liquida_fp_rs_kwh, isGrupoA]);

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

        {/* 1. Injeção (Excedente na Rede) - Informar primeiro */}
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

        {/* 2. Autoconsumo (Resultado = Geração - Injeção) */}
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

          {/* Tarifa Líquida FP (input direto) */}
          {isGrupoA && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Tarifa Líquida FP (R$/kWh)</Label>
                <Badge variant="outline" className="text-xs">Opcional</Badge>
              </div>
              <Input
                type="number"
                step="0.0001"
                value={data.tarifa_liquida_fp_rs_kwh || ''}
                onChange={(e) => updateData({ tarifa_liquida_fp_rs_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="Ex: 0.47"
              />
              <p className="text-xs text-muted-foreground">
                Informe o valor líquido FP da fatura (TE+TUSD+Encargos+Impostos). 
                Se preenchido, será usado diretamente no cálculo.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Valor Economizado (R$)</Label>
              {valorAutoconsumoCalculado !== null && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Calculator className="h-3 w-3" />
                  {data.tarifa_liquida_fp_rs_kwh > 0 ? 'Via tarifa informada' : 'Calculado via tarifa'}
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
