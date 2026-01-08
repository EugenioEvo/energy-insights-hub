import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { KPIs, User } from '@/types/energy';
import { useClientes, Cliente } from '@/hooks/useClientes';
import { useUnidadesConsumidoras, UnidadeConsumidora } from '@/hooks/useUnidadesConsumidoras';
import { useFaturas, FaturaMensal, useUpsertFatura } from '@/hooks/useFaturas';
import { useGeracoes, GeracaoMensal, useUpsertGeracao } from '@/hooks/useGeracoes';
import { useAssinaturas, AssinaturaMensal, useUpsertAssinatura } from '@/hooks/useAssinaturas';
import { calcularKPIsGlobais } from '@/lib/calculations';

// Mock user until auth is implemented
const mockUser: User = {
  id: 'user-1',
  nome: 'Administrador',
  email: 'admin@evolight.com.br',
  role: 'admin',
};

interface EnergyContextType {
  // User
  user: User;
  
  // Selected entities
  clienteId: string | null;
  setClienteId: (id: string | null) => void;
  ucId: string | null;
  setUcId: (id: string | null) => void;
  
  // Data from database
  clientes: Cliente[];
  unidadesConsumidoras: UnidadeConsumidora[];
  faturas: FaturaMensal[];
  geracoes: GeracaoMensal[];
  assinaturas: AssinaturaMensal[];
  
  // Current selected entities
  cliente: Cliente | null;
  unidadeConsumidora: UnidadeConsumidora | null;
  
  // Loading states
  isLoading: boolean;
  
  // KPIs
  kpis: KPIs;
  mesAtual: string;
  setMesAtual: (mes: string) => void;
  
