import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useEnergy } from '@/contexts/EnergyContext';
import { formatCurrency } from '@/data/mockData';
import { Building2, Plus, MapPin, Zap } from 'lucide-react';

export default function Clientes() {
  const { cliente, unidadeConsumidora } = useEnergy();

  return (
    <DashboardLayout title="Clientes" subtitle="Gerenciamento de clientes e unidades consumidoras">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Clientes Cadastrados</h2>
            <p className="text-muted-foreground">Gerencie clientes e suas unidades consumidoras</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Client Card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{cliente.nome}</h3>
              <p className="text-sm text-muted-foreground">CNPJ: {cliente.cnpj}</p>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{cliente.email}</span>
                <span>•</span>
                <span>{cliente.telefone}</span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Editar
            </Button>
          </div>

          {/* Units */}
          <div className="mt-6 border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Unidades Consumidoras</h4>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova UC
              </Button>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{unidadeConsumidora.numero}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {unidadeConsumidora.endereco}
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Distribuidora</p>
                      <p className="text-sm font-medium">{unidadeConsumidora.distribuidora}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Modalidade</p>
                      <p className="text-sm font-medium capitalize">{unidadeConsumidora.modalidadeTarifaria}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Demanda Contratada</p>
                      <p className="text-sm font-medium">{unidadeConsumidora.demandaContratada} kW</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                        Ativo
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Editar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State for additional clients */}
        <div className="bg-card rounded-xl border border-dashed border-border p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h3 className="font-medium text-foreground mb-1">Adicionar Novo Cliente</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Cadastre novos clientes para gerenciar suas unidades consumidoras e contratos de energia.
          </p>
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Cadastrar Cliente
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
