import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWizard, FaturaWizardData } from '../WizardContext';
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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

  // Calcular soma dos componentes
  const somaComponentes = useMemo(() => {
    return (
      (data.bandeira_te_p_rs || 0) +
      (data.bandeira_te_fp_rs || 0) +
      (data.bandeira_te_hr_rs || 0) +
      (data.nao_compensado_tusd_p_rs || 0) +
      (data.nao_compensado_tusd_fp_rs || 0) +
      (data.nao_compensado_tusd_hr_rs || 0) +
      (data.nao_compensado_te_p_rs || 0) +
      (data.nao_compensado_te_fp_rs || 0) +
      (data.nao_compensado_te_hr_rs || 0) +
      (data.scee_consumo_fp_tusd_rs || 0) +
      (data.scee_parcela_te_fp_rs || 0) +
      (data.scee_injecao_fp_te_rs || 0) +
      (data.scee_injecao_fp_tusd_rs || 0) +
      (data.valor_demanda_rs || 0) +
      (data.valor_demanda_ultrapassagem_rs || 0) +
      (data.ufer_fp_rs || 0) +
      (data.cip_rs || 0) +
      (data.pis_rs || 0) +
      (data.cofins_rs || 0) +
      (data.icms_rs || 0)
    );
  }, [data]);

  const diferenca = Math.abs(somaComponentes - data.valor_total_pagar);
  const percentDiferenca = data.valor_total_pagar > 0 
    ? (diferenca / data.valor_total_pagar) * 100 
    : 0;
  const diferencaOk = percentDiferenca <= 0.5;

  // Gerar alertas e recomendações
  const alertas = useMemo(() => calcularAlertas(data), [data]);
  const recomendacoes = useMemo(() => calcularRecomendacoes(alertas), [alertas]);

  // Atualizar dados com alertas e recomendações
  useEffect(() => {
    updateData({ alertas, recomendacoes });
  }, [alertas, recomendacoes, updateData]);

  // Validação - bloquear se diferença > 0.5%
  useEffect(() => {
    setCanProceed(diferencaOk || somaComponentes === 0);
  }, [diferencaOk, somaComponentes, setCanProceed]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const temAlertasCriticos = alertas.some(a => a.severidade === 'error');

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
              <span className="font-bold text-lg">{formatCurrency(somaComponentes)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span>Diferença:</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${diferencaOk ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(diferenca)} ({percentDiferenca.toFixed(2)}%)
                </span>
                {somaComponentes === 0 ? (
                  <Info className="h-5 w-5 text-muted-foreground" />
                ) : diferencaOk ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
            </div>
          </div>
          
          {!diferencaOk && somaComponentes > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Diferença acima de 0.5%</AlertTitle>
              <AlertDescription>
                A diferença entre o valor total e a soma dos componentes está acima do limite permitido.
                Revise os valores ou forneça uma justificativa.
              </AlertDescription>
            </Alert>
          )}

          {somaComponentes === 0 && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nenhum componente de fatura foi lançado. A verificação será ignorada.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Alertas Gerados */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Alertas Gerados ({alertas.length})
          </h4>
          
          {alertas.length === 0 ? (
            <div className="bg-primary/10 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-primary font-medium">Nenhum alerta identificado</span>
            </div>
          ) : (
            <div className="space-y-3">
              {alertas.map((alerta, index) => (
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
              {temAlertasCriticos ? 'CRÍTICO' : alertas.length > 0 ? 'ATENÇÃO' : 'OK'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