  // Mutations
  addFatura: (fatura: Omit<FaturaMensal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  addGeracao: (geracao: Omit<GeracaoMensal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  addAssinatura: (assinatura: Omit<AssinaturaMensal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  
  // Refetch functions
  refetchAll: () => void;
}

const EnergyContext = createContext<EnergyContextType | undefined>(undefined);

export function EnergyProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User>(mockUser);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [ucId, setUcId] = useState<string | null>(null);
  const [mesAtual, setMesAtual] = useState<string>('2024-12');

  // Fetch data from database
  const { data: clientes = [], isLoading: loadingClientes, refetch: refetchClientes } = useClientes();
  const { data: unidadesConsumidoras = [], isLoading: loadingUCs, refetch: refetchUCs } = useUnidadesConsumidoras(clienteId || undefined);
  const { data: faturas = [], isLoading: loadingFaturas, refetch: refetchFaturas } = useFaturas(ucId || undefined);
  const { data: geracoes = [], isLoading: loadingGeracoes, refetch: refetchGeracoes } = useGeracoes(ucId || undefined);
  const { data: assinaturas = [], isLoading: loadingAssinaturas, refetch: refetchAssinaturas } = useAssinaturas(ucId || undefined);
  
  // Mutations
  const upsertFatura = useUpsertFatura();
  const upsertGeracao = useUpsertGeracao();
  const upsertAssinatura = useUpsertAssinatura();

  // Auto-select first cliente and UC if none selected
  React.useEffect(() => {
    if (!clienteId && clientes.length > 0) {
      setClienteId(clientes[0].id);
    }
  }, [clientes, clienteId]);

  React.useEffect(() => {
    if (!ucId && unidadesConsumidoras.length > 0) {
      setUcId(unidadesConsumidoras[0].id);
    } else if (ucId && clienteId && unidadesConsumidoras.length > 0) {
      // Reset UC if current one doesn't belong to selected cliente
      const ucBelongsToCliente = unidadesConsumidoras.some(uc => uc.id === ucId);
      if (!ucBelongsToCliente) {
        setUcId(unidadesConsumidoras[0].id);
      }
    }
  }, [unidadesConsumidoras, ucId, clienteId]);

  // Get current selected entities
  const cliente = useMemo(() => 
    clientes.find(c => c.id === clienteId) || null,
    [clientes, clienteId]
  );

  const unidadeConsumidora = useMemo(() => 
    unidadesConsumidoras.find(uc => uc.id === ucId) || null,
    [unidadesConsumidoras, ucId]
  );

  // Calculate KPIs
  const kpis = useMemo(() => {
    // Convert database types to calculation types
    const faturasForCalc = faturas.map(f => ({
      id: f.id,
      ucId: f.uc_id,
      mesRef: f.mes_ref,
      consumoTotalKwh: Number(f.consumo_total_kwh),
      pontaKwh: Number(f.ponta_kwh),
      foraPontaKwh: Number(f.fora_ponta_kwh),
      demandaContratadaKw: Number(f.demanda_contratada_kw),
      demandaMedidaKw: Number(f.demanda_medida_kw),
      valorTotal: Number(f.valor_total),
      valorTe: Number(f.valor_te),
      valorTusd: Number(f.valor_tusd),
      bandeiras: f.bandeiras as 'verde' | 'amarela' | 'vermelha1' | 'vermelha2',
      multaDemanda: Number(f.multa_demanda),
      multaReativo: Number(f.multa_reativo),
      outrosEncargos: Number(f.outros_encargos),
    }));

    const geracoesForCalc = geracoes.map(g => ({
      id: g.id,
      ucId: g.uc_id,
      mesRef: g.mes_ref,
      geracaoTotalKwh: Number(g.geracao_total_kwh),
      autoconsumoKwh: Number(g.autoconsumo_kwh),
      injecaoKwh: Number(g.injecao_kwh),
      compensacaoKwh: Number(g.compensacao_kwh),
      disponibilidadePercent: Number(g.disponibilidade_percent),
      perdasEstimadasKwh: Number(g.perdas_estimadas_kwh),
    }));

    const assinaturasForCalc = assinaturas.map(a => ({
      id: a.id,
      ucId: a.uc_id,
      mesRef: a.mes_ref,
      ucRemota: a.uc_remota,
      energiaContratadaKwh: Number(a.energia_contratada_kwh),
      energiaAlocadaKwh: Number(a.energia_alocada_kwh),
      valorAssinatura: Number(a.valor_assinatura),
      economiaPrometidaPercent: Number(a.economia_prometida_percent),
    }));

    return calcularKPIsGlobais(faturasForCalc, geracoesForCalc, assinaturasForCalc);
  }, [faturas, geracoes, assinaturas]);

  const isLoading = loadingClientes || loadingUCs || loadingFaturas || loadingGeracoes || loadingAssinaturas;

  const addFatura = async (fatura: Omit<FaturaMensal, 'id' | 'created_at' | 'updated_at'>) => {
    await upsertFatura.mutateAsync(fatura);
  };

  const addGeracao = async (geracao: Omit<GeracaoMensal, 'id' | 'created_at' | 'updated_at'>) => {
    await upsertGeracao.mutateAsync(geracao);
  };

  const addAssinatura = async (assinatura: Omit<AssinaturaMensal, 'id' | 'created_at' | 'updated_at'>) => {
    await upsertAssinatura.mutateAsync(assinatura);
  };

  const refetchAll = () => {
    refetchClientes();
    refetchUCs();
    refetchFaturas();
    refetchGeracoes();
    refetchAssinaturas();
  };

  return (
    <EnergyContext.Provider
      value={{
        user,
        clienteId,
        setClienteId,
        ucId,
        setUcId,
        clientes,
        unidadesConsumidoras,
        faturas,
        geracoes,
        assinaturas,
        cliente,
        unidadeConsumidora,
        isLoading,
        kpis,
        mesAtual,
        setMesAtual,
        addFatura,
        addGeracao,
        addAssinatura,
        refetchAll,
      }}
    >
      {children}
    </EnergyContext.Provider>
  );
}

export function useEnergy() {
  const context = useContext(EnergyContext);
  if (context === undefined) {
    throw new Error('useEnergy must be used within an EnergyProvider');
  }
  return context;
}
