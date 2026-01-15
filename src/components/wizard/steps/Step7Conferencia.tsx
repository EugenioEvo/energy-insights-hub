import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWizard, FaturaWizardData } from '../WizardContext';
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { calcularComponentesFatura, validarCruzado, ComponentesFatura, ValidacaoCruzada } from '@/lib/faturaCalculations';

type AlertaWizard = { tipo: string; mensagem: string; severidade: 'info' | 'warning' | 'error' };

function calcularAlertas(data: FaturaWizardData): AlertaWizard[] {
  const alertas: AlertaWizard[] = [];

  // Alerta de demanda
  if (data.demanda_medida_kw > data.demanda_contratada_kw) {
    const ultrapassagem = ((data.demanda_medida_kw - data.demanda_contratada_kw) / data.demanda_contratada_kw * 100).toFixed(1);
    alertas.push({
      tipo: 'demanda',
      mensagem: `Ultrapassagem de demanda: ${data.demanda_ultrapassagem_kw.toFixed(2)} kW (${ultrapassagem}%). Revisar demanda contratada / retrofit / gestão de carga.`,
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

  return alertas;
}

function calcularRecomendacoes(alertas: AlertaWizard[]): string[] {
  const recomendacoes: string[] = [];

  const temDemanda = alertas.some(a => a.tipo === 'demanda' || a.tipo === 'multa_demanda');
  const temReativo = alertas.some(a => a.tipo === 'reativo');
  const temCreditos = alertas.some(a => a.tipo === 'creditos');

  if (temDemanda) {
    recomendacoes.push('Revisar demanda contratada junto à concessionária');
    recomendacoes.push('Avaliar retrofit de equipamentos ou gestão de carga');
    recomendacoes.push('Implementar sistema de monitoramento de demanda em tempo real');
  }

  if (temReativo) {
    recomendacoes.push('Verificar necessidade de banco de capacitores');
    recomendacoes.push('Avaliar correção de fator de potência');
  }

  if (temCreditos) {
    recomendacoes.push('Otimizar consumo para aproveitar créditos antes do vencimento');
    recomendacoes.push('Avaliar transferência de créditos para outras UCs do grupo');
  }

  return recomendacoes;
}

export function Step7Conferencia() {
  const { data, updateData, setCanProceed } = useWizard();
  const [detalhesAberto, setDetalhesAberto] = useState(false);

  // Calcular componentes usando função centralizada
  const componentes = useMemo(() => calcularComponentesFatura(data), [data]);
  
  // Validação cruzada
  const validacao = useMemo(() => validarCruzado(data, componentes), [data, componentes]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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

  // Atualizar dados com alertas e recomendações
  useEffect(() => {
    updateData({ alertas: todosAlertas, recomendacoes });
  }, [todosAlertas, recomendacoes, updateData]);

  // Validação - bloquear se diferença > 0.5%
  useEffect(() => {
    setCanProceed(validacao.isValid);
  }, [validacao.isValid, setCanProceed]);

  const temAlertasCriticos = todosAlertas.some(a => a.severidade === 'error');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Passo 7 — Conferência e Fechamento
        </CardTitle>
        <CardDescription>
          Verificação final dos dados antes de salvar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Conferência de Valores */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            7A) Checagem de Valores
          </h4>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span>Valor Total Informado:</span>
              <span className="font-bold text-lg">{formatCurrency(data.valor_total_pagar)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Soma dos Componentes:</span>
              <span className="font-bold text-lg">{formatCurrency(componentes.totalGeral)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span>Diferença:</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${validacao.isValid ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(validacao.diferencaAbsoluta)} ({validacao.percentualDiferenca.toFixed(2)}%)
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
          </div>

          {/* Detalhamento dos Componentes */}
          <Collapsible open={detalhesAberto} onOpenChange={setDetalhesAberto} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
                <span>Detalhamento por Categoria ({validacao.componentesPreenchidos}/7 preenchidos)</span>
                {detalhesAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="bg-muted/30 rounded-lg p-4 space-y-4 text-sm">
                {/* Bandeiras */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Bandeiras (TE)</span>
                    {componentes.bandeiras.total === 0 && (
                      <Badge variant="outline" className="text-xs">vazio</Badge>
                    )}
                  </div>
                  <span className={componentes.bandeiras.total > 0 ? 'font-medium' : 'text-muted-foreground'}>
                    {formatCurrency(componentes.bandeiras.total)}
                  </span>
                </div>

                {/* TUSD */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">TUSD (Não Compensado)</span>
                    {componentes.tusd.total === 0 && (
                      <Badge variant="outline" className="text-xs">vazio</Badge>
                    )}
                  </div>
                  <span className={componentes.tusd.total > 0 ? 'font-medium' : 'text-muted-foreground'}>
                    {formatCurrency(componentes.tusd.total)}
                  </span>
                </div>

                {/* TE */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">TE (Não Compensado)</span>
                    {componentes.te.total === 0 && (
                      <Badge variant="outline" className="text-xs">vazio</Badge>
                    )}
                  </div>
                  <span className={componentes.te.total > 0 ? 'font-medium' : 'text-muted-foreground'}>
                    {formatCurrency(componentes.te.total)}
                  </span>
                </div>

                {/* SCEE */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">SCEE (Compensação)</span>
                    {componentes.scee.total === 0 && (
                      <Badge variant="outline" className="text-xs">vazio</Badge>
                    )}
                  </div>
                  <span className={componentes.scee.total > 0 ? 'font-medium' : 'text-muted-foreground'}>
                    {formatCurrency(componentes.scee.total)}
                  </span>
                </div>

                {/* Demanda */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Demanda</span>
                    {componentes.demanda.total === 0 && (
                      <Badge variant="outline" className="text-xs">vazio</Badge>
                    )}
                  </div>
                  <span className={componentes.demanda.total > 0 ? 'font-medium' : 'text-muted-foreground'}>
                    {formatCurrency(componentes.demanda.total)}
                  </span>
                </div>

                {/* Outros */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Outros (UFER + CIP)</span>
                    {componentes.outros.total === 0 && (
                      <Badge variant="outline" className="text-xs">vazio</Badge>
                    )}
                  </div>
                  <span className={componentes.outros.total > 0 ? 'font-medium' : 'text-muted-foreground'}>
                    {formatCurrency(componentes.outros.total)}
                  </span>
                </div>

                {/* Tributos */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tributos (PIS/COFINS/ICMS)</span>
                    {componentes.tributos.total === 0 && (
                      <Badge variant="outline" className="text-xs">vazio</Badge>
                    )}
                  </div>
                  <span className={componentes.tributos.total > 0 ? 'font-medium' : 'text-muted-foreground'}>
                    {formatCurrency(componentes.tributos.total)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(componentes.totalGeral)}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          {!validacao.isValid && componentes.totalGeral > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Diferença acima de 0.5%</AlertTitle>
              <AlertDescription>
                A diferença entre o valor total e a soma dos componentes está acima do limite permitido.
                Revise os valores ou forneça uma justificativa.
              </AlertDescription>
            </Alert>
          )}

          {componentes.totalGeral === 0 && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nenhum componente de fatura foi lançado. A verificação será ignorada.
              </AlertDescription>
            </Alert>
          )}

          {validacao.componentesVazios.length > 0 && componentes.totalGeral > 0 && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Componentes não preenchidos: {validacao.componentesVazios.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </div>

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
              variant={temAlertasCriticos ? 'destructive' : 'default'}
              className="text-sm"
            >
              {temAlertasCriticos ? 'CRÍTICO' : todosAlertas.length > 0 ? 'ATENÇÃO' : 'OK'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}