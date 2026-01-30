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
import { useEnergy } from '@/contexts/EnergyContext';
import { useCreateCliente, useUpdateCliente, Cliente } from '@/hooks/useClientes';
import { useCreateUnidadeConsumidora, useUpdateUnidadeConsumidora, UnidadeConsumidora } from '@/hooks/useUnidadesConsumidoras';
import { useUsinasRemotas } from '@/hooks/useUsinasRemotas';
import { useVinculosByCliente, useCreateVinculo, useUpdateVinculo, useDeleteVinculo, ClienteUsinaVinculoWithRelations, ModalidadeEconomia, ReferenciaDesconto } from '@/hooks/useClienteUsinaVinculo';
import { useConcessionariasComTarifas } from '@/hooks/useTarifas';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, MapPin, Zap, Loader2, Pencil, Factory, Sun, Link2, Trash2, DollarSign, Percent } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { clienteSchema, clienteUsinaVinculoSchema, formatCNPJ, formatPhone } from '@/lib/validation';
import { z } from 'zod';
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

const modalidadeLabels: Record<string, string> = {
  autoconsumo_remoto: 'Autoconsumo Remoto',
  geracao_compartilhada: 'Geração Compartilhada',
  consorcio: 'Consórcio',
  cooperativa: 'Cooperativa',
};

const modalidadeEconomiaLabels: Record<ModalidadeEconomia, string> = {
  ppa_tarifa: 'PPA - Tarifa Diferenciada',
  desconto_fatura_global: 'Desconto sobre Fatura Global',
};

const referenciaDescontoLabels: Record<ReferenciaDesconto, string> = {
  valor_total: 'Valor Total da Fatura',
  te_tusd: 'TE + TUSD',
  apenas_te: 'Apenas TE',
};

