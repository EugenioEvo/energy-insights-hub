import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../../WizardContext';
import { Zap } from 'lucide-react';

export function Step2ConsumoSimples() {
  const { data, updateData, setCanProceed } = useWizard();

  useEffect(() => {
    // Grupo B: apenas consumo total é obrigatório
    setCanProceed(data.consumo_total_kwh > 0);
  }, [data.consumo_total_kwh, setCanProceed]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Consumo de Energia
        </CardTitle>
        <CardDescription>
          Grupo B — Tarifa Monômia (consumo total sem postos horários)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="consumo_total" className="text-lg">Consumo Total (kWh) *</Label>
              <Input
                id="consumo_total"
                type="number"
                value={data.consumo_total_kwh || ''}
                onChange={(e) => {
                  const valor = parseFloat(e.target.value) || 0;
                  updateData({ 
                    consumo_total_kwh: valor,
                    // Grupo B não tem postos, todo consumo vai para fora ponta
                    consumo_fora_ponta_kwh: valor,
                    consumo_ponta_kwh: 0,
                    consumo_reservado_kwh: 0,
                  });
                }}
                placeholder="Consumo total do mês"
                className="text-lg h-12"
              />
              <p className="text-sm text-muted-foreground">
                Valor total de energia consumida conforme a fatura
              </p>
            </div>
          </div>
        </div>

        {/* Custo de disponibilidade para Grupo B */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <h3 className="font-medium">Custo de Disponibilidade</h3>
          <p className="text-sm text-muted-foreground">
            Para Grupo B, mesmo sem consumo, há cobrança mínima baseada no tipo de ligação:
          </p>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-2 bg-background rounded border text-center">
              <p className="font-medium">Monofásico</p>
              <p className="text-muted-foreground">30 kWh</p>
            </div>
            <div className="p-2 bg-background rounded border text-center">
              <p className="font-medium">Bifásico</p>
              <p className="text-muted-foreground">50 kWh</p>
            </div>
            <div className="p-2 bg-background rounded border text-center">
              <p className="font-medium">Trifásico</p>
              <p className="text-muted-foreground">100 kWh</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Tipo selecionado: <span className="font-medium">{data.tipo_fornecimento}</span>
          </p>
        </div>

        {/* Resumo */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg">Consumo Total:</span>
            <span className="text-2xl font-bold text-primary">
              {data.consumo_total_kwh.toLocaleString('pt-BR')} kWh
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
