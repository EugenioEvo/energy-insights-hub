/**
 * Funções centralizadas para cálculos de balanço energético
 * Usadas em múltiplos steps do wizard para garantir consistência
 * 
 * CONCEITO CHAVE:
 * - Consumo da Rede (fatura concessionária) = energia medida pela distribuidora
 * - Autoconsumo (energia simultânea) = geração consumida no momento, "atrás do medidor"
 * - Consumo Real Total = Consumo da Rede + Autoconsumo
 * 
 * A fatura da concessionária só mostra o que veio da rede.
 * A "fatura da usina" é o custo do PPA local + assinatura remota (com desconto).
 */

import type { FaturaWizardData } from '@/components/wizard/WizardContext';

export interface BalancoEnergetico {
  // Consumo da UC - visão completa
  consumoDaRede: number;         // O que veio da distribuidora (fatura concessionária)
  autoconsumoSimultaneo: number; // Geração consumida instantaneamente (atrás do medidor)
  consumoRealTotal: number;      // consumoDaRede + autoconsumoSimultaneo = tudo que a UC consumiu

  // Geração local
  geracaoLocal: number;          // geracao_local_total_kwh
  injecaoLocal: number;          // Excedente injetado na rede (gera créditos próprios)
  
  // Compensação do consumo da rede
  consumoAposAutoconsumo: number;  // = consumoDaRede (já é o residual, fatura da concessionária)
  creditosProprios: number;        // Créditos da injeção local
  creditosRemotosAlocados: number; // Créditos remotos usados para compensar
  totalCreditos: number;           // creditosProprios + creditosRemotosAlocados
  consumoCompensado: number;       // Quanto foi compensado pelos créditos
  consumoNaoCompensado: number;    // Consumo que não foi compensado (paga na fatura)
  creditosSobrando: number;        // Créditos que sobram após compensar
  
  // Para legado/compatibilidade
  energiaDaRede: number;
  energiaSimultanea: number;
  consumoRealUC: number;
  saldoCreditosLocais: number;
  creditosRemotosDisponiveis: number;
  baseCompensacao: number;
  creditosLocaisUsados: number;
  creditosRemotosUsados: number;
  consumoFinal: number;
}

/**
 * Calcula o balanço energético completo da UC
 * 
 * FLUXO:
 * 1. UC consome energia = parte da rede + parte da usina própria (autoconsumo)
 * 2. O que veio da rede pode ser compensado por:
 *    a) Créditos próprios (injeção da usina local)
 *    b) Créditos remotos (assinatura de usina remota)
 * 3. O que não for compensado é pago na fatura da concessionária
 * 4. Autoconsumo + Créditos Remotos são pagos via "fatura da usina" (com 15% desconto)
 */
