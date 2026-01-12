/**
 * =====================================================
 * MÓDULO DE CÁLCULOS - LEI 14.300/2022
 * Marco Legal da Geração Distribuída
 * =====================================================
 * 
 * Este módulo implementa as regras de compensação de energia
 * conforme a Lei 14.300/2022, incluindo:
 * - Classificação GD1/GD2 baseada na data de protocolo
 * - Escalonamento de Fio B (2023-2029)
 * - Decomposição de componentes tarifários
 * - Cálculo de economia por simultaneidade e compensação
 */

// ============================================
// TIPOS E INTERFACES
// ============================================

export type ClassificacaoGD = 'gd1' | 'gd2';

export interface ConfiguracaoLei14300 {
  classificacaoGD: ClassificacaoGD;
  anoReferencia: number;
  percentualFioB: number;
  percentualEncargos: number;
  possuiDireitoAdquirido: boolean;
  dataProtocolo?: Date;
}

export interface ComponentesTarifarios {
  te: number;           // Tarifa de Energia
  tusdTotal: number;    // TUSD completa
  tusdFioA: number;     // Fio A (transporte até subestação)
  tusdFioB: number;     // Fio B (distribuição local)
  tusdEncargos: number; // Encargos setoriais
  bandeiras: number;    // Bandeiras tarifárias
  tributos: number;     // ICMS, PIS, COFINS
  cip: number;          // Contribuição Iluminação Pública
}

export interface DadosCompensacaoLei14300 {
  classificacaoGD: ClassificacaoGD;
  anoFatura: number;
  energiaSimultaneaKwh: number;
  energiaCompensadaKwh: number;
  consumoTotalKwh: number;
  componentesTarifarios: ComponentesTarifarios;
  tarifaMediaRsKwh: number;
}

export interface ResultadoCompensacao {
  // Valores de economia
  economiaSimultaneidade: number;
  economiaCompensacao: number;
  economiaTotal: number;
  
  // Valores não compensáveis
  valorNaoCompensavel: number;
  
  // Detalhamento
  detalhamento: {
    teCompensado: number;
    tusdFioACompensado: number;
    tusdFioBCompensado: number;
    tusdFioBNaoCompensado: number;
    encargosNaoCompensados: number;
    bandeirasNaoCompensadas: number;
    cipNaoCompensado: number;
    tributosNaoCompensados: number;
  };
  
  // Percentuais aplicados
  percentualFioBVigente: number;
  classificacaoAplicada: ClassificacaoGD;
}

export interface ProjecaoAnual {
  ano: number;
  percentualFioB: number;
  valorNaoCompensavelEstimado: number;
  economiaEstimada: number;
}

// ============================================
// CONSTANTES DA LEI 14.300
// ============================================

const DATA_LIMITE_GD1 = new Date('2023-01-06');
const ANO_FIM_TRANSICAO = 2029;

// Percentuais de Fio B por ano conforme Lei 14.300
const PERCENTUAIS_FIO_B: Record<number, number> = {
  2023: 15,
  2024: 30,
  2025: 45,
  2026: 60,
  2027: 75,
  2028: 90,
  2029: 100,
};

// ============================================
// FUNÇÕES DE CLASSIFICAÇÃO
// ============================================

/**
 * Classifica uma usina/UC como GD1 ou GD2 baseado na data de protocolo
 * GD1: Protocolo até 06/01/2023 (direito adquirido até 2045)
 * GD2: Protocolo após 06/01/2023 (sujeito à transição)
 */
export function classificarGD(dataProtocolo: Date | string | null): ClassificacaoGD {
  if (!dataProtocolo) return 'gd2';
  
  const data = typeof dataProtocolo === 'string' ? new Date(dataProtocolo) : dataProtocolo;
  return data <= DATA_LIMITE_GD1 ? 'gd1' : 'gd2';
}

/**
 * Verifica se uma usina possui direito adquirido (GD1)
 */
export function possuiDireitoAdquirido(dataProtocolo: Date | string | null): boolean {
  return classificarGD(dataProtocolo) === 'gd1';
}

/**
 * Obtém o percentual de Fio B não compensável para um ano específico
 */