export default function Clientes() {
  const { clientes, unidadesConsumidoras, clienteId, setClienteId, refetchAll } = useEnergy();
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();
  const createUC = useCreateUnidadeConsumidora();
  const updateUC = useUpdateUnidadeConsumidora();
  const { data: usinas = [] } = useUsinasRemotas();
  const { data: vinculos = [], refetch: refetchVinculos } = useVinculosByCliente(clienteId);
  const { data: concessionarias = [], isLoading: loadingConcessionarias } = useConcessionariasComTarifas();
  const createVinculo = useCreateVinculo();
  const updateVinculo = useUpdateVinculo();
  const deleteVinculo = useDeleteVinculo();
  const { toast } = useToast();

  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ucDialogOpen, setUcDialogOpen] = useState(false);
  const [editUCDialogOpen, setEditUCDialogOpen] = useState(false);
  const [vinculoDialogOpen, setVinculoDialogOpen] = useState(false);
  const [editVinculoDialogOpen, setEditVinculoDialogOpen] = useState(false);
  const [deleteVinculoDialogOpen, setDeleteVinculoDialogOpen] = useState(false);
  const [selectedVinculo, setSelectedVinculo] = useState<ClienteUsinaVinculoWithRelations | null>(null);

  // Edit Vinculo form
  const [editVinculo, setEditVinculo] = useState<{
    id: string;
    usina_id: string;
    uc_beneficiaria_id: string;
    percentual_rateio: string;
    energia_contratada_kwh: string;
    desconto_garantido_percent: string;
    numero_contrato: string;
    data_inicio_contrato: string;
    data_fim_contrato: string;
    ativo: boolean;
    modalidade_economia: ModalidadeEconomia;
    tarifa_ppa_rs_kwh: string;
    referencia_desconto: ReferenciaDesconto;
  } | null>(null);

  // New cliente form
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
  });

  // Edit cliente form
  const [editCliente, setEditCliente] = useState<{
    id: string;
    nome: string;
    cnpj: string;
    email: string;
    telefone: string;
  } | null>(null);

  // New UC form
  const [novaUC, setNovaUC] = useState({
    numero: '',
    endereco: '',
    distribuidora: '',
    modalidade_tarifaria: 'verde' as 'convencional' | 'branca' | 'verde' | 'azul',
    demanda_contratada: '',
  });

  // Edit UC form
  const [editUC, setEditUC] = useState<{
    id: string;
    numero: string;
    endereco: string;
    distribuidora: string;
    modalidade_tarifaria: 'convencional' | 'branca' | 'verde' | 'azul';
    demanda_contratada: string;
  } | null>(null);

  // New Vinculo form
  const [novoVinculo, setNovoVinculo] = useState({
    usina_id: '',
    uc_beneficiaria_id: '',
    percentual_rateio: '',
    energia_contratada_kwh: '',
    desconto_garantido_percent: '',
    numero_contrato: '',
    data_inicio_contrato: '',
    modalidade_economia: 'desconto_fatura_global' as ModalidadeEconomia,
    tarifa_ppa_rs_kwh: '',
    referencia_desconto: 'valor_total' as ReferenciaDesconto,
  });

  const handleCreateCliente = async () => {
    try {
      // Validate with Zod schema
      const validatedData = clienteSchema.parse({
        nome: novoCliente.nome,
        cnpj: novoCliente.cnpj,
        email: novoCliente.email,
        telefone: novoCliente.telefone || null,
      });

      await createCliente.mutateAsync({
        nome: validatedData.nome,
        cnpj: formatCNPJ(validatedData.cnpj), // Store formatted
        email: validatedData.email,
        telefone: validatedData.telefone || null,
      });
      toast({ title: 'Sucesso', description: 'Cliente criado com sucesso!' });
      setNovoCliente({ nome: '', cnpj: '', email: '', telefone: '' });
      setClienteDialogOpen(false);
      refetchAll();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Erro de validação', description: error.errors[0].message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Erro', description: 'Falha ao criar cliente', variant: 'destructive' });
    }
  };

  const handleEditCliente = (cliente: Cliente) => {
    setEditCliente({
      id: cliente.id,
      nome: cliente.nome,
      cnpj: cliente.cnpj,
      email: cliente.email,
      telefone: cliente.telefone || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateCliente = async () => {
    if (!editCliente) return;
    
    try {
      // Validate with Zod schema
      const validatedData = clienteSchema.parse({
        nome: editCliente.nome,
        cnpj: editCliente.cnpj,
        email: editCliente.email,
        telefone: editCliente.telefone || null,
      });

      await updateCliente.mutateAsync({
        id: editCliente.id,
        nome: validatedData.nome,
        cnpj: formatCNPJ(validatedData.cnpj),
        email: validatedData.email,
        telefone: validatedData.telefone || null,
      });
      toast({ title: 'Sucesso', description: 'Cliente atualizado com sucesso!' });
      setEditDialogOpen(false);
      setEditCliente(null);
      refetchAll();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Erro de validação', description: error.errors[0].message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Erro', description: 'Falha ao atualizar cliente', variant: 'destructive' });
    }
  };

  const handleCreateUC = async () => {
    if (!clienteId) {
      toast({ title: 'Erro', description: 'Selecione um cliente primeiro', variant: 'destructive' });
      return;
    }

    if (!novaUC.numero || !novaUC.endereco || !novaUC.distribuidora) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      await createUC.mutateAsync({
        cliente_id: clienteId,
        numero: novaUC.numero,
        endereco: novaUC.endereco,
        distribuidora: novaUC.distribuidora,
        concessionaria: novaUC.distribuidora, // Sincronizar com distribuidora
        modalidade_tarifaria: novaUC.modalidade_tarifaria,
        demanda_contratada: parseFloat(novaUC.demanda_contratada) || 0,
      });
      toast({ title: 'Sucesso', description: 'Unidade consumidora criada com sucesso!' });
      setNovaUC({ numero: '', endereco: '', distribuidora: '', modalidade_tarifaria: 'verde', demanda_contratada: '' });
      setUcDialogOpen(false);
      refetchAll();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao criar unidade consumidora', variant: 'destructive' });
    }
  };

  const handleEditUC = (uc: UnidadeConsumidora) => {
    setEditUC({
      id: uc.id,
      numero: uc.numero,
      endereco: uc.endereco,
      distribuidora: uc.distribuidora,
      modalidade_tarifaria: uc.modalidade_tarifaria as 'convencional' | 'branca' | 'verde' | 'azul',
      demanda_contratada: String(uc.demanda_contratada),
    });
    setEditUCDialogOpen(true);
  };

  const handleUpdateUC = async () => {
    if (!editUC) return;
    
    if (!editUC.numero || !editUC.endereco || !editUC.distribuidora) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      await updateUC.mutateAsync({
        id: editUC.id,
        numero: editUC.numero,
        endereco: editUC.endereco,
        distribuidora: editUC.distribuidora,
        concessionaria: editUC.distribuidora, // Sincronizar com distribuidora
        modalidade_tarifaria: editUC.modalidade_tarifaria,
        demanda_contratada: parseFloat(editUC.demanda_contratada) || 0,
      });
      toast({ title: 'Sucesso', description: 'Unidade consumidora atualizada com sucesso!' });
      setEditUCDialogOpen(false);
      setEditUC(null);
      refetchAll();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao atualizar unidade consumidora', variant: 'destructive' });
    }
  };

  const handleCreateVinculo = async () => {
    if (!clienteId) {
      toast({ title: 'Erro', description: 'Selecione um cliente primeiro', variant: 'destructive' });
      return;
    }

    if (!novoVinculo.usina_id || !novoVinculo.uc_beneficiaria_id) {
      toast({ title: 'Erro', description: 'Selecione a usina e a UC beneficiária', variant: 'destructive' });
      return;
    }

    try {
      // Validate with Zod schema
      const validatedData = clienteUsinaVinculoSchema.parse({
        percentual_rateio: parseFloat(novoVinculo.percentual_rateio) || 0,
        energia_contratada_kwh: parseFloat(novoVinculo.energia_contratada_kwh) || 0,
        desconto_garantido_percent: parseFloat(novoVinculo.desconto_garantido_percent) || 0,
        tarifa_ppa_rs_kwh: parseFloat(novoVinculo.tarifa_ppa_rs_kwh) || 0,
        numero_contrato: novoVinculo.numero_contrato || null,
        data_inicio_contrato: novoVinculo.data_inicio_contrato || null,
        data_fim_contrato: null,
        ativo: true,
      });

      await createVinculo.mutateAsync({
        cliente_id: clienteId,
        usina_id: novoVinculo.usina_id,
        uc_beneficiaria_id: novoVinculo.uc_beneficiaria_id,
        percentual_rateio: validatedData.percentual_rateio,
        energia_contratada_kwh: validatedData.energia_contratada_kwh,
        desconto_garantido_percent: validatedData.desconto_garantido_percent,
        numero_contrato: validatedData.numero_contrato,
        data_inicio_contrato: validatedData.data_inicio_contrato,
        data_fim_contrato: null,
        ativo: true,
        modalidade_economia: novoVinculo.modalidade_economia,
        tarifa_ppa_rs_kwh: validatedData.tarifa_ppa_rs_kwh,
        referencia_desconto: novoVinculo.referencia_desconto,
      });
      toast({ title: 'Sucesso', description: 'Vínculo com usina criado com sucesso!' });
      setNovoVinculo({
        usina_id: '',
        uc_beneficiaria_id: '',
        percentual_rateio: '',
        energia_contratada_kwh: '',
        desconto_garantido_percent: '',
        numero_contrato: '',
        data_inicio_contrato: '',
        modalidade_economia: 'desconto_fatura_global',
        tarifa_ppa_rs_kwh: '',
        referencia_desconto: 'valor_total',
      });
      setVinculoDialogOpen(false);
      refetchVinculos();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Erro de validação', description: error.errors[0].message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Erro', description: 'Falha ao criar vínculo. Verifique se já não existe.', variant: 'destructive' });
    }
  };

  const handleEditVinculo = (vinculo: ClienteUsinaVinculoWithRelations) => {
    setEditVinculo({
      id: vinculo.id,
      usina_id: vinculo.usina_id,
      uc_beneficiaria_id: vinculo.uc_beneficiaria_id,
      percentual_rateio: String(vinculo.percentual_rateio),
      energia_contratada_kwh: String(vinculo.energia_contratada_kwh),
      desconto_garantido_percent: String(vinculo.desconto_garantido_percent),
      numero_contrato: vinculo.numero_contrato || '',
      data_inicio_contrato: vinculo.data_inicio_contrato || '',
      data_fim_contrato: vinculo.data_fim_contrato || '',
      ativo: vinculo.ativo,
      modalidade_economia: vinculo.modalidade_economia,
      tarifa_ppa_rs_kwh: String(vinculo.tarifa_ppa_rs_kwh),
      referencia_desconto: vinculo.referencia_desconto,
    });
    setEditVinculoDialogOpen(true);
  };

  const handleUpdateVinculo = async () => {
    if (!editVinculo) return;

    try {
      // Validate with Zod schema
      const validatedData = clienteUsinaVinculoSchema.parse({
        percentual_rateio: parseFloat(editVinculo.percentual_rateio) || 0,
        energia_contratada_kwh: parseFloat(editVinculo.energia_contratada_kwh) || 0,
        desconto_garantido_percent: parseFloat(editVinculo.desconto_garantido_percent) || 0,
        tarifa_ppa_rs_kwh: parseFloat(editVinculo.tarifa_ppa_rs_kwh) || 0,
        numero_contrato: editVinculo.numero_contrato || null,
        data_inicio_contrato: editVinculo.data_inicio_contrato || null,
        data_fim_contrato: editVinculo.data_fim_contrato || null,
        ativo: editVinculo.ativo,
      });

      await updateVinculo.mutateAsync({
        id: editVinculo.id,
        usina_id: editVinculo.usina_id,
        uc_beneficiaria_id: editVinculo.uc_beneficiaria_id,
        percentual_rateio: validatedData.percentual_rateio,
        energia_contratada_kwh: validatedData.energia_contratada_kwh,
        desconto_garantido_percent: validatedData.desconto_garantido_percent,
        numero_contrato: validatedData.numero_contrato,
        data_inicio_contrato: validatedData.data_inicio_contrato,
        data_fim_contrato: validatedData.data_fim_contrato,
        ativo: validatedData.ativo,
        modalidade_economia: editVinculo.modalidade_economia,
        tarifa_ppa_rs_kwh: validatedData.tarifa_ppa_rs_kwh,
        referencia_desconto: editVinculo.referencia_desconto,
      });
      toast({ title: 'Sucesso', description: 'Vínculo atualizado com sucesso!' });
      setEditVinculoDialogOpen(false);
      setEditVinculo(null);
      refetchVinculos();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Erro de validação', description: error.errors[0].message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Erro', description: 'Falha ao atualizar vínculo', variant: 'destructive' });
    }
  };

  const handleDeleteVinculo = async () => {
    if (!selectedVinculo) return;

    try {
      await deleteVinculo.mutateAsync(selectedVinculo.id);
      toast({ title: 'Sucesso', description: 'Vínculo removido com sucesso!' });
      setDeleteVinculoDialogOpen(false);
      setSelectedVinculo(null);
      refetchVinculos();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao remover vínculo', variant: 'destructive' });
    }
  };

  const clienteAtual = clientes.find(c => c.id === clienteId);
  const hasVinculos = vinculos.length > 0;

  return (
    <DashboardLayout title="Clientes" subtitle="Gerenciamento de clientes e unidades consumidoras">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Clientes Cadastrados</h2>
            <p className="text-muted-foreground">Gerencie clientes e suas unidades consumidoras</p>
          </div>
          <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input
                    value={novoCliente.cnpj}
                    onChange={(e) => setNovoCliente({ ...novoCliente, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={novoCliente.email}
                    onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <Button onClick={handleCreateCliente} disabled={createCliente.isPending} className="w-full">
                  {createCliente.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar Cliente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Cliente Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            {editCliente && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={editCliente.nome}
                    onChange={(e) => setEditCliente({ ...editCliente, nome: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input
                    value={editCliente.cnpj}
                    onChange={(e) => setEditCliente({ ...editCliente, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={editCliente.email}
                    onChange={(e) => setEditCliente({ ...editCliente, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={editCliente.telefone}
                    onChange={(e) => setEditCliente({ ...editCliente, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <Button onClick={handleUpdateCliente} disabled={updateCliente.isPending} className="w-full">
                  {updateCliente.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit UC Dialog */}
        <Dialog open={editUCDialogOpen} onOpenChange={setEditUCDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Unidade Consumidora</DialogTitle>
            </DialogHeader>
            {editUC && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Número da UC *</Label>
                  <Input
                    value={editUC.numero}
                    onChange={(e) => setEditUC({ ...editUC, numero: e.target.value })}
                    placeholder="0000000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endereço *</Label>
                  <Input
                    value={editUC.endereco}
                    onChange={(e) => setEditUC({ ...editUC, endereco: e.target.value })}
                    placeholder="Rua, número, cidade - UF"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Distribuidora/Concessionária *</Label>
                  <Select 
                    value={editUC.distribuidora} 
                    onValueChange={(value) => setEditUC({ ...editUC, distribuidora: value })}
                    disabled={loadingConcessionarias}
                  >
                    <SelectTrigger>
                      {loadingConcessionarias ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando...
                        </span>
                      ) : (
                        <SelectValue placeholder="Selecione a concessionária" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {concessionarias.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                      {concessionarias.length === 0 && !loadingConcessionarias && (
                        <SelectItem value="" disabled>Nenhuma tarifa cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modalidade Tarifária</Label>
                  <Select 
                    value={editUC.modalidade_tarifaria} 
                    onValueChange={(value: 'convencional' | 'branca' | 'verde' | 'azul') => 
                      setEditUC({ ...editUC, modalidade_tarifaria: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="convencional">Convencional</SelectItem>
                      <SelectItem value="branca">Branca</SelectItem>
                      <SelectItem value="verde">Verde</SelectItem>
                      <SelectItem value="azul">Azul</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Demanda Contratada (kW)</Label>
                  <Input
                    type="number"
                    value={editUC.demanda_contratada}
                    onChange={(e) => setEditUC({ ...editUC, demanda_contratada: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <Button onClick={handleUpdateUC} disabled={updateUC.isPending} className="w-full">
                  {updateUC.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Clients List */}
        {clientes.length === 0 ? (
          <div className="bg-card rounded-xl border border-dashed border-border p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <h3 className="font-medium text-foreground mb-1">Nenhum cliente cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre seu primeiro cliente para começar.
            </p>
          </div>
        ) : (
          clientes.map((cliente) => (
            <div 
              key={cliente.id} 
              className={`bg-card rounded-xl border p-6 cursor-pointer transition-colors ${
                cliente.id === clienteId ? 'border-primary' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setClienteId(cliente.id)}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{cliente.nome}</h3>
                    {cliente.id === clienteId && hasVinculos && (
                      <Badge variant="outline" className="gap-1">
                        <Factory className="h-3 w-3" />
                        Usina Remota
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">CNPJ: {cliente.cnpj}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{cliente.email}</span>
                    {cliente.telefone && (
                      <>
                        <span>•</span>
                        <span>{cliente.telefone}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCliente(cliente);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              {/* Content for selected client */}
              {cliente.id === clienteId && (
                <div className="mt-6 border-t border-border pt-6 space-y-6">
                  {/* UCs Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Unidades Consumidoras</h4>
                      <Dialog open={ucDialogOpen} onOpenChange={setUcDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nova UC
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Nova Unidade Consumidora</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label>Número da UC *</Label>
                              <Input
                                value={novaUC.numero}
                                onChange={(e) => setNovaUC({ ...novaUC, numero: e.target.value })}
                                placeholder="0000000000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Endereço *</Label>
                              <Input
                                value={novaUC.endereco}
                                onChange={(e) => setNovaUC({ ...novaUC, endereco: e.target.value })}
                                placeholder="Rua, número, cidade - UF"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Distribuidora/Concessionária *</Label>
                              <Select 
                                value={novaUC.distribuidora} 
                                onValueChange={(value) => setNovaUC({ ...novaUC, distribuidora: value })}
                                disabled={loadingConcessionarias}
                              >
                                <SelectTrigger>
                                  {loadingConcessionarias ? (
                                    <span className="flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Carregando...
                                    </span>
                                  ) : (
                                    <SelectValue placeholder="Selecione a concessionária" />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  {concessionarias.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                  {concessionarias.length === 0 && !loadingConcessionarias && (
                                    <SelectItem value="" disabled>Nenhuma tarifa cadastrada</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Modalidade Tarifária</Label>
                              <Select 
                                value={novaUC.modalidade_tarifaria} 
                                onValueChange={(value: 'convencional' | 'branca' | 'verde' | 'azul') => 
                                  setNovaUC({ ...novaUC, modalidade_tarifaria: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="convencional">Convencional</SelectItem>
                                  <SelectItem value="branca">Branca</SelectItem>
                                  <SelectItem value="verde">Verde</SelectItem>
                                  <SelectItem value="azul">Azul</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Demanda Contratada (kW)</Label>
                              <Input
                                type="number"
                                value={novaUC.demanda_contratada}
                                onChange={(e) => setNovaUC({ ...novaUC, demanda_contratada: e.target.value })}
                                placeholder="500"
                              />
                            </div>
                            <Button onClick={handleCreateUC} disabled={createUC.isPending} className="w-full">
                              {createUC.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Criar UC
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {unidadesConsumidoras.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        Nenhuma unidade consumidora cadastrada para este cliente.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {unidadesConsumidoras.map((uc) => (
                          <div key={uc.id} className="bg-muted rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                                <Zap className="h-5 w-5 text-accent" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{uc.numero}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {uc.endereco}
                                </div>
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Distribuidora</p>
                                    <p className="text-sm font-medium">{uc.distribuidora}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Modalidade</p>
                                    <p className="text-sm font-medium capitalize">{uc.modalidade_tarifaria}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Demanda Contratada</p>
                                    <p className="text-sm font-medium">{uc.demanda_contratada} kW</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                                      Ativo
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditUC(uc);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Usinas Vinculadas Section */}
                  <div className="border-t border-border pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Factory className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Usinas Remotas Vinculadas</h4>
                        <Badge variant="secondary" className="text-xs">Lei 14300</Badge>
                      </div>
                      <Dialog open={vinculoDialogOpen} onOpenChange={setVinculoDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2" disabled={usinas.length === 0 || unidadesConsumidoras.length === 0}>
                            <Link2 className="h-4 w-4" />
                            Vincular Usina
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Vincular Usina Remota</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label>Usina Geradora *</Label>
                              <Select 
                                value={novoVinculo.usina_id} 
                                onValueChange={(value) => setNovoVinculo({ ...novoVinculo, usina_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a usina" />
                                </SelectTrigger>
                                <SelectContent>
                                  {usinas.filter(u => u.ativo).map((usina) => (
                                    <SelectItem key={usina.id} value={usina.id}>
                                      {usina.nome} ({usina.uc_geradora})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>UC Beneficiária *</Label>
                              <Select 
                                value={novoVinculo.uc_beneficiaria_id} 
                                onValueChange={(value) => setNovoVinculo({ ...novoVinculo, uc_beneficiaria_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a UC" />
                                </SelectTrigger>
                                <SelectContent>
                                  {unidadesConsumidoras.map((uc) => (
                                    <SelectItem key={uc.id} value={uc.id}>
                                      {uc.numero} - {uc.endereco}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>% Rateio</Label>
                                <Input
                                  type="number"
                                  value={novoVinculo.percentual_rateio}
                                  onChange={(e) => setNovoVinculo({ ...novoVinculo, percentual_rateio: e.target.value })}
                                  placeholder="10"
                                  min="0"
                                  max="100"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Energia Contratada (kWh)</Label>
                                <Input
                                  type="number"
                                  value={novoVinculo.energia_contratada_kwh}
                                  onChange={(e) => setNovoVinculo({ ...novoVinculo, energia_contratada_kwh: e.target.value })}
                                  placeholder="5000"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Desconto Garantido (%)</Label>
                                <Input
                                  type="number"
                                  value={novoVinculo.desconto_garantido_percent}
                                  onChange={(e) => setNovoVinculo({ ...novoVinculo, desconto_garantido_percent: e.target.value })}
                                  placeholder="15"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Início Contrato</Label>
                                <Input
                                  type="date"
                                  value={novoVinculo.data_inicio_contrato}
                                  onChange={(e) => setNovoVinculo({ ...novoVinculo, data_inicio_contrato: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Número do Contrato</Label>
                              <Input
                                value={novoVinculo.numero_contrato}
                                onChange={(e) => setNovoVinculo({ ...novoVinculo, numero_contrato: e.target.value })}
                                placeholder="CONT-2024-001"
                              />
                            </div>
                            
                            {/* Modalidade de Economia */}
                            <div className="border-t border-border pt-4 mt-4">
                              <Label className="text-base font-semibold flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Modalidade de Economia
                              </Label>
                              <p className="text-sm text-muted-foreground mb-4">
                                Defina como a economia do cliente será calculada
                              </p>
                              
                              <RadioGroup
                                value={novoVinculo.modalidade_economia}
                                onValueChange={(value: ModalidadeEconomia) => setNovoVinculo({ ...novoVinculo, modalidade_economia: value })}
                                className="space-y-3"
                              >
                                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                                  <RadioGroupItem value="ppa_tarifa" id="ppa_tarifa" className="mt-1" />
                                  <div className="flex-1">
                                    <Label htmlFor="ppa_tarifa" className="cursor-pointer font-medium">
                                      PPA - Tarifa Diferenciada
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Economia = (Tarifa Concessionária - Tarifa PPA) × kWh recebidos
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                                  <RadioGroupItem value="desconto_fatura_global" id="desconto_fatura_global" className="mt-1" />
                                  <div className="flex-1">
                                    <Label htmlFor="desconto_fatura_global" className="cursor-pointer font-medium">
                                      Desconto sobre Fatura Global
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Economia = Valor Base × % Desconto Garantido
                                    </p>
                                  </div>
                                </div>
                              </RadioGroup>

                              {/* Campos condicionais por modalidade */}
                              {novoVinculo.modalidade_economia === 'ppa_tarifa' && (
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                                  <div className="space-y-2">
                                    <Label>Tarifa PPA (R$/kWh)</Label>
                                    <Input
                                      type="number"
                                      step="0.0001"
                                      value={novoVinculo.tarifa_ppa_rs_kwh}
                                      onChange={(e) => setNovoVinculo({ ...novoVinculo, tarifa_ppa_rs_kwh: e.target.value })}
                                      placeholder="0.45"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Valor que o cliente paga por kWh no contrato PPA
                                    </p>
                                  </div>
                                </div>
                              )}

                              {novoVinculo.modalidade_economia === 'desconto_fatura_global' && (
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                                  <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                      <Percent className="h-4 w-4" />
                                      Referência do Desconto
                                    </Label>
                                    <Select
                                      value={novoVinculo.referencia_desconto}
                                      onValueChange={(value: ReferenciaDesconto) => setNovoVinculo({ ...novoVinculo, referencia_desconto: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="valor_total">Valor Total da Fatura</SelectItem>
                                        <SelectItem value="te_tusd">TE + TUSD</SelectItem>
                                        <SelectItem value="apenas_te">Apenas TE</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                      Base de cálculo sobre a qual o desconto será aplicado
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <Button onClick={handleCreateVinculo} disabled={createVinculo.isPending} className="w-full">
                              {createVinculo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Vincular Usina
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {usinas.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4 bg-muted/50 rounded-lg">
                        <Factory className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma usina cadastrada no sistema.</p>
                        <p className="text-sm">Acesse "Usinas Remotas" para cadastrar.</p>
                      </div>
                    ) : vinculos.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        Este cliente não possui vínculos com usinas remotas.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {vinculos.map((vinculo) => (
                          <div key={vinculo.id} className="bg-muted rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                                <Sun className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium">{vinculo.usinas_remotas.nome}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {modalidadeLabels[vinculo.usinas_remotas.modalidade_gd] || vinculo.usinas_remotas.modalidade_gd}
                                  </Badge>
                                  {/* Badge de Modalidade de Economia */}
                                  <Badge 
                                    variant={vinculo.modalidade_economia === 'ppa_tarifa' ? 'default' : 'secondary'}
                                    className="text-xs gap-1"
                                  >
                                    {vinculo.modalidade_economia === 'ppa_tarifa' ? (
                                      <>
                                        <DollarSign className="h-3 w-3" />
                                        PPA: R$ {vinculo.tarifa_ppa_rs_kwh.toFixed(4)}/kWh
                                      </>
                                    ) : (
                                      <>
                                        <Percent className="h-3 w-3" />
                                        {vinculo.desconto_garantido_percent}% sobre {referenciaDescontoLabels[vinculo.referencia_desconto]}
                                      </>
                                    )}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  UC Geradora: {vinculo.usinas_remotas.uc_geradora} → UC Beneficiária: {vinculo.unidades_consumidoras.numero}
                                </p>
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Rateio</p>
                                    <p className="text-sm font-medium">{vinculo.percentual_rateio}%</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Energia</p>
                                    <p className="text-sm font-medium">{vinculo.energia_contratada_kwh.toLocaleString()} kWh</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Modalidade</p>
                                    <p className="text-sm font-medium">
                                      {modalidadeEconomiaLabels[vinculo.modalidade_economia]}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Contrato</p>
                                    <p className="text-sm font-medium">{vinculo.numero_contrato || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <Badge variant={vinculo.ativo ? 'default' : 'secondary'} className="text-xs">
                                      {vinculo.ativo ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditVinculo(vinculo);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVinculo(vinculo);
                                    setDeleteVinculoDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Edit Vinculo Dialog */}
        <Dialog open={editVinculoDialogOpen} onOpenChange={setEditVinculoDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Vínculo</DialogTitle>
            </DialogHeader>
            {editVinculo && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Usina Geradora *</Label>
                  <Select 
                    value={editVinculo.usina_id} 
                    onValueChange={(value) => setEditVinculo({ ...editVinculo, usina_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a usina" />
                    </SelectTrigger>
                    <SelectContent>
                      {usinas.filter(u => u.ativo).map((usina) => (
                        <SelectItem key={usina.id} value={usina.id}>
                          {usina.nome} ({usina.uc_geradora})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>UC Beneficiária *</Label>
                  <Select 
                    value={editVinculo.uc_beneficiaria_id} 
                    onValueChange={(value) => setEditVinculo({ ...editVinculo, uc_beneficiaria_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a UC" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesConsumidoras.map((uc) => (
                        <SelectItem key={uc.id} value={uc.id}>
                          {uc.numero} - {uc.endereco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>% Rateio</Label>
                    <Input
                      type="number"
                      value={editVinculo.percentual_rateio}
                      onChange={(e) => setEditVinculo({ ...editVinculo, percentual_rateio: e.target.value })}
                      placeholder="10"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Energia Contratada (kWh)</Label>
                    <Input
                      type="number"
                      value={editVinculo.energia_contratada_kwh}
                      onChange={(e) => setEditVinculo({ ...editVinculo, energia_contratada_kwh: e.target.value })}
                      placeholder="5000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Desconto Garantido (%)</Label>
                    <Input
                      type="number"
                      value={editVinculo.desconto_garantido_percent}
                      onChange={(e) => setEditVinculo({ ...editVinculo, desconto_garantido_percent: e.target.value })}
                      placeholder="15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Início Contrato</Label>
                    <Input
                      type="date"
                      value={editVinculo.data_inicio_contrato}
                      onChange={(e) => setEditVinculo({ ...editVinculo, data_inicio_contrato: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fim Contrato</Label>
                    <Input
                      type="date"
                      value={editVinculo.data_fim_contrato}
                      onChange={(e) => setEditVinculo({ ...editVinculo, data_fim_contrato: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número do Contrato</Label>
                    <Input
                      value={editVinculo.numero_contrato}
                      onChange={(e) => setEditVinculo({ ...editVinculo, numero_contrato: e.target.value })}
                      placeholder="CONT-2024-001"
                    />
                  </div>
                </div>

                {/* Status do vínculo */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    id="vinculo-ativo"
                    checked={editVinculo.ativo}
                    onChange={(e) => setEditVinculo({ ...editVinculo, ativo: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="vinculo-ativo" className="cursor-pointer">
                    Vínculo Ativo
                  </Label>
                </div>
                
                {/* Modalidade de Economia */}
                <div className="border-t border-border pt-4 mt-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Modalidade de Economia
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Defina como a economia do cliente será calculada
                  </p>
                  
                  <RadioGroup
                    value={editVinculo.modalidade_economia}
                    onValueChange={(value: ModalidadeEconomia) => setEditVinculo({ ...editVinculo, modalidade_economia: value })}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="ppa_tarifa" id="edit_ppa_tarifa" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="edit_ppa_tarifa" className="cursor-pointer font-medium">
                          PPA - Tarifa Diferenciada
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Economia = (Tarifa Concessionária - Tarifa PPA) × kWh recebidos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="desconto_fatura_global" id="edit_desconto_fatura_global" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="edit_desconto_fatura_global" className="cursor-pointer font-medium">
                          Desconto sobre Fatura Global
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Economia = Valor Base × % Desconto Garantido
                        </p>
                      </div>
                    </div>
                  </RadioGroup>

                  {/* Campos condicionais por modalidade */}
                  {editVinculo.modalidade_economia === 'ppa_tarifa' && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                      <div className="space-y-2">
                        <Label>Tarifa PPA (R$/kWh)</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={editVinculo.tarifa_ppa_rs_kwh}
                          onChange={(e) => setEditVinculo({ ...editVinculo, tarifa_ppa_rs_kwh: e.target.value })}
                          placeholder="0.45"
                        />
                        <p className="text-xs text-muted-foreground">
                          Valor que o cliente paga por kWh no contrato PPA
                        </p>
                      </div>
                    </div>
                  )}

                  {editVinculo.modalidade_economia === 'desconto_fatura_global' && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Referência do Desconto
                        </Label>
                        <Select
                          value={editVinculo.referencia_desconto}
                          onValueChange={(value: ReferenciaDesconto) => setEditVinculo({ ...editVinculo, referencia_desconto: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="valor_total">Valor Total da Fatura</SelectItem>
                            <SelectItem value="te_tusd">TE + TUSD</SelectItem>
                            <SelectItem value="apenas_te">Apenas TE</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Base de cálculo sobre a qual o desconto será aplicado
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button onClick={handleUpdateVinculo} disabled={updateVinculo.isPending} className="w-full">
                  {updateVinculo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Vinculo Confirmation */}
        <AlertDialog open={deleteVinculoDialogOpen} onOpenChange={setDeleteVinculoDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover vínculo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o vínculo com a usina "{selectedVinculo?.usinas_remotas.nome}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteVinculo} className="bg-destructive text-destructive-foreground">
                {deleteVinculo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
