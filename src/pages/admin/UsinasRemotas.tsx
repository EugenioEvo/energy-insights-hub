import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  useUsinasRemotas, 
  useCreateUsinaRemota, 
  useUpdateUsinaRemota,
  useDeleteUsinaRemota,
  UsinaRemota 
} from '@/hooks/useUsinasRemotas';
import { Sun, Wind, Droplets, Leaf, Factory, Plus, Loader2, Pencil, Trash2, MapPin, Zap } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const fonteIcons = {
  solar: Sun,
  eolica: Wind,
  hidraulica: Droplets,
  biomassa: Leaf,
  outros: Factory,
};

const fonteLabels = {
  solar: 'Solar',
  eolica: 'Eólica',
  hidraulica: 'Hidráulica',
  biomassa: 'Biomassa',
  outros: 'Outros',
};

const modalidadeLabels = {
  autoconsumo_remoto: 'Autoconsumo Remoto',
  geracao_compartilhada: 'Geração Compartilhada',
  consorcio: 'Consórcio',
  cooperativa: 'Cooperativa',
};

type FonteEnergia = 'solar' | 'eolica' | 'hidraulica' | 'biomassa' | 'outros';
type ModalidadeGD = 'autoconsumo_remoto' | 'geracao_compartilhada' | 'consorcio' | 'cooperativa';

const emptyForm = {
  nome: '',
  uc_geradora: '',
  cnpj_titular: '',
  potencia_instalada_kw: '',
  fonte: 'solar' as FonteEnergia,
  modalidade_gd: 'autoconsumo_remoto' as ModalidadeGD,
  distribuidora: '',
  endereco: '',
  data_conexao: '',
  ativo: true,
};