export function obterPercentualFioB(ano: number): number {
  if (ano < 2023) return 0;   // Antes da lei: compensação integral
  if (ano >= ANO_FIM_TRANSICAO) return 100; // Após transição: 100% não compensável
  return PERCENTUAIS_FIO_B[ano] || 100;
}

/**
 * Obtém a configuração completa da Lei 14.300 para um dado contexto
 */
export function obterConfiguracaoLei14300(
  dataProtocolo: Date | string | null,
  anoReferencia: number
): ConfiguracaoLei14300 {
  const classificacao = classificarGD(dataProtocolo);
  
  return {
    classificacaoGD: classificacao,
    anoReferencia,
    percentualFioB: classificacao === 'gd1' ? 0 : obterPercentualFioB(anoReferencia),
    percentualEncargos: classificacao === 'gd1' ? 0 : 100, // Encargos sempre não compensáveis para GD2
    possuiDireitoAdquirido: classificacao === 'gd1',
    dataProtocolo: dataProtocolo ? new Date(dataProtocolo) : undefined,
  };
}

// ============================================
// FUNÇÕES DE DECOMPOSIÇÃO TARIFÁRIA
// ============================================

/**
 * Estima a decomposição da TUSD quando não informada
 * Proporções aproximadas baseadas em dados de mercado
 */
export function estimarDecomposicaoTusd(tusdTotal: number): {
  fioA: number;
  fioB: number;
  encargos: number;
} {
  // Proporções aproximadas típicas
  const PROPORCAO_FIO_A = 0.25;     // ~25% da TUSD
  const PROPORCAO_FIO_B = 0.45;     // ~45% da TUSD
  const PROPORCAO_ENCARGOS = 0.30;  // ~30% da TUSD
  
  return {
    fioA: tusdTotal * PROPORCAO_FIO_A,
    fioB: tusdTotal * PROPORCAO_FIO_B,
    encargos: tusdTotal * PROPORCAO_ENCARGOS,
  };
}

/**
 * Monta os componentes tarifários a partir dos dados da fatura
 */
export function montarComponentesTarifarios(dados: {
  valorTe: number;
  valorTusd: number;
  tusdFioA?: number;
  tusdFioB?: number;
  tusdEncargos?: number;
  bandeiras?: number;
  tributos?: number;
  cip?: number;
}): ComponentesTarifarios {
  // Se a decomposição não foi informada, estimar
  let fioA = dados.tusdFioA ?? 0;
  let fioB = dados.tusdFioB ?? 0;
  let encargos = dados.tusdEncargos ?? 0;
  
  if (fioA === 0 && fioB === 0 && encargos === 0 && dados.valorTusd > 0) {
    const decomposicao = estimarDecomposicaoTusd(dados.valorTusd);
    fioA = decomposicao.fioA;
    fioB = decomposicao.fioB;
    encargos = decomposicao.encargos;
  }
  
  return {
    te: dados.valorTe,
    tusdTotal: dados.valorTusd,
    tusdFioA: fioA,
    tusdFioB: fioB,
    tusdEncargos: encargos,
    bandeiras: dados.bandeiras ?? 0,
    tributos: dados.tributos ?? 0,
    cip: dados.cip ?? 0,
  };
}

// ============================================
// FUNÇÕES DE CÁLCULO DE COMPENSAÇÃO
// ============================================

/**
 * Calcula a compensação para usinas GD1 (direito adquirido)
 * Compensação integral: TE + TUSD completa
 */
