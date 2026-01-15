import { useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '../WizardContext';
import { PlugZap, ArrowDownRight, Wallet, TrendingUp, Info, AlertTriangle, Calculator, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVinculoByUC } from '@/hooks/useClienteUsinaVinculo';
import { useTarifas } from '@/hooks/useTarifas';
import { useRateioByUCMes } from '@/hooks/useUsinaRateioMensal';

export function Step5CreditosRemotos() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();

  // Buscar vínculo da UC com usina
  const { data: vinculo, isLoading: loadingVinculo } = useVinculoByUC(data.uc_id);
  
  // Buscar tarifa vigente
  const { data: tarifa, isLoading: loadingTarifa } = useTarifas(
    data.concessionaria || null,
    data.grupo_tarifario || null,
    data.modalidade || null
  );

  // Buscar rateio existente para o mês
  const { data: rateioRemoto } = useRateioByUCMes(data.uc_id, data.mes_ref);

  // Auto-preencher dados do rateio quando disponível
  useEffect(() => {
    if (rateioRemoto && !data.credito_remoto_kwh) {
      updateData({
        credito_remoto_kwh: rateioRemoto.energia_alocada_kwh,
        credito_remoto_ponta_kwh: rateioRemoto.energia_ponta_kwh || 0,
        credito_remoto_fp_kwh: rateioRemoto.energia_fora_ponta_kwh || 0,
        credito_remoto_hr_kwh: rateioRemoto.energia_reservado_kwh || 0,
        custo_assinatura_rs: rateioRemoto.valor_fatura_usina_rs || data.custo_assinatura_rs,
      });
    }
  }, [rateioRemoto]);

  // Auto-distribuir energia por posto quando total é informado (Grupo A)
  const distribuirEnergiaPorPosto = useCallback((totalKwh: number) => {
    if (!isGrupoA || totalKwh <= 0) return;
    
    // Se já tem valores por posto, não sobrescrever
    const temValoresPosto = (data.credito_remoto_ponta_kwh || 0) > 0 || 
                            (data.credito_remoto_fp_kwh || 0) > 0 || 
                            (data.credito_remoto_hr_kwh || 0) > 0;
    if (temValoresPosto) return;

    // Calcular proporção baseada no consumo da UC
    const consumoTotal = data.consumo_ponta_kwh + data.consumo_fora_ponta_kwh + data.consumo_reservado_kwh;
    
    if (consumoTotal > 0) {
      // Distribuir proporcionalmente ao consumo
      const propPonta = data.consumo_ponta_kwh / consumoTotal;
      const propFP = data.consumo_fora_ponta_kwh / consumoTotal;
      const propHR = data.consumo_reservado_kwh / consumoTotal;
      
      updateData({
        credito_remoto_ponta_kwh: Math.round(totalKwh * propPonta * 100) / 100,
        credito_remoto_fp_kwh: Math.round(totalKwh * propFP * 100) / 100,
        credito_remoto_hr_kwh: Math.round(totalKwh * propHR * 100) / 100,
      });
    } else {
      // Padrão: 10% Ponta, 85% FP, 5% HR (perfil típico solar)
      updateData({
        credito_remoto_ponta_kwh: Math.round(totalKwh * 0.10 * 100) / 100,
        credito_remoto_fp_kwh: Math.round(totalKwh * 0.85 * 100) / 100,
        credito_remoto_hr_kwh: Math.round(totalKwh * 0.05 * 100) / 100,
      });
    }
  }, [isGrupoA, data.consumo_ponta_kwh, data.consumo_fora_ponta_kwh, data.consumo_reservado_kwh, data.credito_remoto_ponta_kwh, data.credito_remoto_fp_kwh, data.credito_remoto_hr_kwh, updateData]);

  // Calcular valor compensado baseado na tarifa (TUSD para GD)
  const valorCompensadoCalculado = useMemo(() => {
    if (!tarifa || !data.credito_remoto_kwh) return null;

    if (isGrupoA) {
      // Grupo A (Binômia): soma por posto horário usando TUSD (GD só compensa TUSD)
      const energiaPonta = data.credito_remoto_ponta_kwh || 0;
      const energiaFP = data.credito_remoto_fp_kwh || 0;
      const energiaHR = data.credito_remoto_hr_kwh || 0;
      
      const valorPonta = energiaPonta * (tarifa.tusd_ponta_rs_kwh || 0);
      const valorFP = energiaFP * (tarifa.tusd_fora_ponta_rs_kwh || 0);
      const valorHR = energiaHR * (tarifa.tusd_reservado_rs_kwh || 0);
      
      return valorPonta + valorFP + valorHR;
    } else {
      // Grupo B (Monômia): tarifa única
      const tusdUnica = tarifa.tusd_unica_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0;
      return data.credito_remoto_kwh * tusdUnica;
    }
  }, [tarifa, data.credito_remoto_kwh, data.credito_remoto_ponta_kwh, data.credito_remoto_fp_kwh, data.credito_remoto_hr_kwh, isGrupoA]);

  // Calcular custo da assinatura baseado na modalidade do contrato
  const custoAssinaturaCalculado = useMemo(() => {
    if (!vinculo || !data.credito_remoto_kwh) return null;

    if (vinculo.modalidade_economia === 'ppa_tarifa') {
      // PPA: kWh alocados × tarifa fixa do contrato
      return data.credito_remoto_kwh * (vinculo.tarifa_ppa_rs_kwh || 0);
    } else {
      // Desconto sobre fatura: valor compensado × (100% - desconto%)
      // O custo é o que o cliente paga ao gerador
      const valorCompensado = data.credito_remoto_compensado_rs || valorCompensadoCalculado || 0;
      const desconto = vinculo.desconto_garantido_percent || 0;
      
      // Custo = valor compensado × (1 - desconto/100)
      // Ex: se desconto é 15%, cliente paga 85% do valor compensado
      return valorCompensado * (1 - desconto / 100);
    }
  }, [vinculo, data.credito_remoto_kwh, data.credito_remoto_compensado_rs, valorCompensadoCalculado]);

  // Auto-atualizar valor compensado quando calculado
  useEffect(() => {
    if (valorCompensadoCalculado !== null && !data.credito_remoto_compensado_rs) {
      updateData({ credito_remoto_compensado_rs: valorCompensadoCalculado });
    }
  }, [valorCompensadoCalculado]);

  // Auto-atualizar custo da assinatura quando calculado
  useEffect(() => {
    if (custoAssinaturaCalculado !== null && !data.custo_assinatura_rs) {
      updateData({ custo_assinatura_rs: custoAssinaturaCalculado });
    }
  }, [custoAssinaturaCalculado]);

  // Cálculos de economia
  const calculos = useMemo(() => {
    const economiaLiquida = data.credito_remoto_compensado_rs - data.custo_assinatura_rs;
    const creditosUtilizados = Math.min(data.credito_remoto_kwh, data.consumo_residual_kwh);
    const consumoFinal = Math.max(0, data.consumo_residual_kwh - creditosUtilizados);
    const descontoEfetivo = data.credito_remoto_compensado_rs > 0
      ? ((economiaLiquida / data.credito_remoto_compensado_rs) * 100).toFixed(1)
      : '0';

    return {
      economiaLiquida,
      creditosUtilizados,
      consumoFinal,
      descontoEfetivo,
    };
  }, [data]);

  // Atualizar contexto
  useEffect(() => {
    updateData({
      economia_liquida_rs: calculos.economiaLiquida,
      consumo_final_kwh: calculos.consumoFinal,
    });
  }, [calculos, updateData]);

  // Validação
  useEffect(() => {
    if (!data.tem_usina_remota) {
      setCanProceed(true);
      return;
    }
    const hasValues = data.credito_remoto_kwh > 0 || data.credito_remoto_compensado_rs > 0;
    setCanProceed(hasValues);
  }, [data.tem_usina_remota, data.credito_remoto_kwh, data.credito_remoto_compensado_rs, setCanProceed]);

  // Helpers para labels
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

  if (!data.tem_usina_remota) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-5 w-5" />
            Créditos Remotos
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
          Créditos Remotos (Usina Assinada)
        </CardTitle>
        <CardDescription>
          Créditos recebidos da usina remota via contrato de assinatura. 
          Estes créditos compensam o consumo que não foi abatido pelo autoconsumo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Card de Contrato */}
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

        {loadingVinculo && (
          <div className="text-sm text-muted-foreground">Carregando dados do contrato...</div>
        )}

        {/* Contexto - Consumo Residual */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Consumo Residual (após autoconsumo):</span>
            <span className="text-lg font-bold">{data.consumo_residual_kwh.toLocaleString('pt-BR')} kWh</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Este é o consumo que precisa ser compensado pelos créditos remotos ou pago à concessionária.
          </p>
        </div>

        {/* Créditos Alocados */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium text-blue-700 dark:text-blue-400">
              Créditos Alocados Neste Mês
            </h3>
          </div>

          {/* Campos de Energia por Posto (Grupo A) */}
          {isGrupoA ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Energia Total Alocada (kWh)</Label>
                  <button
                    type="button"
                    onClick={() => distribuirEnergiaPorPosto(data.credito_remoto_kwh)}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                    disabled={!data.credito_remoto_kwh}
                  >
                    Distribuir por posto
                  </button>
                </div>
                <Input
                  type="number"
                  value={data.credito_remoto_kwh || ''}
                  onChange={(e) => {
                    const valor = parseFloat(e.target.value) || 0;
                    updateData({ credito_remoto_kwh: valor });
                  }}
                  onBlur={() => {
                    // Auto-distribuir ao sair do campo se não tem valores por posto
                    if (data.credito_remoto_kwh > 0) {
                      distribuirEnergiaPorPosto(data.credito_remoto_kwh);
                    }
                  }}
                  placeholder="Total de créditos recebidos"
                />
                <p className="text-xs text-muted-foreground">
                  Ao informar o total, os valores por posto serão distribuídos proporcionalmente ao consumo.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Ponta (kWh)</Label>
                  <Input
                    type="number"
                    value={data.credito_remoto_ponta_kwh || ''}
                    onChange={(e) => updateData({ credito_remoto_ponta_kwh: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Fora Ponta (kWh)</Label>
                  <Input
                    type="number"
                    value={data.credito_remoto_fp_kwh || ''}
                    onChange={(e) => updateData({ credito_remoto_fp_kwh: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Reservado (kWh)</Label>
                  <Input
                    type="number"
                    value={data.credito_remoto_hr_kwh || ''}
                    onChange={(e) => updateData({ credito_remoto_hr_kwh: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Energia Alocada (kWh)</Label>
              <Input
                type="number"
                value={data.credito_remoto_kwh || ''}
                onChange={(e) => updateData({ credito_remoto_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="Créditos recebidos da usina"
              />
            </div>
          )}

          {/* Valor Compensado */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Valor Compensado (R$)</Label>
              {valorCompensadoCalculado !== null && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Calculator className="h-3 w-3" />
                  Calculado via tarifa
                </Badge>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              value={data.credito_remoto_compensado_rs || ''}
              onChange={(e) => updateData({ credito_remoto_compensado_rs: parseFloat(e.target.value) || 0 })}
              placeholder="Desconto na fatura"
            />
            {tarifa && (
              <p className="text-xs text-muted-foreground">
                Tarifa TUSD: R$ {(tarifa.tusd_unica_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0).toFixed(4)}/kWh
              </p>
            )}
          </div>

          {/* Custo da Assinatura */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custo da Assinatura (R$)</Label>
              {custoAssinaturaCalculado !== null && vinculo && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Calculator className="h-3 w-3" />
                  {vinculo.modalidade_economia === 'ppa_tarifa' ? 'PPA' : 'Desconto'}
                </Badge>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              value={data.custo_assinatura_rs || ''}
              onChange={(e) => updateData({ custo_assinatura_rs: parseFloat(e.target.value) || 0 })}
              placeholder="Valor pago ao gerador"
            />
            {vinculo && (
              <p className="text-xs text-muted-foreground">
                {vinculo.modalidade_economia === 'ppa_tarifa' 
                  ? `Cálculo: ${data.credito_remoto_kwh || 0} kWh × R$ ${(vinculo.tarifa_ppa_rs_kwh || 0).toFixed(4)}`
                  : `Cálculo: R$ ${(data.credito_remoto_compensado_rs || 0).toFixed(2)} × ${100 - (vinculo.desconto_garantido_percent || 0)}%`
                }
              </p>
            )}
          </div>
        </div>

        {/* Economia Líquida */}
        <div className={`p-4 rounded-lg border-2 ${
          calculos.economiaLiquida >= 0 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {calculos.economiaLiquida >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <h3 className="font-medium">Economia Líquida</h3>
            </div>
            <Badge variant={calculos.economiaLiquida >= 0 ? "default" : "destructive"}>
              Desconto Efetivo: {calculos.descontoEfetivo}%
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Valor Compensado:</span>
              <span className="font-medium text-green-600">
                + R$ {data.credito_remoto_compensado_rs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Custo Assinatura:</span>
              <span className="font-medium text-red-600">
                − R$ {data.custo_assinatura_rs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-medium">Economia Líquida:</span>
              <span className={`text-xl font-bold ${
                calculos.economiaLiquida >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                R$ {calculos.economiaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {calculos.economiaLiquida < 0 && (
            <p className="text-xs text-red-600 mt-2">
              ⚠️ O custo da assinatura é maior que o valor compensado neste mês.
            </p>
          )}
        </div>

        {/* Saldos de Créditos */}
        {isGrupoA ? (
          <div className="p-4 bg-muted/50 border rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <h3 className="font-medium">Saldo de Créditos (Fim do Ciclo)</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ponta (kWh)</Label>
                <Input
                  type="number"
                  value={data.scee_saldo_kwh_p || ''}
                  onChange={(e) => updateData({ scee_saldo_kwh_p: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fora Ponta (kWh)</Label>
                <Input
                  type="number"
                  value={data.scee_saldo_kwh_fp || ''}
                  onChange={(e) => updateData({ scee_saldo_kwh_fp: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reservado (kWh)</Label>
                <Input
                  type="number"
                  value={data.scee_saldo_kwh_hr || ''}
                  onChange={(e) => updateData({ scee_saldo_kwh_hr: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-amber-600">Expiram em 30 dias (kWh)</Label>
                <Input
                  type="number"
                  value={data.scee_saldo_expirar_30d_kwh || ''}
                  onChange={(e) => updateData({ scee_saldo_expirar_30d_kwh: parseFloat(e.target.value) || 0 })}
                  className="border-amber-300"
                />
              </div>
              <div className="space-y-2">
                <Label>Expiram em 60 dias (kWh)</Label>
                <Input
                  type="number"
                  value={data.scee_saldo_expirar_60d_kwh || ''}
                  onChange={(e) => updateData({ scee_saldo_expirar_60d_kwh: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {data.scee_saldo_expirar_30d_kwh > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription>
                  Atenção: {data.scee_saldo_expirar_30d_kwh.toLocaleString('pt-BR')} kWh de créditos 
                  expiram nos próximos 30 dias. Considere otimizar o uso.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted/50 border rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <h3 className="font-medium">Saldo de Créditos (Fim do Ciclo)</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Saldo Total (kWh)</Label>
                <Input
                  type="number"
                  value={data.scee_saldo_kwh_fp || ''}
                  onChange={(e) => updateData({ scee_saldo_kwh_fp: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Resumo Final */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h3 className="font-medium">Fluxo de Compensação</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consumo Total UC:</span>
              <span className="font-medium">{data.consumo_total_kwh.toLocaleString('pt-BR')} kWh</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>(−) Autoconsumo:</span>
              <span className="font-medium">{data.autoconsumo_total_kwh.toLocaleString('pt-BR')} kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">(=) Consumo Residual:</span>
              <span className="font-medium">{data.consumo_residual_kwh.toLocaleString('pt-BR')} kWh</span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>(−) Créditos Remotos:</span>
              <span className="font-medium">{calculos.creditosUtilizados.toLocaleString('pt-BR')} kWh</span>
            </div>
          </div>

          <div className="border-t pt-3 flex justify-between items-center">
            <span className="font-medium">Consumo Final (a pagar):</span>
            <span className="text-xl font-bold text-primary">
              {calculos.consumoFinal.toLocaleString('pt-BR')} kWh
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