export default function UsinasRemotas() {
  const { data: usinas = [], isLoading } = useUsinasRemotas();
  const createUsina = useCreateUsinaRemota();
  const updateUsina = useUpdateUsinaRemota();
  const deleteUsina = useDeleteUsinaRemota();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUsina, setSelectedUsina] = useState<UsinaRemota | null>(null);
  
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const handleCreate = async () => {
    if (!form.nome || !form.uc_geradora || !form.cnpj_titular || !form.distribuidora) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      await createUsina.mutateAsync({
        nome: form.nome,
        uc_geradora: form.uc_geradora,
        cnpj_titular: form.cnpj_titular,
        potencia_instalada_kw: parseFloat(form.potencia_instalada_kw) || 0,
        fonte: form.fonte,
        modalidade_gd: form.modalidade_gd,
        distribuidora: form.distribuidora,
        endereco: form.endereco || null,
        data_conexao: form.data_conexao || null,
        ativo: form.ativo,
      });
      toast({ title: 'Sucesso', description: 'Usina cadastrada com sucesso!' });
      setForm(emptyForm);
      setDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao criar usina', variant: 'destructive' });
    }
  };

  const handleEdit = (usina: UsinaRemota) => {
    setSelectedUsina(usina);
    setEditForm({
      nome: usina.nome,
      uc_geradora: usina.uc_geradora,
      cnpj_titular: usina.cnpj_titular,
      potencia_instalada_kw: usina.potencia_instalada_kw.toString(),
      fonte: usina.fonte,
      modalidade_gd: usina.modalidade_gd,
      distribuidora: usina.distribuidora,
      endereco: usina.endereco || '',
      data_conexao: usina.data_conexao || '',
      ativo: usina.ativo,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedUsina) return;

    if (!editForm.nome || !editForm.uc_geradora || !editForm.cnpj_titular || !editForm.distribuidora) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      await updateUsina.mutateAsync({
        id: selectedUsina.id,
        nome: editForm.nome,
        uc_geradora: editForm.uc_geradora,
        cnpj_titular: editForm.cnpj_titular,
        potencia_instalada_kw: parseFloat(editForm.potencia_instalada_kw) || 0,
        fonte: editForm.fonte,
        modalidade_gd: editForm.modalidade_gd,
        distribuidora: editForm.distribuidora,
        endereco: editForm.endereco || null,
        data_conexao: editForm.data_conexao || null,
        ativo: editForm.ativo,
      });
      toast({ title: 'Sucesso', description: 'Usina atualizada com sucesso!' });
      setEditDialogOpen(false);
      setSelectedUsina(null);
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao atualizar usina', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedUsina) return;

    try {
      await deleteUsina.mutateAsync(selectedUsina.id);
      toast({ title: 'Sucesso', description: 'Usina excluída com sucesso!' });
      setDeleteDialogOpen(false);
      setSelectedUsina(null);
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir usina. Verifique se não há vínculos ativos.', variant: 'destructive' });
    }
  };

  const UsinaForm = ({ formData, setFormData, onSubmit, isLoading, submitLabel }: {
    formData: typeof emptyForm;
    setFormData: (data: typeof emptyForm) => void;
    onSubmit: () => void;
    isLoading: boolean;
    submitLabel: string;
  }) => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome da Usina *</Label>
          <Input
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Solar Farm Goiânia I"
          />
        </div>
        <div className="space-y-2">
          <Label>UC Geradora *</Label>
          <Input
            value={formData.uc_geradora}
            onChange={(e) => setFormData({ ...formData, uc_geradora: e.target.value })}
            placeholder="0000000000"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CNPJ Titular *</Label>
          <Input
            value={formData.cnpj_titular}
            onChange={(e) => setFormData({ ...formData, cnpj_titular: e.target.value })}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <div className="space-y-2">
          <Label>Potência Instalada (kW)</Label>
          <Input
            type="number"
            value={formData.potencia_instalada_kw}
            onChange={(e) => setFormData({ ...formData, potencia_instalada_kw: e.target.value })}
            placeholder="500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fonte de Energia</Label>
          <Select 
            value={formData.fonte} 
            onValueChange={(value: FonteEnergia) => setFormData({ ...formData, fonte: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(fonteLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Modalidade GD (Lei 14300)</Label>
          <Select 
            value={formData.modalidade_gd} 
            onValueChange={(value: ModalidadeGD) => setFormData({ ...formData, modalidade_gd: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(modalidadeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Distribuidora *</Label>
          <Input
            value={formData.distribuidora}
            onChange={(e) => setFormData({ ...formData, distribuidora: e.target.value })}
            placeholder="Equatorial Goiás"
          />
        </div>
        <div className="space-y-2">
          <Label>Data de Conexão</Label>
          <Input
            type="date"
            value={formData.data_conexao}
            onChange={(e) => setFormData({ ...formData, data_conexao: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input
          value={formData.endereco}
          onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
          placeholder="Rua, número, cidade - UF"
        />
      </div>

      <Button onClick={onSubmit} disabled={isLoading} className="w-full">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {submitLabel}
      </Button>
    </div>
  );

  return (
    <DashboardLayout title="Usinas Remotas" subtitle="Gestão de usinas para compensação de créditos (Lei 14300)">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Usinas Cadastradas</h2>
            <p className="text-muted-foreground">Gerencie usinas remotas de geração distribuída</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Usina
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Usina Remota</DialogTitle>
              </DialogHeader>
              <UsinaForm
                formData={form}
                setFormData={setForm}
                onSubmit={handleCreate}
                isLoading={createUsina.isPending}
                submitLabel="Cadastrar Usina"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Usinas List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : usinas.length === 0 ? (
          <div className="bg-card rounded-xl border border-dashed border-border p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Sun className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <h3 className="font-medium text-foreground mb-1">Nenhuma usina cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre sua primeira usina remota para vincular aos clientes.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {usinas.map((usina) => {
              const FonteIcon = fonteIcons[usina.fonte];
              return (
                <div 
                  key={usina.id} 
                  className="bg-card rounded-xl border border-border p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <FonteIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{usina.nome}</h3>
                        <Badge variant={usina.ativo ? 'default' : 'secondary'}>
                          {usina.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Badge variant="outline">
                          {modalidadeLabels[usina.modalidade_gd]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        UC Geradora: {usina.uc_geradora} • CNPJ: {usina.cnpj_titular}
                      </p>
                      {usina.endereco && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {usina.endereco}
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Potência</p>
                          <p className="text-sm font-medium">{usina.potencia_instalada_kw} kW</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fonte</p>
                          <p className="text-sm font-medium">{fonteLabels[usina.fonte]}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Distribuidora</p>
                          <p className="text-sm font-medium">{usina.distribuidora}</p>
                        </div>
                        {usina.data_conexao && (
                          <div>
                            <p className="text-xs text-muted-foreground">Conexão</p>
                            <p className="text-sm font-medium">
                              {new Date(usina.data_conexao).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(usina)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedUsina(usina);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Usina Remota</DialogTitle>
            </DialogHeader>
            <UsinaForm
              formData={editForm}
              setFormData={setEditForm}
              onSubmit={handleUpdate}
              isLoading={updateUsina.isPending}
              submitLabel="Salvar Alterações"
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a usina "{selectedUsina?.nome}"? 
                Esta ação não pode ser desfeita e removerá todos os vínculos associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                {deleteUsina.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
