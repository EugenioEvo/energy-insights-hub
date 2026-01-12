import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '../WizardContext';
import { PlugZap, ArrowDownRight, Wallet, TrendingUp, Info, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Step5CreditosRemotos() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();

  // Cálculos
  const calculos = useMemo(() => {
    // Economia líquida = valor compensado - custo assinatura
    const economiaLiquida = data.credito_remoto_compensado_rs - data.custo_assinatura_rs;
    
    // Consumo final = consumo residual - créditos remotos utilizados
    const creditosUtilizados = Math.min(data.credito_remoto_kwh, data.consumo_residual_kwh);
    const consumoFinal = Math.max(0, data.consumo_residual_kwh - creditosUtilizados);
    
    // Desconto efetivo %
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
    // Se tem usina remota, deve ter algum crédito ou valor
    const hasValues = data.credito_remoto_kwh > 0 || data.credito_remoto_compensado_rs > 0;
    setCanProceed(hasValues);
  }, [data.tem_usina_remota, data.credito_remoto_kwh, data.credito_remoto_compensado_rs, setCanProceed]);

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Energia Alocada (kWh)</Label>
              <Input
                type="number"
                value={data.credito_remoto_kwh || ''}
                onChange={(e) => updateData({ credito_remoto_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="Créditos recebidos da usina"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Compensado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.credito_remoto_compensado_rs || ''}
                onChange={(e) => updateData({ credito_remoto_compensado_rs: parseFloat(e.target.value) || 0 })}
                placeholder="Desconto na fatura"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custo da Assinatura (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={data.custo_assinatura_rs || ''}
              onChange={(e) => updateData({ custo_assinatura_rs: parseFloat(e.target.value) || 0 })}
              placeholder="Valor pago ao gerador"
            />
            <p className="text-xs text-muted-foreground">
              Valor mensal pago pela assinatura/locação da usina remota
            </p>
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
