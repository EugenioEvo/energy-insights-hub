import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Activity, AlertTriangle, AlertCircle, Calculator, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TarifaInfo, useTarifaAtual } from '../TarifaInfo';
import { calcularValoresTarifas } from '@/hooks/useTarifas';

export function Step3Demanda() {
  const { data, updateData, setCanProceed } = useWizard();
  const tarifa = useTarifaAtual();

  // Calcular ultrapassagem automaticamente
  useEffect(() => {
    const ultrapassagem = Math.max(0, (data.demanda_medida_kw || 0) - (data.demanda_contratada_kw || 0));
    updateData({ demanda_ultrapassagem_kw: ultrapassagem });
  }, [data.demanda_medida_kw, data.demanda_contratada_kw, updateData]);

  // Calcular valores automáticos baseado nas tarifas
  const valoresCalculados = useMemo(() => {
    if (!tarifa) return null;
    
    return calcularValoresTarifas({
      tarifa,
      consumoPontaKwh: data.consumo_ponta_kwh || 0,
      consumoForaPontaKwh: data.consumo_fora_ponta_kwh || 0,
      consumoReservadoKwh: data.consumo_reservado_kwh || 0,
      consumoTotalKwh: data.consumo_total_kwh || 0,
      demandaContratadaKw: data.demanda_contratada_kw || 0,
      demandaMedidaKw: data.demanda_medida_kw || 0,
      demandaGeracaoKw: data.demanda_geracao_kw || 0,
      demandaUltrapassagemKw: data.demanda_ultrapassagem_kw || 0,
      bandeira: 'verde',
      grupoTarifario: data.grupo_tarifario,
    });
  }, [tarifa, data]);

  // Auto-preencher valores calculados quando tarifas estão disponíveis
  useEffect(() => {
    if (valoresCalculados && tarifa) {
      // Só atualiza se o valor atual for 0 (não sobrescrever valores manuais)
      if (data.valor_demanda_rs === 0 && valoresCalculados.demanda_contratada_rs > 0) {
        updateData({ valor_demanda_rs: valoresCalculados.demanda_contratada_rs });
      }
      if (data.valor_demanda_ultrapassagem_rs === 0 && valoresCalculados.demanda_ultrapassagem_rs > 0) {
        updateData({ valor_demanda_ultrapassagem_rs: valoresCalculados.demanda_ultrapassagem_rs });
      }
    }
  }, [valoresCalculados, tarifa]);

  // Validação - sempre permite prosseguir pois os campos são opcionais
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const hasUltrapassagem = data.demanda_medida_kw > data.demanda_contratada_kw;
  const ultrapassagemPercent = data.demanda_contratada_kw > 0 
    ? ((data.demanda_ultrapassagem_kw / data.demanda_contratada_kw) * 100).toFixed(1)
    : '0';

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-4">
      {/* Info de Tarifas */}
      <TarifaInfo compact />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Passo 3 — Demanda e Penalidades
          </CardTitle>
          <CardDescription>
            Demanda medida, contratada e multas de ultrapassagem — o coração do alerta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="demanda_contratada">Demanda Contratada (kW)</Label>
              <Input 
                id="demanda_contratada"
                type="number"
                step="0.01"
                value={data.demanda_contratada_kw || ''} 
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Do cadastro da UC</p>
              {tarifa && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  Tarifa: {formatCurrency(tarifa.demanda_unica_rs_kw)}/kW
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="demanda_medida">Demanda Medida (kW)</Label>
              <Input 
                id="demanda_medida"
                type="number"
                step="0.01"
                value={data.demanda_medida_kw || ''} 
                onChange={(e) => updateData({ demanda_medida_kw: parseFloat(e.target.value) || 0 })}
                placeholder="245.28"
                className={hasUltrapassagem ? 'border-destructive' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demanda_ultrapassagem">Ultrapassagem (kW)</Label>
              <Input 
                id="demanda_ultrapassagem"
                type="number"
                step="0.01"
                value={data.demanda_ultrapassagem_kw || ''} 
                readOnly
                className={`bg-muted ${hasUltrapassagem ? 'text-destructive font-semibold' : ''}`}
              />
            </div>
          </div>

          {hasUltrapassagem && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>ALERTA CRÍTICO — Ultrapassagem de Demanda</AlertTitle>
              <AlertDescription>
                <p>
                  Demanda medida ({data.demanda_medida_kw.toFixed(2)} kW) ultrapassou a contratada 
                  ({data.demanda_contratada_kw.toFixed(2)} kW) em <strong>{ultrapassagemPercent}%</strong>.
                </p>
                <p className="mt-2 font-medium">
                  Recomendação: Revisar demanda contratada / retrofit / gestão de carga
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="border-t pt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              Valores Financeiros (R$)
              {valoresCalculados && tarifa && (
                <span className="text-xs font-normal flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Calculado automaticamente
                </span>
              )}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor_demanda">Valor Demanda (R$)</Label>
                <Input 
                  id="valor_demanda"
                  type="number"
                  step="0.01"
                  value={data.valor_demanda_rs || ''} 
                  onChange={(e) => updateData({ valor_demanda_rs: parseFloat(e.target.value) || 0 })}
                  placeholder="8458.07"
                />
                {valoresCalculados && tarifa && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Sugerido: {formatCurrency(valoresCalculados.demanda_contratada_rs)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_ultrapassagem">Valor Ultrapassagem (R$)</Label>
                <Input 
                  id="valor_ultrapassagem"
                  type="number"
                  step="0.01"
                  value={data.valor_demanda_ultrapassagem_rs || ''} 
                  onChange={(e) => updateData({ valor_demanda_ultrapassagem_rs: parseFloat(e.target.value) || 0 })}
                  placeholder="4502.14"
                  className={data.valor_demanda_ultrapassagem_rs > 0 ? 'border-destructive' : ''}
                />
                {valoresCalculados && tarifa && data.demanda_ultrapassagem_kw > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Sugerido: {formatCurrency(valoresCalculados.demanda_ultrapassagem_rs)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="demanda_geracao">Demanda Geração (kW)</Label>
                <Input 
                  id="demanda_geracao"
                  type="number"
                  step="0.01"
                  value={data.demanda_geracao_kw || ''} 
                  readOnly
                  className="bg-muted"
                />
                {tarifa && data.demanda_geracao_kw > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Valor: {formatCurrency(valoresCalculados?.demanda_geracao_rs || 0)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {data.valor_demanda_ultrapassagem_rs > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Multa de demanda detectada: {formatCurrency(data.valor_demanda_ultrapassagem_rs)}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/50 rounded-lg p-4">
            <h5 className="font-medium mb-2">Indicadores de Demanda</h5>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Contratada</span>
                <p className="font-semibold">{data.demanda_contratada_kw.toFixed(2)} kW</p>
              </div>
              <div>
                <span className="text-muted-foreground">Medida</span>
                <p className={`font-semibold ${hasUltrapassagem ? 'text-destructive' : ''}`}>
                  {data.demanda_medida_kw.toFixed(2)} kW
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fator de Carga</span>
                <p className="font-semibold">
                  {data.demanda_medida_kw > 0 && data.consumo_total_kwh > 0
                    ? ((data.consumo_total_kwh / (data.demanda_medida_kw * (data.dias_faturados || 30) * 24)) * 100).toFixed(1) + '%'
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Ultrapassagem</span>
                <p className={`font-semibold ${hasUltrapassagem ? 'text-destructive' : 'text-primary'}`}>
                  {hasUltrapassagem ? `${ultrapassagemPercent}%` : 'OK'}
                </p>
              </div>
              {valoresCalculados && (
                <div>
                  <span className="text-muted-foreground">Total Demanda</span>
                  <p className="font-semibold text-primary">
                    {formatCurrency(valoresCalculados.demanda_total_rs)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
