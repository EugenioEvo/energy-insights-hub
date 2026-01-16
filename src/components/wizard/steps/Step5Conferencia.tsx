/**
 * PASSO 5 — CONFERÊNCIA E FECHAMENTO
 * Exibe cálculos automáticos, balanço energético e alertas
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWizard, FaturaWizardData } from '../WizardContext';
import { 
  ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp, 
  Zap, Sun, ArrowRightLeft, Wallet, Receipt, Building2, Factory, TrendingDown, Calculator, Shield, Loader2
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { calcularBalancoEnergetico, formatarKwh, formatarReais } from '@/lib/energyBalanceCalculations';

type AlertaWizard = { tipo: string; mensagem: string; severidade: 'info' | 'warning' | 'error' };

function calcularAlertas(data: FaturaWizardData, consumoNaoCompensado: number): AlertaWizard[] {
  const alertas: AlertaWizard[] = [];

  // Alerta de demanda
  if (data.demanda_medida_kw > data.demanda_contratada_kw && data.demanda_contratada_kw > 0) {
    const ultrapassagem = ((data.demanda_medida_kw - data.demanda_contratada_kw) / data.demanda_contratada_kw * 100).toFixed(1);
    alertas.push({
      tipo: 'demanda',
      mensagem: `Ultrapassagem de demanda: ${data.demanda_ultrapassagem_kw?.toFixed(2) || 0} kW (${ultrapassagem}%). Revisar demanda contratada.`,
      severidade: 'error',
    });
  }

  // Alerta de reativo
  if (data.ufer_fp_rs > 0) {
    alertas.push({
      tipo: 'reativo',
      mensagem: `UFER (Energia Reativa): R$ ${data.ufer_fp_rs.toFixed(2)}. Verificar correção de fator de potência.`,
      severidade: 'warning',
    });
  }

  // Alerta de créditos a expirar
  const creditosExpirar = (data.scee_saldo_expirar_30d_kwh || 0) + (data.scee_saldo_expirar_60d_kwh || 0);
  if (creditosExpirar > 0) {
    alertas.push({
      tipo: 'creditos',
      mensagem: `${creditosExpirar.toFixed(0)} kWh de créditos a expirar nos próximos 60 dias.`,
      severidade: 'info',
    });
  }

  // Alerta de consumo não compensado alto
  const consumoDaRede = data.consumo_total_kwh || 0;
  if (consumoNaoCompensado > consumoDaRede * 0.3 && consumoDaRede > 0) {
    alertas.push({
      tipo: 'compensacao',
      mensagem: `${formatarKwh(consumoNaoCompensado)} kWh (${((consumoNaoCompensado / consumoDaRede) * 100).toFixed(0)}%) não compensado. Considerar aumentar assinatura.`,
      severidade: 'warning',
    });
  }

  return alertas;
}

function calcularRecomendacoes(alertas: AlertaWizard[]): string[] {
  const recomendacoes: string[] = [];

  if (alertas.some(a => a.tipo === 'demanda')) {
    recomendacoes.push('Revisar demanda contratada junto à concessionária');
  }
  if (alertas.some(a => a.tipo === 'reativo')) {
    recomendacoes.push('Verificar necessidade de banco de capacitores');
  }
  if (alertas.some(a => a.tipo === 'creditos')) {
    recomendacoes.push('Otimizar consumo para aproveitar créditos antes do vencimento');
  }
  if (alertas.some(a => a.tipo === 'compensacao')) {
    recomendacoes.push('Avaliar aumento da quota de assinatura de energia');
  }

  return recomendacoes;
}

export function Step5Conferencia() {
  const { data, updateData, setCanProceed, isGrupoA, calculosAuto, tarifa, tarifaLoading } = useWizard();
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  
  const prevAlertasRef = useRef<string>('');

  // Calcular balanço energético
  const balanco = useMemo(() => calcularBalancoEnergetico(data, isGrupoA), [data, isGrupoA]);

  // Usar calculosAuto do contexto
  const calculos = calculosAuto;

  // Resumo financeiro consolidado (mesma lógica do Step4)
  const resumoFinanceiro = useMemo(() => {
    // Autoconsumo (geração local) - 100% é economia do cliente
    const autoconsumoRs = data.autoconsumo_rs || data.energia_simultanea_rs || 0;
    
    // Créditos remotos (assinatura usina)
    const creditoRemotoRs = data.credito_remoto_compensado_rs || 0;
    
    // Total compensado = autoconsumo + créditos remotos
    const totalCompensado = autoconsumoRs + creditoRemotoRs;
    
    // Custo assinatura = 85% APENAS dos créditos remotos (não inclui autoconsumo)
    const custoAssinatura = data.tem_usina_remota ? creditoRemotoRs * 0.85 : 0;
    
    // Economia líquida = 100% autoconsumo + 15% dos créditos remotos
    const economiaLiquida = autoconsumoRs + (data.tem_usina_remota ? creditoRemotoRs * 0.15 : creditoRemotoRs);
    
    // Fatura concessionária (valor informado ou calculado)
    const faturaConcessionaria = data.valor_total_pagar || 0;
    
    // Total a pagar = fatura + custo assinatura
    const totalAPagar = faturaConcessionaria + custoAssinatura;

    return {
      autoconsumoRs,
      creditoRemotoRs,
      totalCompensado,
      custoAssinatura,
      economiaLiquida,
      faturaConcessionaria,
      totalAPagar,
      consumoNaoCompensado: balanco.consumoNaoCompensado,
      creditoRemotoKwh: data.credito_remoto_kwh || 0,
    };
  }, [data, balanco]);

  // Gerar alertas e recomendações
  const alertasOperacionais = useMemo(() => 
    calcularAlertas(data, balanco.consumoNaoCompensado), 
    [data, balanco.consumoNaoCompensado]
  );
  const recomendacoes = useMemo(() => calcularRecomendacoes(alertasOperacionais), [alertasOperacionais]);

  // Atualizar dados com alertas e recomendações
  useEffect(() => {
    const alertasJson = JSON.stringify(alertasOperacionais);
    const recsJson = JSON.stringify(recomendacoes);
    const currentHash = `${alertasJson}|${recsJson}`;
    
    if (prevAlertasRef.current !== currentHash) {
      prevAlertasRef.current = currentHash;
      updateData({ alertas: alertasOperacionais, recomendacoes });
    }
  }, [alertasOperacionais, recomendacoes, updateData]);

  // Validação - sempre pode prosseguir na conferência
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const saldoTotalCreditos = (data.scee_saldo_kwh_p || 0) + 
                              (data.scee_saldo_kwh_fp || 0) + 
                              (data.scee_saldo_kwh_hr || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Passo 5 — Conferência e Fechamento
        </CardTitle>
        <CardDescription>
          Resumo financeiro consolidado e verificação final
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Status da Tarifa */}
        {tarifaLoading ? (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Carregando tarifas...</AlertDescription>
          </Alert>
        ) : !tarifa ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Tarifa não encontrada para {data.concessionaria} - {data.grupo_tarifario} - {data.modalidade}. 
              Os cálculos automáticos não estarão disponíveis.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Classificação GD */}
        {calculos && (
          <Alert className={calculos.classificacaoGD === 'gd1' 
            ? "bg-green-50 border-green-300 dark:bg-green-950/30"
            : "bg-amber-50 border-amber-300 dark:bg-amber-950/30"
          }>
            <Shield className={`h-4 w-4 ${calculos.classificacaoGD === 'gd1' ? 'text-green-600' : 'text-amber-600'}`} />
            <AlertDescription>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <strong>{calculos.classificacaoGD.toUpperCase()}</strong> — Ano {calculos.anoRef}
                </div>
                <div className="text-sm">
                  {calculos.classificacaoGD === 'gd1'
                    ? 'Compensação integral (TE + TUSD + Encargos)'
                    : `Fio B não compensável: ${calculos.percentualFioB}%`}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* === RESUMO FINANCEIRO CONSOLIDADO === */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Resumo Financeiro Consolidado
          </h4>
          
          {/* Cards das Duas Faturas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fatura Concessionária */}
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800 dark:text-orange-200">Fatura Concessionária</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consumo não compensado:</span>
                  <span>{formatarKwh(resumoFinanceiro.consumoNaoCompensado)} kWh</span>
                </div>
                <Separator className="bg-orange-200 dark:bg-orange-800" />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total a pagar:</span>
                  <span className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    {formatarReais(resumoFinanceiro.faturaConcessionaria)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fatura Usina / Resumo Compensação */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Factory className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">Compensação (Cost Avoidance)</span>
              </div>
              <div className="space-y-2 text-sm">
                {data.tem_geracao_local && resumoFinanceiro.autoconsumoRs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Geração Simultânea:</span>
                    <span className="font-medium">{formatarReais(resumoFinanceiro.autoconsumoRs)}</span>
                  </div>
                )}
                {data.tem_usina_remota && resumoFinanceiro.creditoRemotoRs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Créditos Alocados ({formatarKwh(resumoFinanceiro.creditoRemotoKwh)}):</span>
                    <span className="font-medium">{formatarReais(resumoFinanceiro.creditoRemotoRs)}</span>
                  </div>
                )}
                <Separator className="bg-green-200 dark:bg-green-800" />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Compensado:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatarReais(resumoFinanceiro.totalCompensado)}
                  </span>
                </div>
                {data.tem_usina_remota && resumoFinanceiro.custoAssinatura > 0 && (
                  <>
                    <div className="flex justify-between text-amber-600">
                      <span className="text-muted-foreground">Custo Assinatura (85%):</span>
                      <span className="font-medium">- {formatarReais(resumoFinanceiro.custoAssinatura)}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-semibold">Economia Líquida (15%):</span>
                      <span className="font-bold">{formatarReais(resumoFinanceiro.economiaLiquida)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Total Consolidado */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="font-medium">TOTAL A PAGAR NO MÊS</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {formatarReais(resumoFinanceiro.totalAPagar)}
              </span>
            </div>
          </div>

          {/* Economia */}
          {resumoFinanceiro.economiaLiquida > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-800 dark:text-emerald-200">Economia do Mês</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Compensado:</span>
                  <span className="text-emerald-600 font-medium">
                    {formatarReais(resumoFinanceiro.totalCompensado)}
                  </span>
                </div>
                {data.tem_usina_remota && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(-) Custo Assinatura (85%):</span>
                    <span className="text-amber-600 font-medium">
                      - {formatarReais(resumoFinanceiro.custoAssinatura)}
                    </span>
                  </div>
                )}
                <Separator className="bg-emerald-200 dark:bg-emerald-800" />
                <div className="flex justify-between items-center">
                  <span className="font-bold">ECONOMIA LÍQUIDA:</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatarReais(resumoFinanceiro.economiaLiquida)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Balanço Energético */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Balanço Energético (kWh)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Consumo Rede</span>
              </div>
              <p className="text-lg font-bold">{formatarKwh(balanco.consumoDaRede)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Sun className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-muted-foreground">Autoconsumo</span>
              </div>
              <p className="text-lg font-bold text-yellow-600">{formatarKwh(balanco.autoconsumoSimultaneo)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Total Créditos</span>
              </div>
              <p className="text-lg font-bold text-blue-600">{formatarKwh(balanco.totalCreditos)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Não Compensado</span>
              </div>
              <p className={`text-lg font-bold ${balanco.consumoNaoCompensado > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatarKwh(balanco.consumoNaoCompensado)}
              </p>
            </div>
          </div>
        </div>

        {/* Detalhes dos Cálculos Automáticos */}
        {calculos && (
          <>
            <Separator />
            <Collapsible open={detalhesAberto} onOpenChange={setDetalhesAberto}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    <span className="text-sm font-medium">Detalhes dos Cálculos Automáticos</span>
                  </span>
                  {detalhesAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground text-xs">Bandeiras</span>
                    <p className="font-semibold">{formatarReais(calculos.totalBandeiras)}</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground text-xs">TUSD</span>
                    <p className="font-semibold">{formatarReais(calculos.totalTUSD)}</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground text-xs">TE</span>
                    <p className="font-semibold">{formatarReais(calculos.totalTE)}</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground text-xs">SCEE</span>
                    <p className="font-semibold">{formatarReais(calculos.totalSCEE)}</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground text-xs">Demanda</span>
                    <p className="font-semibold">{formatarReais(calculos.totalDemanda)}</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground text-xs">PIS</span>
                    <p className="font-semibold">{formatarReais(calculos.pis_rs)}</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground text-xs">COFINS</span>
                    <p className="font-semibold">{formatarReais(calculos.cofins_rs)}</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground text-xs">ICMS</span>
                    <p className="font-semibold">{formatarReais(calculos.icms_rs)}</p>
                  </div>
                </div>
                
                {/* Não compensáveis GD2 */}
                {calculos.classificacaoGD === 'gd2' && (calculos.encargosNaoCompensados > 0 || calculos.fioBNaoCompensado > 0) && (
                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Valores NÃO Compensáveis (Lei 14.300)</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {calculos.encargosNaoCompensados > 0 && (
                          <div>
                            <span className="text-xs">Encargos:</span>
                            <p className="font-semibold">{formatarReais(calculos.encargosNaoCompensados)}</p>
                          </div>
                        )}
                        {calculos.fioBNaoCompensado > 0 && (
                          <div>
                            <span className="text-xs">Fio B ({calculos.percentualFioB}%):</span>
                            <p className="font-semibold">{formatarReais(calculos.fioBNaoCompensado)}</p>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Valor Calculado da Fatura:</span>
                    <span className="text-xl font-bold text-primary">{formatarReais(calculos.valorFaturaCalculado)}</span>
                  </div>
                  {data.valor_total_pagar > 0 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Valor Informado: {formatarReais(data.valor_total_pagar)} 
                      {Math.abs(calculos.valorFaturaCalculado - data.valor_total_pagar) > 0.5 && (
                        <Badge variant="secondary" className="ml-2">
                          Δ {formatarReais(Math.abs(calculos.valorFaturaCalculado - data.valor_total_pagar))}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Alertas */}
        {alertasOperacionais.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Alertas Operacionais
              </h4>
              {alertasOperacionais.map((alerta, idx) => (
                <Alert 
                  key={idx}
                  variant={alerta.severidade === 'error' ? 'destructive' : 'default'}
                  className={alerta.severidade === 'warning' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''}
                >
                  {alerta.severidade === 'error' ? (
                    <XCircle className="h-4 w-4" />
                  ) : alerta.severidade === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                  <AlertDescription>{alerta.mensagem}</AlertDescription>
                </Alert>
              ))}
            </div>
          </>
        )}

        {/* Recomendações */}
        {recomendacoes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Recomendações
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {recomendacoes.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Status Final */}
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-green-800 dark:text-green-200 font-medium">
            Dados conferidos — Pronto para fechar o mês
          </span>
        </div>

      </CardContent>
    </Card>
  );
}

// Alias para compatibilidade com Step7Conferencia
export { Step5Conferencia as Step7Conferencia };
