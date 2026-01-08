import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizard } from '../WizardContext';
import { Receipt, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export function Step5ItensFatura() {
  const { data, updateData, setCanProceed } = useWizard();

  // Validação - sempre permite prosseguir
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Calcular totais por categoria
  const totalBandeiras = 
    (data.bandeira_te_p_rs || 0) + 
    (data.bandeira_te_fp_rs || 0) + 
    (data.bandeira_te_hr_rs || 0);

  const totalNaoCompensadoTUSD = 
    (data.nao_compensado_tusd_p_rs || 0) + 
    (data.nao_compensado_tusd_fp_rs || 0) + 
    (data.nao_compensado_tusd_hr_rs || 0);

  const totalNaoCompensadoTE = 
    (data.nao_compensado_te_p_rs || 0) + 
    (data.nao_compensado_te_fp_rs || 0) + 
    (data.nao_compensado_te_hr_rs || 0);

  const totalSCEE = 
    (data.scee_consumo_fp_tusd_rs || 0) + 
    (data.scee_parcela_te_fp_rs || 0) + 
    (data.scee_injecao_fp_te_rs || 0) + 
    (data.scee_injecao_fp_tusd_rs || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Passo 5 — Itens de Fatura
        </CardTitle>
        <CardDescription>
          Decomposição TE/TUSD/Bandeira/SCEE para auditoria e raio-x
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 5A - Bandeiras TE */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5A) Bandeiras (TE) — R$
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bandeira TE Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.bandeira_te_p_rs || ''} 
                onChange={(e) => updateData({ bandeira_te_p_rs: parseFloat(e.target.value) || 0 })}
                placeholder="348.34"
              />
            </div>
            <div className="space-y-2">
              <Label>Bandeira TE Fora Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.bandeira_te_fp_rs || ''} 
                onChange={(e) => updateData({ bandeira_te_fp_rs: parseFloat(e.target.value) || 0 })}
                placeholder="803.49"
              />
            </div>
            <div className="space-y-2">
              <Label>Bandeira TE HR</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.bandeira_te_hr_rs || ''} 
                onChange={(e) => updateData({ bandeira_te_hr_rs: parseFloat(e.target.value) || 0 })}
                placeholder="50.70"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Subtotal Bandeiras: <strong>{formatCurrency(totalBandeiras)}</strong>
          </p>
        </div>

        <Separator />

        {/* 5B - Não Compensado TUSD */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5B) Consumo NÃO Compensado (TUSD) — R$
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>TUSD Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_tusd_p_rs || ''} 
                onChange={(e) => updateData({ nao_compensado_tusd_p_rs: parseFloat(e.target.value) || 0 })}
                placeholder="13161.92"
              />
            </div>
            <div className="space-y-2">
              <Label>TUSD Fora Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_tusd_fp_rs || ''} 
                onChange={(e) => updateData({ nao_compensado_tusd_fp_rs: parseFloat(e.target.value) || 0 })}
                placeholder="1762.35"
              />
            </div>
            <div className="space-y-2">
              <Label>TUSD HR</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_tusd_hr_rs || ''} 
                onChange={(e) => updateData({ nao_compensado_tusd_hr_rs: parseFloat(e.target.value) || 0 })}
                placeholder="111.21"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Subtotal TUSD não compensado: <strong>{formatCurrency(totalNaoCompensadoTUSD)}</strong>
          </p>
        </div>

        <Separator />

        {/* 5C - Não Compensado TE */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5C) Consumo NÃO Compensado (TE) — R$
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>TE Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_te_p_rs || ''} 
                onChange={(e) => updateData({ nao_compensado_te_p_rs: parseFloat(e.target.value) || 0 })}
                placeholder="3264.26"
              />
            </div>
            <div className="space-y-2">
              <Label>TE Fora Ponta</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_te_fp_rs || ''} 
                onChange={(e) => updateData({ nao_compensado_te_fp_rs: parseFloat(e.target.value) || 0 })}
                placeholder="4615.01"
              />
            </div>
            <div className="space-y-2">
              <Label>TE HR</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.nao_compensado_te_hr_rs || ''} 
                onChange={(e) => updateData({ nao_compensado_te_hr_rs: parseFloat(e.target.value) || 0 })}
                placeholder="291.22"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Subtotal TE não compensado: <strong>{formatCurrency(totalNaoCompensadoTE)}</strong>
          </p>
        </div>

        <Separator />

        {/* 5D - SCEE Compensação */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5D) SCEE (Compensação) — R$
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SCEE Consumo FP TUSD</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_consumo_fp_tusd_rs || ''} 
                onChange={(e) => updateData({ scee_consumo_fp_tusd_rs: parseFloat(e.target.value) || 0 })}
                placeholder="905.38"
              />
            </div>
            <div className="space-y-2">
              <Label>SCEE Parcela TE FP</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_parcela_te_fp_rs || ''} 
                onChange={(e) => updateData({ scee_parcela_te_fp_rs: parseFloat(e.target.value) || 0 })}
                placeholder="203.67"
              />
            </div>
            <div className="space-y-2">
              <Label>SCEE Injeção FP TE (crédito)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_injecao_fp_te_rs || ''} 
                onChange={(e) => updateData({ scee_injecao_fp_te_rs: parseFloat(e.target.value) || 0 })}
                placeholder="-203.67"
              />
              <p className="text-xs text-muted-foreground">Valores negativos para créditos</p>
            </div>
            <div className="space-y-2">
              <Label>SCEE Injeção FP TUSD (crédito)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.scee_injecao_fp_tusd_rs || ''} 
                onChange={(e) => updateData({ scee_injecao_fp_tusd_rs: parseFloat(e.target.value) || 0 })}
                placeholder="-905.38"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Subtotal SCEE: <strong>{formatCurrency(totalSCEE)}</strong>
          </p>
        </div>

        <Separator />

        {/* 5E - Reativo + CIP */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            5E) Reativo + CIP
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>UFER FP (kVArh)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.ufer_fp_kvarh || ''} 
                onChange={(e) => updateData({ ufer_fp_kvarh: parseFloat(e.target.value) || 0 })}
                placeholder="378"
              />
            </div>
            <div className="space-y-2">
              <Label>UFER FP (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.ufer_fp_rs || ''} 
                onChange={(e) => updateData({ ufer_fp_rs: parseFloat(e.target.value) || 0 })}
                placeholder="130.49"
                className={data.ufer_fp_rs > 0 ? 'border-warning' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>CIP (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={data.cip_rs || ''} 
                onChange={(e) => updateData({ cip_rs: parseFloat(e.target.value) || 0 })}
                placeholder="34.35"
              />
            </div>
          </div>
        </div>

        {data.ufer_fp_rs > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Alerta Reativo/Fator de Potência:</strong> UFER detectado no valor de {formatCurrency(data.ufer_fp_rs)}.
              <br />
              <span className="text-sm">Recomendação: Verificar correção de fator de potência</span>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
