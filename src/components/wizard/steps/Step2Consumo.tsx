import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Zap, AlertCircle, CheckCircle2, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TarifaInfo, useTarifaAtual } from '../TarifaInfo';
import { calcularValoresTarifas } from '@/hooks/useTarifas';

export function Step2Consumo() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();
  const tarifa = useTarifaAtual();

  // Calcular total automaticamente
  useEffect(() => {
    const total = 
      (data.consumo_ponta_kwh || 0) + 
      (data.consumo_fora_ponta_kwh || 0) + 
      (data.consumo_reservado_kwh || 0);
    updateData({ consumo_total_kwh: total });
  }, [data.consumo_ponta_kwh, data.consumo_fora_ponta_kwh, data.consumo_reservado_kwh, updateData]);

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
      bandeira: 'verde', // Default, será ajustado no step de tributos
      grupoTarifario: data.grupo_tarifario,
    });
  }, [tarifa, data]);

  // Validação
  useEffect(() => {
    const isValid = 
      data.consumo_ponta_kwh >= 0 &&
      data.consumo_fora_ponta_kwh >= 0 &&
      data.consumo_reservado_kwh >= 0 &&
      data.consumo_total_kwh > 0;
    setCanProceed(isValid);
  }, [data.consumo_ponta_kwh, data.consumo_fora_ponta_kwh, data.consumo_reservado_kwh, data.consumo_total_kwh, setCanProceed]);

  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
            <Zap className="h-5 w-5" />
            Passo 2 — Consumo Faturado
          </CardTitle>
          <CardDescription>
            Energia ativa por posto tarifário (kWh Ponta / Fora Ponta / Reservado)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="consumo_ponta">Consumo Ponta (kWh)</Label>
              <Input 
                id="consumo_ponta"
                type="number"
                step="0.01"
                value={data.consumo_ponta_kwh || ''} 
                onChange={(e) => updateData({ consumo_ponta_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="6131.68"
              />
              {valoresCalculados && tarifa && isGrupoA && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  TE: {formatCurrency(valoresCalculados.te_ponta_rs)} | TUSD: {formatCurrency(valoresCalculados.tusd_ponta_rs)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="consumo_fp">Consumo Fora Ponta (kWh)</Label>
              <Input 
                id="consumo_fp"
                type="number"
                step="0.01"
                value={data.consumo_fora_ponta_kwh || ''} 
                onChange={(e) => updateData({ consumo_fora_ponta_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="21409.50"
              />
              {valoresCalculados && tarifa && isGrupoA && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  TE: {formatCurrency(valoresCalculados.te_fora_ponta_rs)} | TUSD: {formatCurrency(valoresCalculados.tusd_fora_ponta_rs)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="consumo_hr">Consumo Reservado (kWh)</Label>
              <Input 
                id="consumo_hr"
                type="number"
                step="0.01"
                value={data.consumo_reservado_kwh || ''} 
                onChange={(e) => updateData({ consumo_reservado_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="892.50"
              />
              {valoresCalculados && tarifa && isGrupoA && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  TE: {formatCurrency(valoresCalculados.te_reservado_rs)} | TUSD: {formatCurrency(valoresCalculados.tusd_reservado_rs)}
                </p>
              )}
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Consumo Total Calculado</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {formatNumber(data.consumo_total_kwh)} kWh
              </span>
            </div>
            
            {valoresCalculados && tarifa && (
              <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">TE Total</span>
                  <p className="font-semibold">{formatCurrency(valoresCalculados.te_total_rs)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">TUSD Total</span>
                  <p className="font-semibold">{formatCurrency(valoresCalculados.tusd_total_rs)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Energia (TE+TUSD)</span>
                  <p className="font-semibold text-primary">{formatCurrency(valoresCalculados.energia_rs)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tarifa Média</span>
                  <p className="font-semibold">{formatCurrency(valoresCalculados.tarifa_media_rs_kwh)}/kWh</p>
                </div>
              </div>
            )}
          </div>

          {data.consumo_total_kwh === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Consumo total deve ser maior que 0
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <p>• <strong>Ponta:</strong> Horário de maior demanda (geralmente 18h-21h)</p>
            <p>• <strong>Fora Ponta:</strong> Demais horários</p>
            <p>• <strong>Reservado:</strong> Horário especial (se aplicável)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
