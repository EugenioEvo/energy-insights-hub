import { Cliente, UnidadeConsumidora, FaturaMensal, GeracaoMensal, AssinaturaMensal, User } from '@/types/energy';

export const mockUser: User = {
  id: '1',
  nome: 'João Silva',
  email: 'joao@empresa.com.br',
  role: 'admin',
  clienteId: '1',
};

export const mockCliente: Cliente = {
  id: '1',
  nome: 'Indústria ABC Ltda',
  cnpj: '12.345.678/0001-90',
  email: 'contato@industriaabc.com.br',
  telefone: '(11) 3456-7890',
  createdAt: new Date('2024-01-15'),
};

export const mockUC: UnidadeConsumidora = {
  id: '1',
  clienteId: '1',
  numero: 'UC-0012345678',
  endereco: 'Av. Industrial, 1000 - São Paulo, SP',
  distribuidora: 'CPFL Energia',
  modalidadeTarifaria: 'verde',
  demandaContratada: 500,
};

export const mockFaturas: FaturaMensal[] = [
  {
    id: '1',
    ucId: '1',
    mesRef: '2024-12',
    consumoTotalKwh: 45000,
    pontaKwh: 8500,
    foraPontaKwh: 36500,
    demandaContratadaKw: 500,
    demandaMedidaKw: 485,
    valorTotal: 38500,
    valorTe: 22000,
    valorTusd: 14500,
    bandeiras: 'verde',
    multaDemanda: 0,
    multaReativo: 0,
    outrosEncargos: 2000,
  },
  {
    id: '2',
    ucId: '1',
    mesRef: '2024-11',
    consumoTotalKwh: 48000,
    pontaKwh: 9200,
    foraPontaKwh: 38800,
    demandaContratadaKw: 500,
    demandaMedidaKw: 520,
    valorTotal: 42800,
    valorTe: 24000,
    valorTusd: 16000,
    bandeiras: 'amarela',
    multaDemanda: 850,
    multaReativo: 0,
    outrosEncargos: 1950,
  },
  {
    id: '3',
    ucId: '1',
    mesRef: '2024-10',
    consumoTotalKwh: 43500,
    pontaKwh: 8000,
    foraPontaKwh: 35500,
    demandaContratadaKw: 500,
    demandaMedidaKw: 478,
    valorTotal: 36200,
    valorTe: 20500,
    valorTusd: 13700,
    bandeiras: 'verde',
    multaDemanda: 0,
    multaReativo: 0,
    outrosEncargos: 2000,
  },
  {
    id: '4',
    ucId: '1',
    mesRef: '2024-09',
    consumoTotalKwh: 44200,
    pontaKwh: 8300,
    foraPontaKwh: 35900,
    demandaContratadaKw: 500,
    demandaMedidaKw: 492,
    valorTotal: 37100,
    valorTe: 21200,
    valorTusd: 13900,
    bandeiras: 'verde',
    multaDemanda: 0,
    multaReativo: 0,
    outrosEncargos: 2000,
  },
  {
    id: '5',
    ucId: '1',
    mesRef: '2024-08',
    consumoTotalKwh: 46500,
    pontaKwh: 8800,
    foraPontaKwh: 37700,
    demandaContratadaKw: 500,
    demandaMedidaKw: 510,
    valorTotal: 40200,
    valorTe: 23000,
    valorTusd: 15200,
    bandeiras: 'vermelha1',
    multaDemanda: 420,
    multaReativo: 180,
    outrosEncargos: 1400,
  },
  {
    id: '6',
    ucId: '1',
    mesRef: '2024-07',
    consumoTotalKwh: 42000,
    pontaKwh: 7800,
    foraPontaKwh: 34200,
    demandaContratadaKw: 500,
    demandaMedidaKw: 468,
    valorTotal: 34800,
    valorTe: 19800,
    valorTusd: 13000,
    bandeiras: 'verde',
    multaDemanda: 0,
    multaReativo: 0,
    outrosEncargos: 2000,
  },
];

