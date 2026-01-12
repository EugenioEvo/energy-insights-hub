import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCreateGeracaoMensal } from '@/hooks/useUsinaGeracaoMensal';
import { useCreateRateiosBatch } from '@/hooks/useUsinaRateioMensal';
import { UsinaRemota } from '@/hooks/useUsinasRemotas';
import { ClienteUsinaVinculoWithRelations } from '@/hooks/useClienteUsinaVinculo';
import { Loader2, Zap, Calculator, AlertTriangle } from 'lucide-react';

interface NovoLancamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usina: UsinaRemota;
  vinculos: ClienteUsinaVinculoWithRelations[];
}

export function NovoLancamentoModal({ 
  open, 
  onOpenChange, 
  usina, 
  vinculos 
}: NovoLancamentoModalProps) {
  const { toast } = useToast();
  const createGeracao = useCreateGeracaoMensal();
  const createRateios = useCreateRateiosBatch();

  const [form, setForm] = useState({
    mes_ref: new Date().toISOString().slice(0, 7), // YYYY-MM
    geracao_total_kwh: '',
    geracao_ponta_kwh: '',
    geracao_fora_ponta_kwh: '',
    geracao_reservado_kwh: '',
    observacoes: '',
  });

  // Calcular rateio automático
  const rateioPreview = useMemo(() => {
    const geracaoTotal = parseFloat(form.geracao_total_kwh) || 0;
    const totalPercentual = vinculos.reduce((sum, v) => sum + v.percentual_rateio, 0);
    
    return vinculos.map((vinculo) => {
      const percentualAjustado = totalPercentual > 0 
        ? (vinculo.percentual_rateio / totalPercentual) * 100
        : 0;
      const energiaAlocada = geracaoTotal * (percentualAjustado / 100);
      
      // Calcular valor da fatura baseado na modalidade
      let valorFatura = 0;
      if (vinculo.modalidade_economia === 'ppa_tarifa' && vinculo.tarifa_ppa_rs_kwh) {
        valorFatura = energiaAlocada * vinculo.tarifa_ppa_rs_kwh;
      } else if (vinculo.modalidade_economia === 'desconto_fatura_global' && vinculo.desconto_garantido_percent) {
        // Estimar valor compensado (seria necessário tarifa da UC)
        // Por enquanto, deixar zerado para preenchimento manual
        valorFatura = 0;
      }

      return {
        vinculo_id: vinculo.id,
        uc_beneficiaria_id: vinculo.uc_beneficiaria_id,
        uc_numero: vinculo.unidades_consumidoras?.numero || 'N/A',
        cliente_nome: vinculo.clientes?.nome || 'Cliente',
        percentual_contratado: vinculo.percentual_rateio,
        percentual_aplicado: percentualAjustado,
        energia_alocada_kwh: energiaAlocada,
        valor_fatura_usina_rs: valorFatura,
        modalidade: vinculo.modalidade_economia,
        desconto: vinculo.desconto_garantido_percent,
      };
    });
  }, [form.geracao_total_kwh, vinculos]);

  // Calcular fator de capacidade
  const fatorCapacidade = useMemo(() => {
    const geracaoTotal = parseFloat(form.geracao_total_kwh) || 0;
    const potencia = usina.potencia_instalada_kw || 0;
    if (potencia === 0) return null;
    
    // Assumindo 30 dias e 24 horas
    const horasMes = 30 * 24;
    const capacidadeMaxima = potencia * horasMes;
    return (geracaoTotal / capacidadeMaxima) * 100;
  }, [form.geracao_total_kwh, usina.potencia_instalada_kw]);

  const totalRateio = rateioPreview.reduce((sum, r) => sum + r.energia_alocada_kwh, 0);
  const totalValor = rateioPreview.reduce((sum, r) => sum + r.valor_fatura_usina_rs, 0);

  const handleSubmit = async () => {
    if (!form.geracao_total_kwh) {
      toast({ 
        title: 'Erro', 
        description: 'Informe a geração total', 
        variant: 'destructive' 
      });
      return;
    }

    if (vinculos.length === 0) {
      toast({ 
        title: 'Erro', 
        description: 'Não há beneficiários vinculados', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      // Criar registro de geração
      const geracao = await createGeracao.mutateAsync({
        usina_id: usina.id,
        mes_ref: form.mes_ref,
        geracao_total_kwh: parseFloat(form.geracao_total_kwh),
        geracao_ponta_kwh: parseFloat(form.geracao_ponta_kwh) || 0,
        geracao_fora_ponta_kwh: parseFloat(form.geracao_fora_ponta_kwh) || 0,
        geracao_reservado_kwh: parseFloat(form.geracao_reservado_kwh) || 0,
        fator_capacidade_percent: fatorCapacidade,
        disponibilidade_percent: 100,
        observacoes: form.observacoes || null,
      });

      // Criar rateios para cada beneficiário
      const rateiosData = rateioPreview.map((r) => ({
        geracao_id: geracao.id,
        vinculo_id: r.vinculo_id,
        uc_beneficiaria_id: r.uc_beneficiaria_id,
        energia_alocada_kwh: r.energia_alocada_kwh,
        energia_ponta_kwh: 0,
        energia_fora_ponta_kwh: r.energia_alocada_kwh,
        energia_reservado_kwh: 0,
        percentual_aplicado: r.percentual_aplicado,
        valor_fatura_usina_rs: r.valor_fatura_usina_rs,
        valor_compensado_estimado_rs: 0,
        status: 'pendente' as const,
      }));

      await createRateios.mutateAsync(rateiosData);

      toast({ title: 'Sucesso', description: 'Lançamento criado com sucesso!' });
      onOpenChange(false);
      setForm({
        mes_ref: new Date().toISOString().slice(0, 7),
        geracao_total_kwh: '',
        geracao_ponta_kwh: '',
        geracao_fora_ponta_kwh: '',
        geracao_reservado_kwh: '',
        observacoes: '',
      });
    } catch (error: any) {
      toast({ 
        title: 'Erro', 
        description: error.message || 'Falha ao criar lançamento', 
        variant: 'destructive' 
      });
    }
  };

  const isLoading = createGeracao.isPending || createRateios.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Novo Lançamento Mensal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Usina Info */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium">{usina.nome}</p>
            <p className="text-sm text-muted-foreground">
              UC Geradora: {usina.uc_geradora} • Potência: {usina.potencia_instalada_kw} kW
            </p>
          </div>

          {/* Dados da Geração */}
          <div className="space-y-4">
            <h3 className="font-medium">Dados da Geração</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês de Referência *</Label>
                <Input
                  type="month"
                  value={form.mes_ref}
                  onChange={(e) => setForm({ ...form, mes_ref: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Geração Total (kWh) *</Label>
                <Input
                  type="number"
                  value={form.geracao_total_kwh}
                  onChange={(e) => setForm({ ...form, geracao_total_kwh: e.target.value })}
                  placeholder="Ex: 45000"
                />
              </div>
            </div>

            {fatorCapacidade !== null && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                fatorCapacidade < 10 ? 'bg-amber-500/10 text-amber-700' :
                fatorCapacidade > 25 ? 'bg-green-500/10 text-green-700' :
                'bg-blue-500/10 text-blue-700'
              }`}>
                <Calculator className="h-4 w-4" />
                <span className="text-sm">
                  Fator de Capacidade Estimado: <strong>{fatorCapacidade.toFixed(1)}%</strong>
                </span>
                {fatorCapacidade < 10 && (
                  <Badge variant="outline" className="text-amber-600">Abaixo do esperado</Badge>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas sobre a geração do mês..."
                rows={2}
              />
            </div>
          </div>

          {/* Preview do Rateio */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Rateio Automático</h3>
              <Badge variant="outline">
                {vinculos.length} beneficiários
              </Badge>
            </div>

            {vinculos.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  Nenhum beneficiário vinculado a esta usina
                </span>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Beneficiário</th>
                        <th className="text-center p-3">%</th>
                        <th className="text-right p-3">Energia (kWh)</th>
                        <th className="text-right p-3">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateioPreview.map((rateio) => (
                        <tr key={rateio.vinculo_id} className="border-t">
                          <td className="p-3">
                            <div>
                              <span className="font-medium">UC {rateio.uc_numero}</span>
                              <p className="text-xs text-muted-foreground">{rateio.cliente_nome}</p>
                            </div>
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="outline">{rateio.percentual_aplicado.toFixed(1)}%</Badge>
                          </td>
                          <td className="text-right p-3 font-medium">
                            {rateio.energia_alocada_kwh.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-right p-3">
                            {rateio.valor_fatura_usina_rs > 0 
                              ? `R$ ${rateio.valor_fatura_usina_rs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted font-medium">
                      <tr className="border-t">
                        <td className="p-3">Total</td>
                        <td className="text-center p-3">100%</td>
                        <td className="text-right p-3">
                          {totalRateio.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh
                        </td>
                        <td className="text-right p-3">
                          R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground">
                  O rateio é calculado automaticamente com base nos percentuais cadastrados nos vínculos.
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || vinculos.length === 0}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Lançamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
