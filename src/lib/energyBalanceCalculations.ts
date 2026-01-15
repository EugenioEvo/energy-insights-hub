/**
 * Funções centralizadas para cálculos de balanço energético
 * Usadas em múltiplos steps do wizard para garantir consistência
 */

import type { FaturaWizardData } from '@/components/wizard/WizardContext';

export interface BalancoEnergetico {
  // Consumo da UC
  energiaDaRede: number;         // consumo_total_kwh (o que veio da distribuidora)
  energiaSimultanea: number;     // autoconsumo_total_kwh (geração consumida instantaneamente)
  consumoRealUC: number;         // energiaDaRede + energiaSimultanea

  // Geração local
  geracaoLocal: number;          // geracao_local_total_kwh
  injecaoLocal: number;          // injecao_total_kwh (excedente injetado na rede)
  
  // Créditos
  saldoCreditosLocais: number;   // soma dos saldos SCEE (créditos acumulados)
  creditosRemotosDisponiveis: number; // credito_remoto_kwh
  
  // Compensação
  baseCompensacao: number;       // energia da rede que precisa ser compensada
  creditosLocaisUsados: number;
  creditosRemotosUsados: number;
  consumoFinal: number;          // o que resta a pagar após compensação
}

/**
 * Calcula o balanço energético completo da UC
 * Fonte única de verdade para todos os cálculos de energia
 */
export function calcularBalancoEnergetico(data: FaturaWizardData, isGrupoA: boolean): BalancoEnergetico {
  // === CONSUMO ===
  // Energia da Rede = consumo medido pela concessionária
  const energiaDaRede = data.consumo_total_kwh || 0;
  
  // Energia Simultânea = autoconsumo (geração consumida no momento)
  const energiaSimultanea = isGrupoA
    ? (data.autoconsumo_ponta_kwh || 0) + (data.autoconsumo_fp_kwh || 0) + (data.autoconsumo_hr_kwh || 0)
    : (data.autoconsumo_total_kwh || 0);
  
  // Consumo Real = o que a UC realmente consumiu (rede + simultânea)
  const consumoRealUC = energiaDaRede + energiaSimultanea;

  // === GERAÇÃO LOCAL ===
  const geracaoLocal = data.geracao_local_total_kwh || 0;
  
  const injecaoLocal = isGrupoA
    ? (data.injecao_ponta_kwh || 0) + (data.injecao_fp_kwh || 0) + (data.injecao_hr_kwh || 0)
    : (data.injecao_total_kwh || 0);

  // === CRÉDITOS ===
  // Saldo de créditos locais = créditos acumulados próprios (não confundir com injeção do mês!)
  const saldoCreditosLocais = (data.scee_saldo_kwh_p || 0) + 
                               (data.scee_saldo_kwh_fp || 0) + 
                               (data.scee_saldo_kwh_hr || 0);
  
  const creditosRemotosDisponiveis = data.credito_remoto_kwh || 0;

  // === COMPENSAÇÃO ===
  // Base para compensação = energia que veio da rede (precisa pagar ou compensar)
  const baseCompensacao = energiaDaRede;
  
  // Prioridade: usar créditos locais primeiro, depois remotos
  const creditosLocaisUsados = Math.min(saldoCreditosLocais, baseCompensacao);
  const consumoAposLocais = Math.max(0, baseCompensacao - creditosLocaisUsados);
  const creditosRemotosUsados = Math.min(creditosRemotosDisponiveis, consumoAposLocais);
  const consumoFinal = Math.max(0, consumoAposLocais - creditosRemotosUsados);

  return {
    energiaDaRede,
    energiaSimultanea,
    consumoRealUC,
    geracaoLocal,
    injecaoLocal,
    saldoCreditosLocais,
    creditosRemotosDisponiveis,
    baseCompensacao,
    creditosLocaisUsados,
    creditosRemotosUsados,
    consumoFinal,
  };
}

export interface TotaisGeracaoLocal {
  autoconsumoTotal: number;
  injecaoTotal: number;
  geracaoCalculada: number;
  consumoResidual: number;
  pctAutoconsumo: string;
  pctInjecao: string;
}

/**
 * Calcula os totais de geração local
 * Usado no Step4GeracaoLocal e sincronizado com o contexto
 */
export function calcularTotaisGeracaoLocal(data: FaturaWizardData, isGrupoA: boolean): TotaisGeracaoLocal {
  const autoconsumoTotal = isGrupoA
    ? (data.autoconsumo_ponta_kwh || 0) + (data.autoconsumo_fp_kwh || 0) + (data.autoconsumo_hr_kwh || 0)
    : (data.autoconsumo_total_kwh || 0);
  
  const injecaoTotal = isGrupoA
    ? (data.injecao_ponta_kwh || 0) + (data.injecao_fp_kwh || 0) + (data.injecao_hr_kwh || 0)
    : (data.injecao_total_kwh || 0);
  
  const geracaoCalculada = autoconsumoTotal + injecaoTotal;
  
  // Consumo residual = consumo da rede (já descontado o autoconsumo)
  // Nota: consumo_total_kwh é o que vem da rede, então consumoResidual = consumo_total_kwh
  const consumoResidual = data.consumo_total_kwh || 0;
  
  // Percentuais
  const pctAutoconsumo = geracaoCalculada > 0 
    ? (autoconsumoTotal / geracaoCalculada * 100).toFixed(1) 
    : '0';
  const pctInjecao = geracaoCalculada > 0 
    ? (injecaoTotal / geracaoCalculada * 100).toFixed(1) 
    : '0';

  return {
    autoconsumoTotal,
    injecaoTotal,
    geracaoCalculada,
    consumoResidual,
    pctAutoconsumo,
    pctInjecao,
  };
}

/**
 * Formata número com separador de milhar brasileiro
 */
export function formatarKwh(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Formata valor em reais
 */
export function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
