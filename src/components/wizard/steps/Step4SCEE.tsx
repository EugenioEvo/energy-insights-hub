import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Sun, Info, Zap, Receipt } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export function Step4SCEE() {
  const { data, updateData, setCanProceed } = useWizard();

  // Validação
  useEffect(() => {
    const isValid = data.scee_rateio_percent >= 0 && data.scee_rateio_percent <= 100;
    setCanProceed(isValid);
  }, [data.scee_rateio_percent, setCanProceed]);

  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totalGeracaoCiclo = 
    (data.scee_geracao_ciclo_ponta_kwh || 0) + 
    (data.scee_geracao_ciclo_fp_kwh || 0) + 
    (data.scee_geracao_ciclo_hr_kwh || 0);

  const totalSaldo = 
    (data.scee_saldo_kwh_p || 0) + 
    (data.scee_saldo_kwh_fp || 0) + 
    (data.scee_saldo_kwh_hr || 0);

  const totalExpirar = 
    (data.scee_saldo_expirar_30d_kwh || 0) + 
    (data.scee_saldo_expirar_60d_kwh || 0);

  // Total de economia (simultânea + créditos)
  const totalEconomiaEnergia = (data.energia_simultanea_kwh || 0) + (data.credito_assinatura_kwh || 0);
  const totalEconomiaRs = (data.energia_simultanea_rs || 0) + (data.credito_assinatura_rs || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          Passo 4 — SCEE / GD (Créditos e Compensação)
        </CardTitle>
        <CardDescription>
          Informações do Sistema de Compensação de Energia Elétrica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* NOVA SEÇÃO: Energia Simultânea vs Créditos de Assinatura */}
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
          <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Energia Simultânea (Geração Própria)
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Energia gerada e consumida em tempo real pela própria usina do cliente. Economia de 100%.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Energia Simultânea (kWh)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.energia_simultanea_kwh || ''} 
                onChange={(e) => updateData({ energia_simultanea_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Economizado (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.energia_simultanea_rs || ''} 
                onChange={(e) => updateData({ energia_simultanea_rs: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="bg-chart-optimized/10 rounded-lg p-4 border border-chart-optimized/20">
          <h4 className="text-sm font-semibold text-chart-optimized mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Créditos de Assinatura (Usina Remota)
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Créditos recebidos de usina remota através de contrato de assinatura com desconto garantido.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Créditos Recebidos (kWh)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.credito_assinatura_kwh || ''} 
                onChange={(e) => updateData({ credito_assinatura_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Créditos (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.credito_assinatura_rs || ''} 
                onChange={(e) => updateData({ credito_assinatura_rs: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Desconto Assinatura (%)</Label>
              <Input 
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={data.desconto_assinatura_percent || ''} 
                onChange={(e) => updateData({ desconto_assinatura_percent: parseFloat(e.target.value) || 0 })}
                placeholder="15"
              />
            </div>
          </div>
        </div>

        {/* Resumo de Economia */}
        <div className="bg-success/10 rounded-lg p-4 border border-success/20">
          <h5 className="font-medium mb-3 text-success">Resumo de Economia por Tipo</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Simultânea
              </span>
              <p className="font-semibold">{formatNumber(data.energia_simultanea_kwh || 0)} kWh</p>
              <p className="text-xs text-success">{formatCurrency(data.energia_simultanea_rs || 0)}</p>
            </div>
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Receipt className="h-3 w-3" /> Assinatura
              </span>
              <p className="font-semibold">{formatNumber(data.credito_assinatura_kwh || 0)} kWh</p>
              <p className="text-xs text-chart-optimized">{formatCurrency(data.credito_assinatura_rs || 0)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Desconto</span>
              <p className="font-semibold">{formatNumber(data.desconto_assinatura_percent || 0)}%</p>
            </div>
            <div className="bg-background rounded p-2">
              <span className="text-muted-foreground font-medium">Total Economia</span>
              <p className="font-bold text-lg">{formatNumber(totalEconomiaEnergia)} kWh</p>
              <p className="text-sm font-semibold text-success">{formatCurrency(totalEconomiaRs)}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Geração do Ciclo */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Geração do Ciclo (kWh)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_geracao_ciclo_ponta_kwh || ''} 
                onChange={(e) => updateData({ scee_geracao_ciclo_ponta_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Fora Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_geracao_ciclo_fp_kwh || ''} 
                onChange={(e) => updateData({ scee_geracao_ciclo_fp_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="7266"
              />
            </div>
            <div className="space-y-2">
              <Label>Horário Reservado</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_geracao_ciclo_hr_kwh || ''} 
                onChange={(e) => updateData({ scee_geracao_ciclo_hr_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total geração ciclo: <strong>{formatNumber(totalGeracaoCiclo)} kWh</strong>
          </p>
        </div>

        {/* Créditos Recebidos */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Créditos Recebidos da Distribuidora (kWh)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Crédito Recebido</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_credito_recebido_kwh || ''} 
                onChange={(e) => updateData({ scee_credito_recebido_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="7266"
              />
            </div>
            <div className="space-y-2">
              <Label>Excedente Recebido</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_excedente_recebido_kwh || ''} 
                onChange={(e) => updateData({ scee_excedente_recebido_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Saldo de Créditos */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Saldo de Créditos (kWh)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Saldo Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_kwh_p || ''} 
                onChange={(e) => updateData({ scee_saldo_kwh_p: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo Fora Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_kwh_fp || ''} 
                onChange={(e) => updateData({ scee_saldo_kwh_fp: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo HR</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_kwh_hr || ''} 
                onChange={(e) => updateData({ scee_saldo_kwh_hr: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total saldo: <strong>{formatNumber(totalSaldo)} kWh</strong>
          </p>
        </div>

        {/* Créditos a Expirar */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Créditos a Expirar (kWh)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Expirar em 30 dias</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_expirar_30d_kwh || ''} 
                onChange={(e) => updateData({ scee_saldo_expirar_30d_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className={data.scee_saldo_expirar_30d_kwh > 0 ? 'border-warning' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Expirar em 60 dias</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_saldo_expirar_60d_kwh || ''} 
                onChange={(e) => updateData({ scee_saldo_expirar_60d_kwh: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Rateio (%)</Label>
              <Input 
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={data.scee_rateio_percent || ''} 
                onChange={(e) => updateData({ scee_rateio_percent: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {totalExpirar > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {formatNumber(totalExpirar)} kWh de créditos a expirar nos próximos 60 dias. 
              Considere otimizar o consumo para aproveitá-los.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/50 rounded-lg p-4">
          <h5 className="font-medium mb-2">Resumo SCEE</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Geração Ciclo</span>
              <p className="font-semibold">{formatNumber(totalGeracaoCiclo)} kWh</p>
            </div>
            <div>
              <span className="text-muted-foreground">Crédito Recebido</span>
              <p className="font-semibold">{formatNumber(data.scee_credito_recebido_kwh || 0)} kWh</p>
            </div>
            <div>
              <span className="text-muted-foreground">Saldo Total</span>
              <p className="font-semibold">{formatNumber(totalSaldo)} kWh</p>
            </div>
            <div>
              <span className="text-muted-foreground">A Expirar</span>
              <p className={`font-semibold ${totalExpirar > 0 ? 'text-warning' : ''}`}>
                {formatNumber(totalExpirar)} kWh
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
