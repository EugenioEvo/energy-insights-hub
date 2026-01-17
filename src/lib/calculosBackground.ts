/**
 * CÁLCULOS EM BACKGROUND
 * Centraliza todos os cálculos automáticos de tarifa, tributos e compensação GD
 * que antes eram feitos manualmente nos steps de itens de fatura e tributos
 */

import type { FaturaWizardData } from '@/components/wizard/WizardContext';
import { obterPercentualFioB } from '@/lib/lei14300';

export type ClassificacaoGDSimples = 'gd1' | 'gd2';

// Tipo para tarifa (simplificado)
export interface TarifaSimplificada {
  te_ponta_rs_kwh?: number | null;
  te_fora_ponta_rs_kwh?: number | null;
  te_reservado_rs_kwh?: number | null;
  te_unica_rs_kwh?: number | null;
  tusd_ponta_rs_kwh?: number | null;
  tusd_fora_ponta_rs_kwh?: number | null;
  tusd_reservado_rs_kwh?: number | null;
  tusd_unica_rs_kwh?: number | null;
  tusd_fio_a_rs_kwh?: number | null;
  tusd_fio_b_rs_kwh?: number | null;
  tusd_encargos_rs_kwh?: number | null;
  bandeira_verde_rs_kwh?: number | null;
  bandeira_amarela_rs_kwh?: number | null;
  bandeira_vermelha1_rs_kwh?: number | null;
  bandeira_vermelha2_rs_kwh?: number | null;
  demanda_ponta_rs_kw?: number | null;
  demanda_fora_ponta_rs_kw?: number | null;
  demanda_unica_rs_kw?: number | null;
  pis_percent?: number | null;
  cofins_percent?: number | null;
  icms_percent?: number | null;
}

export interface CalculosCompletos {
  // Classificação GD
  classificacaoGD: ClassificacaoGDSimples;
  percentualFioB: number;
  anoRef: number;
  
  // Créditos
  creditosProprios: number;
  creditosRemotos: number;
  totalCreditos: number;
  consumoRede: number;
  consumoCompensado: number;
  consumoNaoCompensado: number;
  creditosSobrando: number;
  
  // Itens Fatura (R$)
  bandeira_te_p_rs: number;
  bandeira_te_fp_rs: number;
  bandeira_te_hr_rs: number;
  nao_compensado_tusd_p_rs: number;
  nao_compensado_tusd_fp_rs: number;
  nao_compensado_tusd_hr_rs: number;
  nao_compensado_te_p_rs: number;
  nao_compensado_te_fp_rs: number;
  nao_compensado_te_hr_rs: number;
  scee_consumo_fp_tusd_rs: number;
  scee_parcela_te_fp_rs: number;
  scee_injecao_fp_te_rs: number;
  scee_injecao_fp_tusd_rs: number;
  
  // Demanda
  valor_demanda_rs: number;
  valor_demanda_ultrapassagem_rs: number;
  
  // Não compensáveis (GD2)
  encargosNaoCompensados: number;
  fioBNaoCompensado: number;
  
  // Tributos
  base_pis_cofins_rs: number;
  pis_aliquota_percent: number;
  pis_rs: number;
  cofins_aliquota_percent: number;
  cofins_rs: number;
  base_icms_rs: number;
  icms_aliquota_percent: number;
  icms_rs: number;
  
  // Totais
  totalBandeiras: number;
  totalTUSD: number;
  totalTE: number;
  totalSCEE: number;
  totalDemanda: number;
  totalTributos: number;
  valorFaturaCalculado: number;
}

/**
 * Calcula todos os valores de fatura automaticamente
 */