export const mockGeracoes: GeracaoMensal[] = [
  {
    id: '1',
    ucId: '1',
    mesRef: '2024-12',
    geracaoTotalKwh: 12500,
    autoconsumoKwh: 8500,
    injecaoKwh: 4000,
    compensacaoKwh: 3800,
    disponibilidadePercent: 98.5,
    perdasEstimadasKwh: 200,
  },
  {
    id: '2',
    ucId: '1',
    mesRef: '2024-11',
    geracaoTotalKwh: 11200,
    autoconsumoKwh: 7800,
    injecaoKwh: 3400,
    compensacaoKwh: 3200,
    disponibilidadePercent: 96.2,
    perdasEstimadasKwh: 200,
  },
  {
    id: '3',
    ucId: '1',
    mesRef: '2024-10',
    geracaoTotalKwh: 13800,
    autoconsumoKwh: 9200,
    injecaoKwh: 4600,
    compensacaoKwh: 4400,
    disponibilidadePercent: 99.1,
    perdasEstimadasKwh: 200,
  },
  {
    id: '4',
    ucId: '1',
    mesRef: '2024-09',
    geracaoTotalKwh: 14200,
    autoconsumoKwh: 9500,
    injecaoKwh: 4700,
    compensacaoKwh: 4500,
    disponibilidadePercent: 99.5,
    perdasEstimadasKwh: 200,
  },
  {
    id: '5',
    ucId: '1',
    mesRef: '2024-08',
    geracaoTotalKwh: 13500,
    autoconsumoKwh: 9000,
    injecaoKwh: 4500,
    compensacaoKwh: 4300,
    disponibilidadePercent: 98.8,
    perdasEstimadasKwh: 200,
  },
  {
    id: '6',
    ucId: '1',
    mesRef: '2024-07',
    geracaoTotalKwh: 12800,
    autoconsumoKwh: 8700,
    injecaoKwh: 4100,
    compensacaoKwh: 3900,
    disponibilidadePercent: 97.5,
    perdasEstimadasKwh: 200,
  },
];

export const mockAssinaturas: AssinaturaMensal[] = [
  {
    id: '1',
    ucId: '1',
    mesRef: '2024-12',
    ucRemota: 'UFV-SOLAR-001',
    energiaContratadaKwh: 15000,
    energiaAlocadaKwh: 14200,
    valorAssinatura: 8500,
    economiaPrometidaPercent: 15,
  },
  {
    id: '2',
    ucId: '1',
    mesRef: '2024-11',
    ucRemota: 'UFV-SOLAR-001',
    energiaContratadaKwh: 15000,
    energiaAlocadaKwh: 12800,
    valorAssinatura: 8500,
    economiaPrometidaPercent: 15,
  },
  {
    id: '3',
    ucId: '1',
    mesRef: '2024-10',
    ucRemota: 'UFV-SOLAR-001',
    energiaContratadaKwh: 15000,
    energiaAlocadaKwh: 14800,
    valorAssinatura: 8500,
    economiaPrometidaPercent: 15,
  },
  {
    id: '4',
    ucId: '1',
    mesRef: '2024-09',
    ucRemota: 'UFV-SOLAR-001',
    energiaContratadaKwh: 15000,
    energiaAlocadaKwh: 14500,
    valorAssinatura: 8500,
    economiaPrometidaPercent: 15,
  },
  {
    id: '5',
    ucId: '1',
    mesRef: '2024-08',
    ucRemota: 'UFV-SOLAR-001',
    energiaContratadaKwh: 15000,
    energiaAlocadaKwh: 13200,
    valorAssinatura: 8500,
    economiaPrometidaPercent: 15,
  },
  {
    id: '6',
    ucId: '1',
    mesRef: '2024-07',
    ucRemota: 'UFV-SOLAR-001',
    energiaContratadaKwh: 15000,
    energiaAlocadaKwh: 14000,
    valorAssinatura: 8500,
    economiaPrometidaPercent: 15,
  },
];

export const getMonthName = (mesRef: string): string => {
  const [year, month] = mesRef.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatNumber = (value: number, decimals = 0): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
