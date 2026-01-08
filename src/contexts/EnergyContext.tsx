import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  Cliente, 
  UnidadeConsumidora, 
  FaturaMensal, 
  GeracaoMensal, 
  AssinaturaMensal, 
  User,
  KPIs 
} from '@/types/energy';
import { 
  mockUser, 
  mockCliente, 
  mockUC, 
  mockFaturas, 
  mockGeracoes, 
  mockAssinaturas 
} from '@/data/mockData';
import { calcularKPIsGlobais } from '@/lib/calculations';

interface EnergyContextType {
  user: User;
  cliente: Cliente;
  unidadeConsumidora: UnidadeConsumidora;
  faturas: FaturaMensal[];
  geracoes: GeracaoMensal[];
  assinaturas: AssinaturaMensal[];
  kpis: KPIs;
  mesAtual: string;
  setMesAtual: (mes: string) => void;
  addFatura: (fatura: Omit<FaturaMensal, 'id'>) => void;
  addGeracao: (geracao: Omit<GeracaoMensal, 'id'>) => void;
  addAssinatura: (assinatura: Omit<AssinaturaMensal, 'id'>) => void;
}

const EnergyContext = createContext<EnergyContextType | undefined>(undefined);

export function EnergyProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User>(mockUser);
  const [cliente] = useState<Cliente>(mockCliente);
  const [unidadeConsumidora] = useState<UnidadeConsumidora>(mockUC);
  const [faturas, setFaturas] = useState<FaturaMensal[]>(mockFaturas);
  const [geracoes, setGeracoes] = useState<GeracaoMensal[]>(mockGeracoes);
  const [assinaturas, setAssinaturas] = useState<AssinaturaMensal[]>(mockAssinaturas);
  const [mesAtual, setMesAtual] = useState<string>('2024-12');

  const kpis = calcularKPIsGlobais(faturas, geracoes, assinaturas);

  const addFatura = (fatura: Omit<FaturaMensal, 'id'>) => {
    const newFatura: FaturaMensal = {
      ...fatura,
      id: Date.now().toString(),
    };
    setFaturas(prev => [newFatura, ...prev]);
  };

  const addGeracao = (geracao: Omit<GeracaoMensal, 'id'>) => {
    const newGeracao: GeracaoMensal = {
      ...geracao,
      id: Date.now().toString(),
    };
    setGeracoes(prev => [newGeracao, ...prev]);
  };

  const addAssinatura = (assinatura: Omit<AssinaturaMensal, 'id'>) => {
    const newAssinatura: AssinaturaMensal = {
      ...assinatura,
      id: Date.now().toString(),
    };
    setAssinaturas(prev => [newAssinatura, ...prev]);
  };

  return (
    <EnergyContext.Provider
      value={{
        user,
        cliente,
        unidadeConsumidora,
        faturas,
        geracoes,
        assinaturas,
        kpis,
        mesAtual,
        setMesAtual,
        addFatura,
        addGeracao,
        addAssinatura,
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
