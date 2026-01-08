import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useCreateCliente } from '@/hooks/useClientes';
import { useCreateUnidadeConsumidora } from '@/hooks/useUnidadesConsumidoras';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, MapPin, Zap, Loader2 } from 'lucide-react';

export default function Clientes() {
  const { clientes, unidadesConsumidoras, clienteId, setClienteId, refetchAll } = useEnergy();
  const createCliente = useCreateCliente();
  const createUC = useCreateUnidadeConsumidora();
  const { toast } = useToast();

  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [ucDialogOpen, setUcDialogOpen] = useState(false);

  // New cliente form
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
  });

  // New UC form
  const [novaUC, setNovaUC] = useState({
    numero: '',
    endereco: '',
    distribuidora: '',
    modalidade_tarifaria: 'verde' as 'convencional' | 'branca' | 'verde' | 'azul',
    demanda_contratada: '',
  });

  const handleCreateCliente = async () => {
    if (!novoCliente.nome || !novoCliente.cnpj || !novoCliente.email) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      await createCliente.mutateAsync({
        nome: novoCliente.nome,
        cnpj: novoCliente.cnpj,
        email: novoCliente.email,
        telefone: novoCliente.telefone || null,
      });
      toast({ title: 'Sucesso', description: 'Cliente criado com sucesso!' });
      setNovoCliente({ nome: '', cnpj: '', email: '', telefone: '' });
      setClienteDialogOpen(false);
      refetchAll();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao criar cliente', variant: 'destructive' });
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

  const clienteAtual = clientes.find(c => c.id === clienteId);

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
                  <h3 className="text-lg font-semibold">{cliente.nome}</h3>
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
              </div>

              {/* UCs for this client */}
              {cliente.id === clienteId && (
                <div className="mt-6 border-t border-border pt-6">
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
                            <Label>Distribuidora *</Label>
                            <Input
                              value={novaUC.distribuidora}
                              onChange={(e) => setNovaUC({ ...novaUC, distribuidora: e.target.value })}
                              placeholder="CEMIG, CPFL, etc."
                            />
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