export function calcularFaturaCompleta(
  data: FaturaWizardData, 
  tarifa: TarifaSimplificada | null,
  isGrupoA: boolean
): CalculosCompletos {
  // === CLASSIFICAÇÃO GD ===
  const anoRef: number = data.mes_ref 
    ? parseInt(data.mes_ref.split('-')[0])
    : new Date().getFullYear();
  // Usar classificação selecionada no Step 4, ou padrão GD2
  const classificacaoGD: ClassificacaoGDSimples = (data.classificacao_gd_aplicada as ClassificacaoGDSimples) || 'gd2';
  const percentualFioB: number = classificacaoGD === 'gd1' ? 0 : obterPercentualFioB(anoRef);
  
  // === CRÉDITOS ===
  const creditosProprios = isGrupoA
    ? (data.injecao_ponta_kwh || 0) + (data.injecao_fp_kwh || 0) + (data.injecao_hr_kwh || 0)
    : (data.injecao_total_kwh || 0);
  
  const creditosRemotos = data.credito_remoto_kwh || data.scee_credito_recebido_kwh || 0;
  const totalCreditos = creditosProprios + creditosRemotos;
  const consumoRede = data.consumo_total_kwh || 0;
  const consumoCompensado = Math.min(consumoRede, totalCreditos);
  const consumoNaoCompensado = Math.max(0, consumoRede - totalCreditos);
  const creditosSobrando = Math.max(0, totalCreditos - consumoRede);
  
  // === CONSUMO NÃO COMPENSADO POR POSTO ===
  let naoCompPonta = 0, naoCompFP = 0, naoCompHR = 0;
  
  if (isGrupoA && consumoNaoCompensado > 0) {
    const pontaConsumo = Math.max(0, (data.consumo_ponta_kwh || 0) - (data.autoconsumo_ponta_kwh || 0));
    const fpConsumo = Math.max(0, (data.consumo_fora_ponta_kwh || 0) - (data.autoconsumo_fp_kwh || 0));
    const hrConsumo = Math.max(0, (data.consumo_reservado_kwh || 0) - (data.autoconsumo_hr_kwh || 0));
    const totalPorPosto = pontaConsumo + fpConsumo + hrConsumo;
    
    if (totalPorPosto > 0) {
      const fator = consumoNaoCompensado / totalPorPosto;
      naoCompPonta = pontaConsumo * fator;
      naoCompFP = fpConsumo * fator;
      naoCompHR = hrConsumo * fator;
    }
  } else {
    naoCompFP = consumoNaoCompensado;
  }
  
  // === VALORES TARIFÁRIOS ===
  if (!tarifa) {
    // Retorna zeros se não há tarifa
    return criarCalculosZerados(anoRef, classificacaoGD, percentualFioB, {
      creditosProprios, creditosRemotos, totalCreditos, consumoRede,
      consumoCompensado, consumoNaoCompensado, creditosSobrando
    });
  }
  
  // Bandeira
  const bandeira = data.bandeira || 'verde';
  let bandeiraTarifa = 0;
  switch (bandeira) {
    case 'verde': bandeiraTarifa = tarifa.bandeira_verde_rs_kwh || 0; break;
    case 'amarela': bandeiraTarifa = tarifa.bandeira_amarela_rs_kwh || 0; break;
    case 'vermelha1': bandeiraTarifa = tarifa.bandeira_vermelha1_rs_kwh || 0; break;
    case 'vermelha2': bandeiraTarifa = tarifa.bandeira_vermelha2_rs_kwh || 0; break;
  }
  
  // Componentes tarifários
  const te = tarifa.te_fora_ponta_rs_kwh || tarifa.te_unica_rs_kwh || 0;
  const tusdCompleta = tarifa.tusd_fora_ponta_rs_kwh || tarifa.tusd_unica_rs_kwh || 0;
  const tusdFioA = tarifa.tusd_fio_a_rs_kwh || 0;
  const tusdFioB = tarifa.tusd_fio_b_rs_kwh || 0;
  const tusdEncargos = tarifa.tusd_encargos_rs_kwh || 0;
  
  const isGD1: boolean = classificacaoGD === 'gd1' as ClassificacaoGDSimples;
  
  // === SCEE COMPENSAÇÃO ===
  let scee_consumo_fp_tusd = 0, scee_parcela_te_fp = 0;
  let scee_injecao_fp_te = 0, scee_injecao_fp_tusd = 0;
  let encargosNaoCompensados = 0, fioBNaoCompensado = 0;
  
  if (isGD1) {
    scee_consumo_fp_tusd = consumoCompensado * tusdCompleta;
    scee_parcela_te_fp = consumoCompensado * te;
    scee_injecao_fp_te = -(creditosProprios * te);
    scee_injecao_fp_tusd = -(creditosProprios * tusdCompleta);
  } else {
    scee_parcela_te_fp = consumoCompensado * te;
    const percentualFioBNaoCompensavel = percentualFioB / 100;
    const fioBCompensavel = tusdFioB * (1 - percentualFioBNaoCompensavel);
    fioBNaoCompensado = tusdFioB * percentualFioBNaoCompensavel * consumoCompensado;
    const tusdCompensavel = tusdFioA + fioBCompensavel;
    scee_consumo_fp_tusd = consumoCompensado * tusdCompensavel;
    encargosNaoCompensados = tusdEncargos * consumoCompensado;
    scee_injecao_fp_te = -(creditosProprios * te);
    scee_injecao_fp_tusd = -(creditosProprios * tusdCompensavel);
  }
  
  // === ITENS FATURA ===
  let bandeira_te_p_rs = 0, bandeira_te_fp_rs = 0, bandeira_te_hr_rs = 0;
  let nao_compensado_tusd_p_rs = 0, nao_compensado_tusd_fp_rs = 0, nao_compensado_tusd_hr_rs = 0;
  let nao_compensado_te_p_rs = 0, nao_compensado_te_fp_rs = 0, nao_compensado_te_hr_rs = 0;
  
  if (isGrupoA) {
    bandeira_te_p_rs = (data.consumo_ponta_kwh || 0) * bandeiraTarifa;
    bandeira_te_fp_rs = (data.consumo_fora_ponta_kwh || 0) * bandeiraTarifa;
    bandeira_te_hr_rs = (data.consumo_reservado_kwh || 0) * bandeiraTarifa;
    
    nao_compensado_tusd_p_rs = naoCompPonta * (tarifa.tusd_ponta_rs_kwh || 0);
    nao_compensado_tusd_fp_rs = naoCompFP * (tarifa.tusd_fora_ponta_rs_kwh || 0);
    nao_compensado_tusd_hr_rs = naoCompHR * (tarifa.tusd_reservado_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh || 0);
    
    nao_compensado_te_p_rs = naoCompPonta * (tarifa.te_ponta_rs_kwh || 0);
    nao_compensado_te_fp_rs = naoCompFP * (tarifa.te_fora_ponta_rs_kwh || 0);
    nao_compensado_te_hr_rs = naoCompHR * (tarifa.te_reservado_rs_kwh || tarifa.te_fora_ponta_rs_kwh || 0);
  } else {
    bandeira_te_fp_rs = consumoRede * bandeiraTarifa;
    nao_compensado_tusd_fp_rs = consumoNaoCompensado * (tarifa.tusd_unica_rs_kwh || 0);
    nao_compensado_te_fp_rs = consumoNaoCompensado * (tarifa.te_unica_rs_kwh || 0);
  }
  
  // === DEMANDA ===
  const demandaFaturada = Math.max(data.demanda_contratada_kw || 0, data.demanda_medida_kw || 0);
  const tarifaDemanda = tarifa.demanda_unica_rs_kw || tarifa.demanda_fora_ponta_rs_kw || 0;
  const valor_demanda_rs = demandaFaturada * tarifaDemanda;
  const valor_demanda_ultrapassagem_rs = (data.demanda_ultrapassagem_kw || 0) * tarifaDemanda * 2;
  
  // === TOTAIS ===
  const totalBandeiras = bandeira_te_p_rs + bandeira_te_fp_rs + bandeira_te_hr_rs;
  const totalTUSD = nao_compensado_tusd_p_rs + nao_compensado_tusd_fp_rs + nao_compensado_tusd_hr_rs;
  const totalTE = nao_compensado_te_p_rs + nao_compensado_te_fp_rs + nao_compensado_te_hr_rs;
  const totalSCEE = scee_consumo_fp_tusd + scee_parcela_te_fp + scee_injecao_fp_te + scee_injecao_fp_tusd;
  const totalDemanda = valor_demanda_rs + valor_demanda_ultrapassagem_rs;
  
  // === TRIBUTOS ===
  const base_pis_cofins_rs = totalBandeiras + totalTUSD + totalTE + totalSCEE + totalDemanda + (data.cip_rs || 0);
  const pis_aliquota_percent = tarifa.pis_percent || 0.5358;
  const cofins_aliquota_percent = tarifa.cofins_percent || 2.4769;
  const icms_aliquota_percent = tarifa.icms_percent || 29;
  
  const pis_rs = base_pis_cofins_rs * (pis_aliquota_percent / 100);
  const cofins_rs = base_pis_cofins_rs * (cofins_aliquota_percent / 100);
  const base_icms_rs = base_pis_cofins_rs + pis_rs + cofins_rs; // Cálculo por dentro
  const icms_rs = base_icms_rs * (icms_aliquota_percent / 100);
  
  const totalTributos = pis_rs + cofins_rs + icms_rs;
  const valorFaturaCalculado = base_pis_cofins_rs + totalTributos;
  
  return {
    classificacaoGD,
    percentualFioB,
    anoRef,
    creditosProprios,
    creditosRemotos,
    totalCreditos,
    consumoRede,
    consumoCompensado,
    consumoNaoCompensado,
    creditosSobrando,
    bandeira_te_p_rs: round(bandeira_te_p_rs),
    bandeira_te_fp_rs: round(bandeira_te_fp_rs),
    bandeira_te_hr_rs: round(bandeira_te_hr_rs),
    nao_compensado_tusd_p_rs: round(nao_compensado_tusd_p_rs),
    nao_compensado_tusd_fp_rs: round(nao_compensado_tusd_fp_rs),
    nao_compensado_tusd_hr_rs: round(nao_compensado_tusd_hr_rs),
    nao_compensado_te_p_rs: round(nao_compensado_te_p_rs),
    nao_compensado_te_fp_rs: round(nao_compensado_te_fp_rs),
    nao_compensado_te_hr_rs: round(nao_compensado_te_hr_rs),
    scee_consumo_fp_tusd_rs: round(scee_consumo_fp_tusd),
    scee_parcela_te_fp_rs: round(scee_parcela_te_fp),
    scee_injecao_fp_te_rs: round(scee_injecao_fp_te),
    scee_injecao_fp_tusd_rs: round(scee_injecao_fp_tusd),
    valor_demanda_rs: round(valor_demanda_rs),
    valor_demanda_ultrapassagem_rs: round(valor_demanda_ultrapassagem_rs),
    encargosNaoCompensados: round(encargosNaoCompensados),
    fioBNaoCompensado: round(fioBNaoCompensado),
    base_pis_cofins_rs: round(base_pis_cofins_rs),
    pis_aliquota_percent,
    pis_rs: round(pis_rs),
    cofins_aliquota_percent,
    cofins_rs: round(cofins_rs),
    base_icms_rs: round(base_icms_rs),
    icms_aliquota_percent,
    icms_rs: round(icms_rs),
    totalBandeiras: round(totalBandeiras),
    totalTUSD: round(totalTUSD),
    totalTE: round(totalTE),
    totalSCEE: round(totalSCEE),
    totalDemanda: round(totalDemanda),
    totalTributos: round(totalTributos),
    valorFaturaCalculado: round(valorFaturaCalculado),
  };
}

