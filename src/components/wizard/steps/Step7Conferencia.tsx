import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWizard, FaturaWizardData } from '../WizardContext';
import { 
  ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp, 
  Zap, Sun, ArrowRightLeft, Wallet, Receipt, Building2, Factory, TrendingDown, Calculator
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { calcularComponentesFatura, validarCruzado, validarIntegridadeDados } from '@/lib/faturaCalculations';
import { calcularBalancoEnergetico, formatarKwh, formatarReais } from '@/lib/energyBalanceCalculations';

type AlertaWizard = { tipo: string; mensagem: string; severidade: 'info' | 'warning' | 'error' };

function calcularAlertas(data: FaturaWizardData): AlertaWizard[] {
  const alertas: AlertaWizard[] = [];

  // Alerta de demanda
  if (data.demanda_medida_kw > data.demanda_contratada_kw) {
    const ultrapassagem = ((data.demanda_medida_kw - data.demanda_contratada_kw) / data.demanda_contratada_kw * 100).toFixed(1);
    alertas.push({
      tipo: 'demanda',
      mensagem: `Ultrapassagem de demanda: ${data.demanda_ultrapassagem_kw?.toFixed(2) || 0} kW (${ultrapassagem}%). Revisar demanda contratada / retrofit / gestão de carga.`,
      severidade: 'error',
    });
  }

  // Alerta de multa demanda
  if (data.valor_demanda_ultrapassagem_rs > 0) {
    alertas.push({
      tipo: 'multa_demanda',
      mensagem: `Multa por ultrapassagem de demanda: R$ ${data.valor_demanda_ultrapassagem_rs.toFixed(2)}`,
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
      mensagem: `${creditosExpirar.toFixed(2)} kWh de créditos SCEE a expirar nos próximos 60 dias.`,
      severidade: 'info',
    });
  }

  // Alerta de consumo não compensado alto
  const creditosRemotosAlocados = data.credito_remoto_kwh || 0;
  const consumoDaRede = data.consumo_total_kwh || 0;
  const consumoNaoCompensado = Math.max(0, consumoDaRede - creditosRemotosAlocados);
  if (consumoNaoCompensado > consumoDaRede * 0.3 && creditosRemotosAlocados > 0) {
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

  const temDemanda = alertas.some(a => a.tipo === 'demanda' || a.tipo === 'multa_demanda');
  const temReativo = alertas.some(a => a.tipo === 'reativo');
  const temCreditos = alertas.some(a => a.tipo === 'creditos');
  const temCompensacao = alertas.some(a => a.tipo === 'compensacao');

  if (temDemanda) {
    recomendacoes.push('Revisar demanda contratada junto à concessionária');
    recomendacoes.push('Avaliar retrofit de equipamentos ou gestão de carga');
  }

  if (temReativo) {
    recomendacoes.push('Verificar necessidade de banco de capacitores');
  }

  if (temCreditos) {
    recomendacoes.push('Otimizar consumo para aproveitar créditos antes do vencimento');
  }

  if (temCompensacao) {
    recomendacoes.push('Avaliar aumento da quota de assinatura de energia');
  }

  return recomendacoes;
}

export function Step7Conferencia() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [integridadeAberto, setIntegridadeAberto] = useState(false);
  
  // Ref para controlar atualizações e evitar loop infinito
  const prevAlertasRef = useRef<string>('');

  // Calcular balanço energético
  const balanco = useMemo(() => calcularBalancoEnergetico(data, isGrupoA), [data, isGrupoA]);

  // Calcular componentes usando função centralizada
  const componentes = useMemo(() => calcularComponentesFatura(data), [data]);
  
  // Validação cruzada
  const validacao = useMemo(() => validarCruzado(data, componentes), [data, componentes]);
  
  // Validação de integridade de dados
  const integridade = useMemo(() => validarIntegridadeDados(data), [data]);

  // === CÁLCULOS FINANCEIROS CONSOLIDADOS ===
  const resumoFinanceiro = useMemo(() => {
    // Fatura Concessionária (valor total da fatura importada)
    const faturaConcessionaria = data.valor_total_pagar || 0;
    
    // Fatura Usina = custo da assinatura (85% do compensado)
    const valorCreditosCompensados = data.credito_remoto_compensado_rs || 0;
    const custoAssinatura = data.custo_assinatura_rs || (valorCreditosCompensados * 0.85);
    
    // Total a pagar = Concessionária + Usina
    const totalAPagar = faturaConcessionaria + custoAssinatura;
    
    // === ECONOMIA ===
    // Economia do autoconsumo = valor que evitou pagar (100% da tarifa)
    const economiaAutoconsumo = data.autoconsumo_rs || 0;
    
    // Economia dos créditos remotos = 15% de desconto sobre o compensado
    const economiaCreditos = valorCreditosCompensados * 0.15;
    
    // Economia total do mês
    const economiaTotal = economiaAutoconsumo + economiaCreditos;

    // Consumo não compensado (kWh)
    const consumoNaoCompensado = balanco.consumoNaoCompensado;

    return {
      faturaConcessionaria,
      custoAssinatura,
      totalAPagar,
      economiaAutoconsumo,
      economiaCreditos,
      economiaTotal,
      consumoNaoCompensado,
      valorCreditosCompensados,
    };
  }, [data, balanco]);

  // Gerar alertas e recomendações
  const alertasOperacionais = useMemo(() => calcularAlertas(data), [data]);
  const recomendacoes = useMemo(() => calcularRecomendacoes(alertasOperacionais), [alertasOperacionais]);

  // Combinar alertas de validação com alertas operacionais
  const todosAlertas = useMemo(() => {
    const alertasValidacaoConvertidos: AlertaWizard[] = validacao.alertasValidacao.map(a => ({
      tipo: a.campo.toLowerCase(),
      mensagem: a.mensagem,
      severidade: a.severidade,
    }));
    return [...alertasValidacaoConvertidos, ...alertasOperacionais];
  }, [validacao.alertasValidacao, alertasOperacionais]);

  // Atualizar dados com alertas e recomendações - com proteção contra loop infinito
  useEffect(() => {
    const alertasJson = JSON.stringify(todosAlertas);
    const recsJson = JSON.stringify(recomendacoes);
    const currentHash = `${alertasJson}|${recsJson}`;
    
    // Só atualiza se houver mudança real
    if (prevAlertasRef.current !== currentHash) {
      prevAlertasRef.current = currentHash;
      updateData({ alertas: todosAlertas, recomendacoes });
    }
  }, [todosAlertas, recomendacoes, updateData]);

  // Validação - bloquear se diferença > 0.5% ou integridade inválida
  useEffect(() => {
    setCanProceed(validacao.isValid && integridade.isValid);
  }, [validacao.isValid, integridade.isValid, setCanProceed]);

  const temAlertasCriticos = todosAlertas.some(a => a.severidade === 'error');
  
  // Calcular saldo total de créditos
  const saldoTotalCreditos = (data.scee_saldo_kwh_p || 0) + 
                              (data.scee_saldo_kwh_fp || 0) + 
                              (data.scee_saldo_kwh_hr || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Passo 7 — Conferência e Fechamento
        </CardTitle>
        <CardDescription>
          Resumo financeiro consolidado e verificação final
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
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

            {/* Fatura Usina */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Factory className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">Fatura Usina (Assinatura)</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créditos compensados:</span>
                  <span>{formatarKwh(data.credito_remoto_kwh || 0)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor compensado:</span>
                  <span>{formatarReais(resumoFinanceiro.valorCreditosCompensados)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="text-muted-foreground">Desconto (15%):</span>
                  <span>- {formatarReais(resumoFinanceiro.economiaCreditos)}</span>
                </div>
                <Separator className="bg-green-200 dark:bg-green-800" />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total a pagar:</span>
                  <span className="text-xl font-bold text-green-700 dark:text-green-300">
                    {formatarReais(resumoFinanceiro.custoAssinatura)}
                  </span>
                </div>
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
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-emerald-800 dark:text-emerald-200">Economia do Mês</span>
            </div>
            <div className="space-y-2 text-sm">
              {resumoFinanceiro.economiaAutoconsumo > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Autoconsumo simultâneo:</span>
                  <span className="text-emerald-600 font-medium">
                    + {formatarReais(resumoFinanceiro.economiaAutoconsumo)}
                  </span>
                </div>
              )}
              {resumoFinanceiro.economiaCreditos > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Desconto assinatura (15%):</span>
                  <span className="text-emerald-600 font-medium">
                    + {formatarReais(resumoFinanceiro.economiaCreditos)}
                  </span>
                </div>
              )}
              <Separator className="bg-emerald-200 dark:bg-emerald-800" />
              <div className="flex justify-between items-center">
                <span className="font-bold">ECONOMIA TOTAL:</span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatarReais(resumoFinanceiro.economiaTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Resumo Energético */}
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
                <span className="text-xs text-muted-foreground">Créditos Alocados</span>
              </div>
              <p className="text-lg font-bold text-blue-600">{formatarKwh(balanco.creditosRemotosAlocados)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Saldo Créditos</span>
              </div>
              <p className="text-lg font-bold text-primary">{formatarKwh(saldoTotalCreditos)}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Validações de Integridade */}
        {integridade.checks.length > 0 && (
          <>
            <div>
              <Collapsible open={integridadeAberto} onOpenChange={setIntegridadeAberto}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Validações de Integridade ({integridade.checks.length})
                      </span>
                      {!integridade.isValid && (
                        <Badge variant="destructive" className="text-xs">Erros</Badge>
                      )}
                    </span>
                    {integridadeAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="space-y-2">
                    {integridade.checks.map((check, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <span className="text-sm font-medium">{check.nome}</span>
                          <p className="text-xs text-muted-foreground">{check.mensagem}</p>
                        </div>
                        <Badge 
                          variant={
                            check.status === 'ok' ? 'default' : 
                            check.status === 'warning' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {check.status === 'ok' ? '✓ OK' : `Δ ${check.diferenca.toFixed(1)}`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <Separator />
          </>
        )}

        {/* Conferência de Valores */}
        <Collapsible open={detalhesAberto} onOpenChange={setDetalhesAberto}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Detalhamento da Fatura ({validacao.componentesPreenchidos}/7 itens)
                </span>
                {!validacao.isValid && componentes.totalGeral > 0 && (
                  <Badge variant="destructive" className="text-xs">Diferença</Badge>
                )}
              </span>
              {detalhesAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span>Valor Total Informado:</span>
                <span className="font-bold text-lg">{formatarReais(data.valor_total_pagar)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Soma dos Componentes:</span>
                <span className="font-bold text-lg">{formatarReais(componentes.totalGeral)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span>Diferença:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${validacao.isValid ? 'text-primary' : 'text-destructive'}`}>
                    {formatarReais(validacao.diferencaAbsoluta)} ({validacao.percentualDiferenca.toFixed(2)}%)
                  </span>
                  {componentes.totalGeral === 0 ? (
                    <Info className="h-5 w-5 text-muted-foreground" />
                  ) : validacao.isValid ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Detalhamento por categoria */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Bandeiras (TE):</span>
                  <span>{formatarReais(componentes.bandeiras.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TUSD (Não Compensado):</span>
                  <span>{formatarReais(componentes.tusd.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TE (Não Compensado):</span>
                  <span>{formatarReais(componentes.te.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SCEE (Compensação):</span>
                  <span>{formatarReais(componentes.scee.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Demanda:</span>
                  <span>{formatarReais(componentes.demanda.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outros (UFER + CIP):</span>
                  <span>{formatarReais(componentes.outros.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tributos (PIS/COFINS/ICMS):</span>
                  <span>{formatarReais(componentes.tributos.total)}</span>
                </div>
              </div>
            </div>
            
            {!validacao.isValid && componentes.totalGeral > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Diferença acima de 0.5%</AlertTitle>
                <AlertDescription>
                  Revise os valores ou forneça uma justificativa.
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Alertas Gerados */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Alertas Gerados ({todosAlertas.length})
          </h4>
          
          {todosAlertas.length === 0 ? (
            <div className="bg-primary/10 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-primary font-medium">Nenhum alerta identificado</span>
            </div>
          ) : (
            <div className="space-y-3">
              {todosAlertas.map((alerta, index) => (
                <Alert 
                  key={index} 
                  variant={alerta.severidade === 'error' ? 'destructive' : 'default'}
                >
                  {alerta.severidade === 'error' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : alerta.severidade === 'warning' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                  <AlertDescription className="flex items-start gap-2">
                    <Badge variant={
                      alerta.severidade === 'error' ? 'destructive' : 
                      alerta.severidade === 'warning' ? 'secondary' : 'outline'
                    }>
                      {alerta.tipo.toUpperCase()}
                    </Badge>
                    <span>{alerta.mensagem}</span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </div>

        {/* Recomendações */}
        {recomendacoes.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Recomendações
              </h4>
              <ul className="space-y-2">
                {recomendacoes.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Status Final */}
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status Final:</span>
            <Badge 
              variant={temAlertasCriticos || !integridade.isValid ? 'destructive' : 'default'}
              className="text-sm"
            >
              {temAlertasCriticos || !integridade.isValid ? 'CRÍTICO' : todosAlertas.length > 0 ? 'ATENÇÃO' : 'OK'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