function calcularCompensacaoGD1(
  energiaKwh: number,
  componentes: ComponentesTarifarios,
  consumoTotalKwh: number
): {
  valorCompensado: number;
  valorNaoCompensavel: number;
  detalhamento: ResultadoCompensacao['detalhamento'];
} {
  // GD1: Compensa tudo exceto CIP
  const proporcao = consumoTotalKwh > 0 ? energiaKwh / consumoTotalKwh : 0;
  
  const teCompensado = componentes.te * proporcao;
  const tusdFioACompensado = componentes.tusdFioA * proporcao;
  const tusdFioBCompensado = componentes.tusdFioB * proporcao;
  const bandeirasCompensadas = componentes.bandeiras * proporcao;
  // Tributos sobre energia compensada também são economizados
  const tributosCompensados = componentes.tributos * proporcao;
  
  const valorCompensado = teCompensado + tusdFioACompensado + tusdFioBCompensado + bandeirasCompensadas + tributosCompensados;
  
  // CIP nunca é compensável
  const valorNaoCompensavel = componentes.cip * proporcao;
  
  return {
    valorCompensado,
    valorNaoCompensavel,
    detalhamento: {
      teCompensado,
      tusdFioACompensado,
      tusdFioBCompensado,
      tusdFioBNaoCompensado: 0,
      encargosNaoCompensados: 0,
      bandeirasNaoCompensadas: 0,
      cipNaoCompensado: componentes.cip * proporcao,
      tributosNaoCompensados: 0,
    },
  };
}

/**
 * Calcula a compensação para usinas GD2 (pós Lei 14.300)
 * Aplica o escalonamento de Fio B conforme o ano
 */
function calcularCompensacaoGD2(
  energiaKwh: number,
  componentes: ComponentesTarifarios,
  consumoTotalKwh: number,
  percentualFioB: number
): {
  valorCompensado: number;
  valorNaoCompensavel: number;
  detalhamento: ResultadoCompensacao['detalhamento'];
} {
  const proporcao = consumoTotalKwh > 0 ? energiaKwh / consumoTotalKwh : 0;
  
  // TE: Sempre compensável
  const teCompensado = componentes.te * proporcao;
  
  // Fio A: Sempre compensável
  const tusdFioACompensado = componentes.tusdFioA * proporcao;
  
  // Fio B: Parcialmente compensável conforme ano
  const fioBTotal = componentes.tusdFioB * proporcao;
  const tusdFioBNaoCompensado = fioBTotal * (percentualFioB / 100);
  const tusdFioBCompensado = fioBTotal - tusdFioBNaoCompensado;
  
  // Encargos: Não compensáveis para GD2
  const encargosNaoCompensados = componentes.tusdEncargos * proporcao;
  
  // Bandeiras: Não compensáveis para GD2
  const bandeirasNaoCompensadas = componentes.bandeiras * proporcao;
  
  // CIP: Nunca compensável
  const cipNaoCompensado = componentes.cip * proporcao;
  
  // Tributos sobre energia compensada
  const tributosBase = componentes.tributos * proporcao;
  const proporcaoCompensada = (teCompensado + tusdFioACompensado + tusdFioBCompensado) / 
    (componentes.te + componentes.tusdTotal) || 0;
  const tributosCompensados = tributosBase * proporcaoCompensada;
  const tributosNaoCompensados = tributosBase - tributosCompensados;
  
  const valorCompensado = teCompensado + tusdFioACompensado + tusdFioBCompensado + tributosCompensados;
  const valorNaoCompensavel = tusdFioBNaoCompensado + encargosNaoCompensados + 
    bandeirasNaoCompensadas + cipNaoCompensado + tributosNaoCompensados;
  
  return {
    valorCompensado,
    valorNaoCompensavel,
    detalhamento: {
      teCompensado,
      tusdFioACompensado,
      tusdFioBCompensado,
      tusdFioBNaoCompensado,
      encargosNaoCompensados,
      bandeirasNaoCompensadas,
      cipNaoCompensado,
      tributosNaoCompensados,
    },
  };
}

/**
 * Função principal de cálculo de economia conforme Lei 14.300
 */
export function calcularEconomiaLei14300(params: DadosCompensacaoLei14300): ResultadoCompensacao {
  const percentualFioB = params.classificacaoGD === 'gd1' 
    ? 0 
    : obterPercentualFioB(params.anoFatura);
  
  // 1. Energia Simultânea: 100% de economia (evita custo total)
  const economiaSimultaneidade = params.energiaSimultaneaKwh * params.tarifaMediaRsKwh;
  
  // 2. Energia Compensada: Aplica regras da lei
  const resultadoCompensacao = params.classificacaoGD === 'gd1'
    ? calcularCompensacaoGD1(
        params.energiaCompensadaKwh, 
        params.componentesTarifarios, 
        params.consumoTotalKwh
      )
    : calcularCompensacaoGD2(
        params.energiaCompensadaKwh, 
        params.componentesTarifarios, 
        params.consumoTotalKwh,
        percentualFioB
      );
  
  return {
    economiaSimultaneidade,
    economiaCompensacao: resultadoCompensacao.valorCompensado,
    economiaTotal: economiaSimultaneidade + resultadoCompensacao.valorCompensado,
    valorNaoCompensavel: resultadoCompensacao.valorNaoCompensavel,
    detalhamento: resultadoCompensacao.detalhamento,
    percentualFioBVigente: percentualFioB,
    classificacaoAplicada: params.classificacaoGD,
  };
}

