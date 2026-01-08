import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWizard } from '../WizardContext';
import { Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Step1Cabecalho() {
  const { data, updateData, setCanProceed } = useWizard();

  // Gerar meses disponíveis
  const generateMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  };

  // Validação
  useEffect(() => {
    const leituraAnterior = data.leitura_anterior ? new Date(data.leitura_anterior) : null;
    const leituraAtual = data.leitura_atual ? new Date(data.leitura_atual) : null;
    
    const isValid = 
      !!data.mes_ref &&
      data.valor_total_pagar > 0 &&
      (!leituraAnterior || !leituraAtual || leituraAtual > leituraAnterior);
    
    setCanProceed(isValid);
  }, [data.mes_ref, data.valor_total_pagar, data.leitura_anterior, data.leitura_atual, setCanProceed]);

  // Calcular dias faturados automaticamente
  useEffect(() => {
    if (data.leitura_anterior && data.leitura_atual) {
      const anterior = new Date(data.leitura_anterior);
      const atual = new Date(data.leitura_atual);
      const diff = Math.ceil((atual.getTime() - anterior.getTime()) / (1000 * 60 * 60 * 24));
      updateData({ dias_faturados: diff });
    }
  }, [data.leitura_anterior, data.leitura_atual, updateData]);

  const diasFora = data.dias_faturados > 0 && (data.dias_faturados < 25 || data.dias_faturados > 35);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Passo 1 — Cabeçalho da Fatura
        </CardTitle>
        <CardDescription>
          Identificação do mês de referência e datas da fatura
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mes_ref">Mês de Referência *</Label>
            <Select value={data.mes_ref} onValueChange={(v) => updateData({ mes_ref: v })}>
              <SelectTrigger id="mes_ref">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {generateMonths().map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor_total">Valor Total a Pagar (R$) *</Label>
            <Input 
              id="valor_total"
              type="number"
              step="0.01"
              value={data.valor_total_pagar || ''} 
              onChange={(e) => updateData({ valor_total_pagar: parseFloat(e.target.value) || 0 })}
              placeholder="37533.55"
              className={!data.valor_total_pagar ? 'border-destructive' : ''}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_emissao">Data de Emissão</Label>
            <Input 
              id="data_emissao"
              type="date"
              value={data.data_emissao} 
              onChange={(e) => updateData({ data_emissao: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_apresentacao">Data de Apresentação</Label>
            <Input 
              id="data_apresentacao"
              type="date"
              value={data.data_apresentacao} 
              onChange={(e) => updateData({ data_apresentacao: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="leitura_anterior">Leitura Anterior</Label>
            <Input 
              id="leitura_anterior"
              type="date"
              value={data.leitura_anterior} 
              onChange={(e) => updateData({ leitura_anterior: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leitura_atual">Leitura Atual</Label>
            <Input 
              id="leitura_atual"
              type="date"
              value={data.leitura_atual} 
              onChange={(e) => updateData({ leitura_atual: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dias_faturados">Dias Faturados</Label>
            <Input 
              id="dias_faturados"
              type="number"
              value={data.dias_faturados || ''} 
              onChange={(e) => updateData({ dias_faturados: parseInt(e.target.value) || 0 })}
              className={diasFora ? 'border-warning' : ''}
            />
          </div>
        </div>

        {diasFora && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Dias faturados fora do intervalo esperado (25-35 dias). Verifique as datas.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="proxima_leitura">Próxima Leitura</Label>
            <Input 
              id="proxima_leitura"
              type="date"
              value={data.proxima_leitura} 
              onChange={(e) => updateData({ proxima_leitura: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vencimento">Vencimento</Label>
            <Input 
              id="vencimento"
              type="date"
              value={data.vencimento} 
              onChange={(e) => updateData({ vencimento: e.target.value })}
            />
          </div>
        </div>

        {data.leitura_anterior && data.leitura_atual && 
          new Date(data.leitura_atual) <= new Date(data.leitura_anterior) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Leitura atual deve ser posterior à leitura anterior
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
