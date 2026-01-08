import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Calculator, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export function Step6Tributos() {
  const { data, updateData, setCanProceed } = useWizard();

  // Validação
  useEffect(() => {
    const isValid = 
      data.pis_rs >= 0 && 
      data.cofins_rs >= 0 && 
      data.icms_rs >= 0;
    setCanProceed(isValid);
  }, [data.pis_rs, data.cofins_rs, data.icms_rs, setCanProceed]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPercent = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + '%';
  };

  // Validar se base >= valor
  const pisWarning = data.base_pis_cofins_rs > 0 && data.pis_rs > data.base_pis_cofins_rs;
  const cofinsWarning = data.base_pis_cofins_rs > 0 && data.cofins_rs > data.base_pis_cofins_rs;
  const icmsWarning = data.base_icms_rs > 0 && data.icms_rs > data.base_icms_rs;

  // Total tributos
  const totalTributos = (data.pis_rs || 0) + (data.cofins_rs || 0) + (data.icms_rs || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Passo 6 — Tributos
        </CardTitle>
        <CardDescription>
          PIS, COFINS e ICMS para relatório e auditoria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PIS/COFINS */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            PIS/COFINS
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Base de Cálculo PIS/COFINS (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.base_pis_cofins_rs || ''} 
                onChange={(e) => updateData({ base_pis_cofins_rs: parseFloat(e.target.value) || 0 })}
                placeholder="30374.37"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PIS Alíquota (%)</Label>
                <Input 
                  type="number"
                  step="0.0001"
                  value={data.pis_aliquota_percent || ''} 
                  onChange={(e) => updateData({ pis_aliquota_percent: parseFloat(e.target.value) || 0 })}
                  placeholder="0.5358"
                />
              </div>
              <div className="space-y-2">
                <Label>PIS Valor (R$)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={data.pis_rs || ''} 
                  onChange={(e) => updateData({ pis_rs: parseFloat(e.target.value) || 0 })}
                  placeholder="162.75"
                  className={pisWarning ? 'border-warning' : ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>COFINS Alíquota (%)</Label>
                <Input 
                  type="number"
                  step="0.0001"
                  value={data.cofins_aliquota_percent || ''} 
                  onChange={(e) => updateData({ cofins_aliquota_percent: parseFloat(e.target.value) || 0 })}
                  placeholder="2.4769"
                />
              </div>
              <div className="space-y-2">
                <Label>COFINS Valor (R$)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={data.cofins_rs || ''} 
                  onChange={(e) => updateData({ cofins_rs: parseFloat(e.target.value) || 0 })}
                  placeholder="752.34"
                  className={cofinsWarning ? 'border-warning' : ''}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* ICMS */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            ICMS
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Base de Cálculo ICMS (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.base_icms_rs || ''} 
                onChange={(e) => updateData({ base_icms_rs: parseFloat(e.target.value) || 0 })}
                placeholder="37499.20"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ICMS Alíquota (%)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={data.icms_aliquota_percent || ''} 
                  onChange={(e) => updateData({ icms_aliquota_percent: parseFloat(e.target.value) || 0 })}
                  placeholder="19"
                />
              </div>
              <div className="space-y-2">
                <Label>ICMS Valor (R$)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={data.icms_rs || ''} 
                  onChange={(e) => updateData({ icms_rs: parseFloat(e.target.value) || 0 })}
                  placeholder="7124.85"
                  className={icmsWarning ? 'border-warning' : ''}
                />
              </div>
            </div>
          </div>
        </div>

        {(pisWarning || cofinsWarning || icmsWarning) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Atenção: Valor do tributo maior que a base de cálculo. Verifique os dados.
            </AlertDescription>
          </Alert>
        )}

        {/* Resumo */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h5 className="font-medium mb-3">Resumo de Tributos</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">PIS ({formatPercent(data.pis_aliquota_percent || 0)})</span>
              <span className="font-medium">{formatCurrency(data.pis_rs || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">COFINS ({formatPercent(data.cofins_aliquota_percent || 0)})</span>
              <span className="font-medium">{formatCurrency(data.cofins_rs || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ICMS ({data.icms_aliquota_percent || 0}%)</span>
              <span className="font-medium">{formatCurrency(data.icms_rs || 0)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base">
              <span className="font-medium">Total Tributos</span>
              <span className="font-bold text-primary">{formatCurrency(totalTributos)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