// ============================================
// FUNÇÕES DE PROJEÇÃO E ANÁLISE
// ============================================

/**
 * Gera projeção de custos não compensáveis até o fim da transição
 */
export function gerarProjecaoTransicao(
  classificacaoGD: ClassificacaoGD,
  tusdFioBMensal: number,
  encargosSetoriaisMensais: number,
  anoInicio: number = new Date().getFullYear()
): ProjecaoAnual[] {
  const projecoes: ProjecaoAnual[] = [];
  
  // GD1 não tem transição
  if (classificacaoGD === 'gd1') {
    for (let ano = anoInicio; ano <= ANO_FIM_TRANSICAO; ano++) {
      projecoes.push({
        ano,
        percentualFioB: 0,
        valorNaoCompensavelEstimado: 0,
        economiaEstimada: (tusdFioBMensal + encargosSetoriaisMensais) * 12,
      });
    }
    return projecoes;
  }
  
  // GD2: Calcular progressão
  for (let ano = anoInicio; ano <= ANO_FIM_TRANSICAO; ano++) {
    const percentual = obterPercentualFioB(ano);
    const fioBNaoCompensavel = tusdFioBMensal * (percentual / 100);
    const totalNaoCompensavel = (fioBNaoCompensavel + encargosSetoriaisMensais) * 12;
    const economiaRestante = (tusdFioBMensal * (1 - percentual / 100)) * 12;
    
    projecoes.push({
      ano,
      percentualFioB: percentual,
      valorNaoCompensavelEstimado: totalNaoCompensavel,
      economiaEstimada: economiaRestante,
    });
  }
  
  return projecoes;
}

/**
 * Calcula o impacto financeiro comparativo GD1 vs GD2
 */
export function calcularImpactoComparativo(
  anoReferencia: number,
  tusdFioB: number,
  encargos: number,
  bandeiras: number
): {
  economiaGD1: number;
  economiaGD2: number;
  perdaPorGD2: number;
  percentualPerda: number;
} {
  const percentualFioB = obterPercentualFioB(anoReferencia);
  
  // GD1: Compensa tudo
  const economiaGD1 = tusdFioB + encargos + bandeiras;
  
  // GD2: Fio B parcial, encargos e bandeiras não compensam
  const fioBCompensavel = tusdFioB * (1 - percentualFioB / 100);
  const economiaGD2 = fioBCompensavel;
  
  const perdaPorGD2 = economiaGD1 - economiaGD2;
  const percentualPerda = economiaGD1 > 0 ? (perdaPorGD2 / economiaGD1) * 100 : 0;
  
  return {
    economiaGD1,
    economiaGD2,
    perdaPorGD2,
    percentualPerda,
  };
}

// ============================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO
// ============================================

export function formatarClassificacaoGD(classificacao: ClassificacaoGD): string {
  return classificacao === 'gd1' 
    ? 'GD1 - Direito Adquirido (até 2045)' 
    : 'GD2 - Nova Regra (transição 2023-2029)';
}

export function formatarPercentualFioB(ano: number): string {
  const percentual = obterPercentualFioB(ano);
  if (ano < 2023) return '0% (regras anteriores)';
  if (ano >= 2029) return '100% (fim da transição)';
  return `${percentual}% (ano ${ano} da transição)`;
}

export function obterDescricaoAnoTransicao(ano: number): string {
  const anoTransicao = ano - 2022;
  if (anoTransicao < 1) return 'Anterior à Lei 14.300';
  if (anoTransicao > 7) return 'Após período de transição';
  return `${anoTransicao}º ano da transição`;
}
