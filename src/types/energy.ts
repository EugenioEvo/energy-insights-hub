export interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  createdAt: Date;
}

export interface UnidadeConsumidora {
  id: string;
  clienteId: string;
  numero: string;
  endereco: string;
  distribuidora: string;
  modalidadeTarifaria: 'convencional' | 'branca' | 'verde' | 'azul';
  demandaContratada: number;
}

export interface FaturaMensal {
  id: string;
  ucId: string;
  mesRef: string; // YYYY-MM
  consumoTotalKwh: number;
  pontaKwh: number;
  foraPontaKwh: number;
  demandaContratadaKw: number;
  demandaMedidaKw: number;
  valorTotal: number;
  valorTe: number;
  valorTusd: number;
  bandeiras: 'verde' | 'amarela' | 'vermelha1' | 'vermelha2';
  multaDemanda: number;
  multaReativo: number;
  outrosEncargos: number;
}

export interface GeracaoMensal {
  id: string;
  ucId: string;
  mesRef: string;
  geracaoTotalKwh: number;
  autoconsumoKwh: number;
  injecaoKwh: number;
  compensacaoKwh: number;
  disponibilidadePercent: number;
  perdasEstimadasKwh: number;
}

export interface AssinaturaMensal {
  id: string;
  ucId: string;
  mesRef: string;
  ucRemota: string;
  energiaContratadaKwh: number;
  energiaAlocadaKwh: number;
  valorAssinatura: number;
  economiaPrometidaPercent: number;
}

export interface KPIs {
  economiaDoMes: number;
  economiaAcumulada: number;
  custoKwhAntes: number;
  custoKwhDepois: number;
  statusGeral: 'OK' | 'ATENCAO' | 'CRITICO';
  alertas: Alerta[];
}

export interface Alerta {
  tipo: 'demanda' | 'multa' | 'subgeracao' | 'assinatura';
  severidade: 'info' | 'atencao' | 'critico';
  titulo: string;
  descricao: string;
  valor?: number;
}

export interface DadosMensais {
  mesRef: string;
  fatura: FaturaMensal;
  geracao: GeracaoMensal;
  assinatura: AssinaturaMensal;
  kpis: {
    custoKwhBase: number;
    valorTotalAtual: number;
    economiaMensalRs: number;
    economiaMensalPercent: number;
    custoKwhAtual: number;
    perdaAssinatura: number;
    custoPerdaAssinatura: number;
  };
}

export type UserRole = 'admin' | 'cliente';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  clienteId?: string;
}
