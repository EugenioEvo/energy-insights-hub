import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { KPIs, User, Alerta } from '@/types/energy';
import { useClientes, Cliente } from '@/hooks/useClientes';
import { useUnidadesConsumidoras, UnidadeConsumidora } from '@/hooks/useUnidadesConsumidoras';
import { useFaturas, FaturaMensal, useUpsertFatura } from '@/hooks/useFaturas';
import { useAuthContext } from '@/contexts/AuthContext';

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
  
  // Current selected entities
  cliente: Cliente | null;
  unidadeConsumidora: UnidadeConsumidora | null;
  
  // Loading states
  isLoading: boolean;
  
  // KPIs - calculados diretamente dos campos da fatura
  kpis: KPIs;
  mesAtual: string;
  setMesAtual: (mes: string) => void;
  
  // Mutations
  addFatura: (fatura: Omit<FaturaMensal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  
  // Refetch functions
  refetchAll: () => void;
}

const defaultKPIs: KPIs = {
  economiaDoMes: 0,
  economiaAcumulada: 0,
  custoKwhAntes: 0,
  custoKwhDepois: 0,
  statusGeral: 'OK',
  alertas: [],
};

const EnergyContext = createContext<EnergyContextType | undefined>(undefined);

export function EnergyProvider({ children }: { children: ReactNode }) {
  const { user: authUser, isAdmin, clienteIds } = useAuthContext();
  
  // User object for context
  const user: User = useMemo(() => ({
    id: authUser?.id || '',
    nome: authUser?.user_metadata?.nome || authUser?.email || 'Usuário',
    email: authUser?.email || '',
    role: isAdmin ? 'admin' : 'cliente',
  }), [authUser, isAdmin]);

  const [clienteId, setClienteId] = useState<string | null>(null);
  const [ucId, setUcId] = useState<string | null>(null);
  const [mesAtual, setMesAtual] = useState<string>('');

  // Fetch data from database - simplificado para usar apenas faturas
  const { data: clientes = [], isLoading: loadingClientes, refetch: refetchClientes } = useClientes();
  const { data: unidadesConsumidoras = [], isLoading: loadingUCs, refetch: refetchUCs } = useUnidadesConsumidoras(clienteId || undefined);
  const { data: faturas = [], isLoading: loadingFaturas, refetch: refetchFaturas } = useFaturas(ucId || undefined);
  
  // Filtrar clientes baseado no role do usuário
  const filteredClientes = useMemo(() => {
    if (isAdmin) {
      return clientes;
    }
    // Cliente vê apenas os clientes vinculados a ele
    return clientes.filter(c => clienteIds.includes(c.id));
  }, [clientes, isAdmin, clienteIds]);
  
  // Mutations
  const upsertFatura = useUpsertFatura();

  // Auto-detect most recent month from faturas
  React.useEffect(() => {
    if (faturas.length > 0 && !mesAtual) {
      const sortedFaturas = [...faturas].sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
      setMesAtual(sortedFaturas[0].mes_ref);
    }
  }, [faturas, mesAtual]);

  // Auto-select first cliente and UC if none selected
  React.useEffect(() => {
    if (!clienteId && filteredClientes.length > 0) {
      setClienteId(filteredClientes[0].id);
    }
  }, [filteredClientes, clienteId]);

  React.useEffect(() => {
    if (!ucId && unidadesConsumidoras.length > 0) {
      setUcId(unidadesConsumidoras[0].id);
    } else if (ucId && clienteId && unidadesConsumidoras.length > 0) {
      const ucBelongsToCliente = unidadesConsumidoras.some(uc => uc.id === ucId);
      if (!ucBelongsToCliente) {
        setUcId(unidadesConsumidoras[0].id);
      }
    }
  }, [unidadesConsumidoras, ucId, clienteId]);

  // Get current selected entities
  const cliente = useMemo(() => 
    filteredClientes.find(c => c.id === clienteId) || null,
    [filteredClientes, clienteId]
  );

  const unidadeConsumidora = useMemo(() => 
    unidadesConsumidoras.find(uc => uc.id === ucId) || null,
    [unidadesConsumidoras, ucId]
  );

  // KPIs - calculados diretamente dos campos pré-calculados da fatura
  const kpis = useMemo((): KPIs => {
    if (faturas.length === 0) return defaultKPIs;
    
    // Ordenar por mês mais recente
    const sortedFaturas = [...faturas].sort((a, b) => b.mes_ref.localeCompare(a.mes_ref));
    const faturaMaisRecente = sortedFaturas[0];
    const faturaAnterior = sortedFaturas[1];
    
    // Economia do mês - usa campo pré-calculado
    const economiaDoMes = Number(faturaMaisRecente.economia_liquida_rs) || 0;
    
    // Economia acumulada - soma de todas as faturas
    const economiaAcumulada = faturas.reduce((acc, f) => 
      acc + (Number(f.economia_liquida_rs) || 0), 0
    );
    
    // Custo por kWh antes (valor total / consumo total)
    const consumoTotal = Number(faturaMaisRecente.consumo_total_kwh) || 1;
    const valorTotal = Number(faturaMaisRecente.valor_total) || 0;
    const custoKwhAntes = consumoTotal > 0 ? valorTotal / consumoTotal : 0;
    
    // Custo por kWh depois (considera a economia)
    const valorComEconomia = valorTotal - economiaDoMes;
    const custoKwhDepois = consumoTotal > 0 ? valorComEconomia / consumoTotal : 0;
    
    // CORRIGIDO: Trend de economia calculado dinamicamente
    const economiaAnterior = Number(faturaAnterior?.economia_liquida_rs) || 0;
    const trendEconomia = economiaAnterior > 0 
      ? ((economiaDoMes - economiaAnterior) / economiaAnterior * 100)
      : 0;
    
    // Status e alertas - usa campos da fatura
    const alertas = (faturaMaisRecente.alertas as unknown as Alerta[]) || [];
    const statusGeral = calcularStatusFromAlertas(alertas);
    
    return {
      economiaDoMes,
      economiaAcumulada,
      custoKwhAntes,
      custoKwhDepois,
      statusGeral,
      alertas,
      trendEconomia,
    };
  }, [faturas]);

  const isLoading = loadingClientes || loadingUCs || loadingFaturas;

  const addFatura = async (fatura: Omit<FaturaMensal, 'id' | 'created_at' | 'updated_at'>) => {
    await upsertFatura.mutateAsync(fatura);
  };

  const refetchAll = () => {
    refetchClientes();
    refetchUCs();
    refetchFaturas();
  };

  return (
    <EnergyContext.Provider
      value={{
        user,
        clienteId,
        setClienteId,
        ucId,
        setUcId,
        clientes: filteredClientes,
        unidadesConsumidoras,
        faturas,
        cliente,
        unidadeConsumidora,
        isLoading,
        kpis,
        mesAtual,
        setMesAtual,
        addFatura,
        refetchAll,
      }}
    >
      {children}
    </EnergyContext.Provider>
  );
}

// Função auxiliar para calcular status a partir dos alertas
function calcularStatusFromAlertas(alertas: Alerta[]): 'OK' | 'ATENCAO' | 'CRITICO' {
  if (!alertas || alertas.length === 0) return 'OK';
  
  const temCritico = alertas.some(a => a.severidade === 'critico');
  const temAtencao = alertas.some(a => a.severidade === 'atencao');
  
  if (temCritico) return 'CRITICO';
  if (temAtencao) return 'ATENCAO';
  return 'OK';
}

export function useEnergy() {
  const context = useContext(EnergyContext);
  if (context === undefined) {
    throw new Error('useEnergy must be used within an EnergyProvider');
  }
  return context;
}