export function calcularBalancoEnergetico(data: FaturaWizardData, isGrupoA: boolean): BalancoEnergetico {
  // === CONSUMO ===
  // Consumo da Rede = o que a concessionária mediu (já veio na fatura)
  const consumoDaRede = data.consumo_total_kwh || 0;
  
  // Autoconsumo Simultâneo = geração consumida instantaneamente (não passa pelo medidor)
  const autoconsumoSimultaneo = isGrupoA
    ? (data.autoconsumo_ponta_kwh || 0) + (data.autoconsumo_fp_kwh || 0) + (data.autoconsumo_hr_kwh || 0)
    : (data.autoconsumo_total_kwh || 0);
  
  // Consumo Real Total = tudo que a UC consumiu (rede + autoconsumo)
  const consumoRealTotal = consumoDaRede + autoconsumoSimultaneo;

  // === GERAÇÃO LOCAL ===
  const geracaoLocal = data.geracao_local_total_kwh || 0;
  
  const injecaoLocal = isGrupoA
    ? (data.injecao_ponta_kwh || 0) + (data.injecao_fp_kwh || 0) + (data.injecao_hr_kwh || 0)
    : (data.injecao_total_kwh || 0);

  // === COMPENSAÇÃO DO CONSUMO DA REDE ===
  // O consumo da rede precisa ser compensado (ou pago na fatura)
  const consumoAposAutoconsumo = consumoDaRede; // Já é o residual
  
  // Créditos próprios (injeção local) - CORREÇÃO: Agora incluídos na compensação
  const creditosProprios = injecaoLocal;
  
  // Créditos remotos alocados (da assinatura ou SCEE)
  const creditosRemotosAlocados = data.credito_remoto_kwh || 0;
  
  // Total de créditos disponíveis para compensar
  const totalCreditos = creditosProprios + creditosRemotosAlocados;
  
  // Quanto foi compensado
  const consumoCompensado = Math.min(consumoAposAutoconsumo, totalCreditos);
  
  // Consumo não compensado = o que vai pagar na fatura da concessionária
  const consumoNaoCompensado = Math.max(0, consumoAposAutoconsumo - totalCreditos);
  
  // Créditos que sobram
  const creditosSobrando = Math.max(0, totalCreditos - consumoAposAutoconsumo);

  // === LEGADO (compatibilidade) ===
  const saldoCreditosLocais = (data.scee_saldo_kwh_p || 0) + 
                               (data.scee_saldo_kwh_fp || 0) + 
                               (data.scee_saldo_kwh_hr || 0);

  return {
    // Novos campos (nomenclatura clara)
    consumoDaRede,
    autoconsumoSimultaneo,
    consumoRealTotal,
    geracaoLocal,
    injecaoLocal,
    consumoAposAutoconsumo,
    creditosProprios,
    creditosRemotosAlocados,
    totalCreditos,
    consumoCompensado,
    consumoNaoCompensado,
    creditosSobrando,
    
    // Campos legados (manter compatibilidade)
    energiaDaRede: consumoDaRede,
    energiaSimultanea: autoconsumoSimultaneo,
    consumoRealUC: consumoRealTotal,
    saldoCreditosLocais,
    creditosRemotosDisponiveis: creditosRemotosAlocados,
    baseCompensacao: consumoAposAutoconsumo,
    creditosLocaisUsados: Math.min(creditosProprios, consumoAposAutoconsumo),
    creditosRemotosUsados: Math.min(creditosRemotosAlocados, Math.max(0, consumoAposAutoconsumo - creditosProprios)),
    consumoFinal: consumoNaoCompensado,
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
  
  // Consumo residual = consumo da rede (o que a concessionária mediu)
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
 * Calcula os custos separados: Fatura Concessionária vs Fatura Usina
 * 
 * CONCEITO:
 * - Fatura Concessionária = consumo não compensado × tarifa rede
 * - Fatura Usina = (autoconsumo × tarifa evitada + créditos × tarifa compensação) × (1 - desconto)
 *   - Desconto padrão = 15% (cliente paga 85%)
 */
export interface CustosDuasFaturas {
  // Fatura Concessionária
  custoConsumoNaoCompensado: number;  // Paga à distribuidora
  
  // Fatura Usina (PPA + Assinatura)
  valorAutoconsumoEvitado: number;    // Economia do autoconsumo (tarifa cheia)
  valorCreditosCompensados: number;   // Valor dos créditos remotos (TUSD)
  custoAssinaturaRemota: number;      // 85% do valor compensado
  custoPPALocal: number;              // 85% do autoconsumo (se PPA)
  
  // Economia
  economiaAutoconsumo: number;        // 100% de economia (evitou a tarifa)
  economiaAssinatura: number;         // 15% de economia sobre créditos
  economiaTotal: number;              // Soma
}

export function calcularCustosDuasFaturas(
  data: FaturaWizardData, 
  isGrupoA: boolean,
  descontoPercent: number = 15
): CustosDuasFaturas {
  const percentualPago = (100 - descontoPercent) / 100; // 0.85 para 15% desconto
  
  // Valores já calculados
  const valorAutoconsumoEvitado = data.autoconsumo_rs || 0;
  const valorCreditosCompensados = data.credito_remoto_compensado_rs || 0;
  
  // Custo assinatura = 85% do valor compensado
  const custoAssinaturaRemota = valorCreditosCompensados * percentualPago;
  
  // Custo PPA local = 85% do autoconsumo (se o cliente paga pela energia solar)
  // Obs: em geração própria, normalmente não há custo adicional (já pagou o sistema)
  // Em assinatura/PPA, paga 85%
  const custoPPALocal = data.tem_usina_remota 
    ? valorAutoconsumoEvitado * percentualPago 
    : 0; // Geração própria = sem custo mensal
  
  // Economia do autoconsumo = 100% (evitou pagar a tarifa da concessionária)
  const economiaAutoconsumo = valorAutoconsumoEvitado;
  
  // Economia da assinatura = 15% do compensado
  const economiaAssinatura = valorCreditosCompensados * (descontoPercent / 100);
  
  // Economia total
  const economiaTotal = economiaAutoconsumo + economiaAssinatura;
  
  // Consumo não compensado (seria calculado via tarifa, aqui é placeholder)
  const custoConsumoNaoCompensado = 0; // Vem da fatura da concessionária
  
  return {
    custoConsumoNaoCompensado,
    valorAutoconsumoEvitado,
    valorCreditosCompensados,
    custoAssinaturaRemota,
    custoPPALocal,
    economiaAutoconsumo,
    economiaAssinatura,
    economiaTotal,
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