function round(value: number): number {
  return parseFloat(value.toFixed(2));
}

function criarCalculosZerados(
  anoRef: number,
  classificacaoGD: ClassificacaoGDSimples,
  percentualFioB: number,
  creditos: {
    creditosProprios: number;
    creditosRemotos: number;
    totalCreditos: number;
    consumoRede: number;
    consumoCompensado: number;
    consumoNaoCompensado: number;
    creditosSobrando: number;
  }
): CalculosCompletos {
  return {
    classificacaoGD,
    percentualFioB,
    anoRef,
    ...creditos,
    bandeira_te_p_rs: 0,
    bandeira_te_fp_rs: 0,
    bandeira_te_hr_rs: 0,
    nao_compensado_tusd_p_rs: 0,
    nao_compensado_tusd_fp_rs: 0,
    nao_compensado_tusd_hr_rs: 0,
    nao_compensado_te_p_rs: 0,
    nao_compensado_te_fp_rs: 0,
    nao_compensado_te_hr_rs: 0,
    scee_consumo_fp_tusd_rs: 0,
    scee_parcela_te_fp_rs: 0,
    scee_injecao_fp_te_rs: 0,
    scee_injecao_fp_tusd_rs: 0,
    valor_demanda_rs: 0,
    valor_demanda_ultrapassagem_rs: 0,
    encargosNaoCompensados: 0,
    fioBNaoCompensado: 0,
    base_pis_cofins_rs: 0,
    pis_aliquota_percent: 0.5358,
    pis_rs: 0,
    cofins_aliquota_percent: 2.4769,
    cofins_rs: 0,
    base_icms_rs: 0,
    icms_aliquota_percent: 29,
    icms_rs: 0,
    totalBandeiras: 0,
    totalTUSD: 0,
    totalTE: 0,
    totalSCEE: 0,
    totalDemanda: 0,
    totalTributos: 0,
    valorFaturaCalculado: 0,
  };
}
