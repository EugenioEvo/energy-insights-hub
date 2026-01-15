import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface EditTarifaModalProps {
  tarifa: Tables<'tarifas_concessionaria'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTarifaModal({ tarifa, open, onOpenChange }: EditTarifaModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Tables<'tarifas_concessionaria'>>>({});

  useEffect(() => {
    if (tarifa) {
      setFormData({ ...tarifa });
    }
  }, [tarifa]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Tables<'tarifas_concessionaria'>>) => {
      if (!tarifa?.id) throw new Error('ID da tarifa não encontrado');

      const { error } = await supabase
        .from('tarifas_concessionaria')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tarifa.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tarifa atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['tarifas-concessionaria'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const updateField = (field: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setFormData((prev) => ({ ...prev, [field]: numValue }));
  };

  const updateTextField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!tarifa) return null;

  const isGrupoA = tarifa.grupo_tarifario === 'A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Tarifa - {tarifa.subgrupo} {tarifa.modalidade}
          </DialogTitle>
          <DialogDescription>
            Concessionária: {tarifa.concessionaria} • Grupo {tarifa.grupo_tarifario}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="energia" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="energia">Energia (TE)</TabsTrigger>
              <TabsTrigger value="distribuicao">TUSD</TabsTrigger>
              <TabsTrigger value="demanda">Demanda</TabsTrigger>
              <TabsTrigger value="tributos">Tributos</TabsTrigger>
            </TabsList>

            {/* TE - Tarifa de Energia */}
            <TabsContent value="energia" className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground mb-4">
                Componente de energia elétrica (TE) em R$/kWh
              </div>
              {isGrupoA ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="te_ponta">TE Ponta (R$/kWh)</Label>
                    <Input
                      id="te_ponta"
                      type="number"
                      step="0.000001"
                      value={formData.te_ponta_rs_kwh ?? ''}
                      onChange={(e) => updateField('te_ponta_rs_kwh', e.target.value)}
                      placeholder="0.00000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="te_fora_ponta">TE Fora Ponta (R$/kWh)</Label>
                    <Input
                      id="te_fora_ponta"
                      type="number"
                      step="0.000001"
                      value={formData.te_fora_ponta_rs_kwh ?? ''}
                      onChange={(e) => updateField('te_fora_ponta_rs_kwh', e.target.value)}
                      placeholder="0.00000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="te_reservado">TE Hora Reservada (R$/kWh)</Label>
                    <Input
                      id="te_reservado"
                      type="number"
                      step="0.000001"
                      value={formData.te_reservado_rs_kwh ?? ''}
                      onChange={(e) => updateField('te_reservado_rs_kwh', e.target.value)}
                      placeholder="0.00000"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="te_unica">TE Única (R$/kWh)</Label>
                  <Input
                    id="te_unica"
                    type="number"
                    step="0.000001"
                    value={formData.te_unica_rs_kwh ?? ''}
                    onChange={(e) => updateField('te_unica_rs_kwh', e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
              )}
            </TabsContent>

            {/* TUSD */}
            <TabsContent value="distribuicao" className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground mb-4">
                Tarifa de Uso do Sistema de Distribuição (TUSD) em R$/kWh
              </div>
              {isGrupoA ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tusd_ponta">TUSD Ponta (R$/kWh)</Label>
                      <Input
                        id="tusd_ponta"
                        type="number"
                        step="0.000001"
                        value={formData.tusd_ponta_rs_kwh ?? ''}
                        onChange={(e) => updateField('tusd_ponta_rs_kwh', e.target.value)}
                        placeholder="0.00000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tusd_fora_ponta">TUSD Fora Ponta (R$/kWh)</Label>
                      <Input
                        id="tusd_fora_ponta"
                        type="number"
                        step="0.000001"
                        value={formData.tusd_fora_ponta_rs_kwh ?? ''}
                        onChange={(e) => updateField('tusd_fora_ponta_rs_kwh', e.target.value)}
                        placeholder="0.00000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tusd_reservado">TUSD Hora Reservada (R$/kWh)</Label>
                      <Input
                        id="tusd_reservado"
                        type="number"
                        step="0.000001"
                        value={formData.tusd_reservado_rs_kwh ?? ''}
                        onChange={(e) => updateField('tusd_reservado_rs_kwh', e.target.value)}
                        placeholder="0.00000"
                      />
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="text-sm text-muted-foreground mb-2">Componentes da TUSD (para GD)</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tusd_fio_a">TUSD Fio A (R$/kWh)</Label>
                      <Input
                        id="tusd_fio_a"
                        type="number"
                        step="0.000001"
                        value={formData.tusd_fio_a_rs_kwh ?? ''}
                        onChange={(e) => updateField('tusd_fio_a_rs_kwh', e.target.value)}
                        placeholder="0.00000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tusd_fio_b">TUSD Fio B (R$/kWh)</Label>
                      <Input
                        id="tusd_fio_b"
                        type="number"
                        step="0.000001"
                        value={formData.tusd_fio_b_rs_kwh ?? ''}
                        onChange={(e) => updateField('tusd_fio_b_rs_kwh', e.target.value)}
                        placeholder="0.00000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tusd_encargos">TUSD Encargos (R$/kWh)</Label>
                      <Input
                        id="tusd_encargos"
                        type="number"
                        step="0.000001"
                        value={formData.tusd_encargos_rs_kwh ?? ''}
                        onChange={(e) => updateField('tusd_encargos_rs_kwh', e.target.value)}
                        placeholder="0.00000"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="tusd_unica">TUSD Única (R$/kWh)</Label>
                  <Input
                    id="tusd_unica"
                    type="number"
                    step="0.000001"
                    value={formData.tusd_unica_rs_kwh ?? ''}
                    onChange={(e) => updateField('tusd_unica_rs_kwh', e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
              )}
            </TabsContent>

            {/* Demanda */}
            <TabsContent value="demanda" className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground mb-4">
                Tarifas de demanda de potência em R$/kW
              </div>
              {isGrupoA ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="demanda_ponta">Demanda Ponta (R$/kW)</Label>
                    <Input
                      id="demanda_ponta"
                      type="number"
                      step="0.01"
                      value={formData.demanda_ponta_rs_kw ?? ''}
                      onChange={(e) => updateField('demanda_ponta_rs_kw', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demanda_fora_ponta">Demanda Fora Ponta (R$/kW)</Label>
                    <Input
                      id="demanda_fora_ponta"
                      type="number"
                      step="0.01"
                      value={formData.demanda_fora_ponta_rs_kw ?? ''}
                      onChange={(e) => updateField('demanda_fora_ponta_rs_kw', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demanda_unica">Demanda Única (R$/kW)</Label>
                    <Input
                      id="demanda_unica"
                      type="number"
                      step="0.01"
                      value={formData.demanda_unica_rs_kw ?? ''}
                      onChange={(e) => updateField('demanda_unica_rs_kw', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demanda_geracao">Demanda Geração (R$/kW)</Label>
                    <Input
                      id="demanda_geracao"
                      type="number"
                      step="0.01"
                      value={formData.demanda_geracao_rs_kw ?? ''}
                      onChange={(e) => updateField('demanda_geracao_rs_kw', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="demanda_ultrapassagem">Demanda Ultrapassagem (R$/kW)</Label>
                    <Input
                      id="demanda_ultrapassagem"
                      type="number"
                      step="0.01"
                      value={formData.demanda_ultrapassagem_rs_kw ?? ''}
                      onChange={(e) => updateField('demanda_ultrapassagem_rs_kw', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Grupo B não possui tarifas de demanda
                </div>
              )}
            </TabsContent>

            {/* Tributos */}
            <TabsContent value="tributos" className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground mb-4">
                Alíquotas de tributos (%)
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pis">PIS (%)</Label>
                  <Input
                    id="pis"
                    type="number"
                    step="0.0001"
                    value={formData.pis_percent ?? ''}
                    onChange={(e) => updateField('pis_percent', e.target.value)}
                    placeholder="0.5358"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cofins">COFINS (%)</Label>
                  <Input
                    id="cofins"
                    type="number"
                    step="0.0001"
                    value={formData.cofins_percent ?? ''}
                    onChange={(e) => updateField('cofins_percent', e.target.value)}
                    placeholder="2.4769"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icms">ICMS (%)</Label>
                  <Input
                    id="icms"
                    type="number"
                    step="0.01"
                    value={formData.icms_percent ?? ''}
                    onChange={(e) => updateField('icms_percent', e.target.value)}
                    placeholder="19"
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-sm text-muted-foreground mb-2">Bandeiras Tarifárias (R$/kWh)</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bandeira_verde">Bandeira Verde</Label>
                  <Input
                    id="bandeira_verde"
                    type="number"
                    step="0.000001"
                    value={formData.bandeira_verde_rs_kwh ?? ''}
                    onChange={(e) => updateField('bandeira_verde_rs_kwh', e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bandeira_amarela">Bandeira Amarela</Label>
                  <Input
                    id="bandeira_amarela"
                    type="number"
                    step="0.000001"
                    value={formData.bandeira_amarela_rs_kwh ?? ''}
                    onChange={(e) => updateField('bandeira_amarela_rs_kwh', e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bandeira_vermelha1">Bandeira Vermelha 1</Label>
                  <Input
                    id="bandeira_vermelha1"
                    type="number"
                    step="0.000001"
                    value={formData.bandeira_vermelha1_rs_kwh ?? ''}
                    onChange={(e) => updateField('bandeira_vermelha1_rs_kwh', e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bandeira_vermelha2">Bandeira Vermelha 2</Label>
                  <Input
                    id="bandeira_vermelha2"
                    type="number"
                    step="0.000001"
                    value={formData.bandeira_vermelha2_rs_kwh ?? ''}
                    onChange={(e) => updateField('bandeira_vermelha2_rs_kwh', e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-sm text-muted-foreground mb-2">Informações Regulatórias</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="resolucao">Resolução ANEEL</Label>
                  <Input
                    id="resolucao"
                    type="text"
                    value={formData.resolucao_aneel ?? ''}
                    onChange={(e) => updateTextField('resolucao_aneel', e.target.value)}
                    placeholder="REH nº 3.000/2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vigencia">Data de Vigência</Label>
                  <Input
                    id="vigencia"
                    type="date"
                    value={formData.vigencia_inicio ?? ''}
                    onChange={(e) => updateTextField('vigencia_inicio', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
