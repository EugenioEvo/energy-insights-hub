import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TarifaConcessionaria = {
  id: string;
  concessionaria: string;
  grupo_tarifario: 'A' | 'B';
  subgrupo: string | null;
  modalidade: string | null;
  
  // TE
  te_ponta_rs_kwh: number;
  te_fora_ponta_rs_kwh: number;
  te_reservado_rs_kwh: number;
  te_unica_rs_kwh: number;
  
  // TUSD
  tusd_ponta_rs_kwh: number;
  tusd_fora_ponta_rs_kwh: number;
  tusd_reservado_rs_kwh: number;
  tusd_unica_rs_kwh: number;
  tusd_fio_a_rs_kwh: number;
  tusd_fio_b_rs_kwh: number;
  tusd_encargos_rs_kwh: number;
  
  // Demanda
  demanda_ponta_rs_kw: number;
  demanda_fora_ponta_rs_kw: number;
  demanda_unica_rs_kw: number;
  demanda_geracao_rs_kw: number;
  demanda_ultrapassagem_rs_kw: number;
  
  // Bandeiras
  bandeira_verde_rs_kwh: number;
  bandeira_amarela_rs_kwh: number;
  bandeira_vermelha1_rs_kwh: number;
  bandeira_vermelha2_rs_kwh: number;
  
  // Tributos
  icms_percent: number;
  pis_percent: number;
  cofins_percent: number;
  
  vigencia_inicio: string;
  vigencia_fim: string | null;
  resolucao_aneel: string | null;
  ativo: boolean;
};

export type CalculoTarifasInput = {
  tarifa: TarifaConcessionaria;
  consumoPontaKwh: number;
  consumoForaPontaKwh: number;
  consumoReservadoKwh: number;
  consumoTotalKwh: number;
  demandaContratadaKw: number;
  demandaMedidaKw: number;
  demandaGeracaoKw: number;
  demandaUltrapassagemKw: number;
  bandeira: 'verde' | 'amarela' | 'vermelha1' | 'vermelha2';
  grupoTarifario: 'A' | 'B';
};

export type CalculoTarifasResult = {
  // TE por posto
  te_ponta_rs: number;
  te_fora_ponta_rs: number;
  te_reservado_rs: number;
  te_total_rs: number;
  
  // TUSD por posto
  tusd_ponta_rs: number;
  tusd_fora_ponta_rs: number;
  tusd_reservado_rs: number;
  tusd_total_rs: number;
  
  // Componentes TUSD
  tusd_fio_a_rs: number;
  tusd_fio_b_rs: number;
  tusd_encargos_rs: number;
  
  // Demanda
  demanda_contratada_rs: number;
  demanda_geracao_rs: number;
  demanda_ultrapassagem_rs: number;
  demanda_total_rs: number;
  
  // Bandeira
  bandeira_rs: number;
  
  // Subtotais
  energia_rs: number; // TE + TUSD energia
  
  // Tarifa média calculada
  tarifa_media_rs_kwh: number;
};

/**
 * Calcula valores monetários baseado nas tarifas e consumo
 */
export function calcularValoresTarifas(input: CalculoTarifasInput): CalculoTarifasResult {
  const { tarifa, grupoTarifario, bandeira } = input;
  
  let te_ponta_rs = 0;
  let te_fora_ponta_rs = 0;
  let te_reservado_rs = 0;
  let tusd_ponta_rs = 0;
  let tusd_fora_ponta_rs = 0;
  let tusd_reservado_rs = 0;
  let demanda_contratada_rs = 0;
  let demanda_geracao_rs = 0;
  let demanda_ultrapassagem_rs = 0;
  
  if (grupoTarifario === 'A') {
    // Grupo A - por posto horário
    te_ponta_rs = input.consumoPontaKwh * tarifa.te_ponta_rs_kwh;
    te_fora_ponta_rs = input.consumoForaPontaKwh * tarifa.te_fora_ponta_rs_kwh;
    te_reservado_rs = input.consumoReservadoKwh * (tarifa.te_reservado_rs_kwh || tarifa.te_fora_ponta_rs_kwh);
    
    tusd_ponta_rs = input.consumoPontaKwh * tarifa.tusd_ponta_rs_kwh;
    tusd_fora_ponta_rs = input.consumoForaPontaKwh * tarifa.tusd_fora_ponta_rs_kwh;
    tusd_reservado_rs = input.consumoReservadoKwh * (tarifa.tusd_reservado_rs_kwh || tarifa.tusd_fora_ponta_rs_kwh);
    
    // Demanda
    demanda_contratada_rs = input.demandaContratadaKw * tarifa.demanda_unica_rs_kw;
    demanda_geracao_rs = input.demandaGeracaoKw * tarifa.demanda_geracao_rs_kw;
    demanda_ultrapassagem_rs = input.demandaUltrapassagemKw * tarifa.demanda_ultrapassagem_rs_kw;
  } else {
    // Grupo B - tarifa única
    const te_unica = input.consumoTotalKwh * tarifa.te_unica_rs_kwh;
    te_fora_ponta_rs = te_unica; // Armazena no FP para compatibilidade
    
    const tusd_unica = input.consumoTotalKwh * tarifa.tusd_unica_rs_kwh;
    tusd_fora_ponta_rs = tusd_unica;
  }
  
  const te_total_rs = te_ponta_rs + te_fora_ponta_rs + te_reservado_rs;
  const tusd_total_rs = tusd_ponta_rs + tusd_fora_ponta_rs + tusd_reservado_rs;
  
  // Componentes TUSD detalhados (proporcional ao consumo total)
  const consumoTotal = input.consumoTotalKwh || 1;
  const tusd_fio_a_rs = consumoTotal * tarifa.tusd_fio_a_rs_kwh;
  const tusd_fio_b_rs = consumoTotal * tarifa.tusd_fio_b_rs_kwh;
  const tusd_encargos_rs = consumoTotal * tarifa.tusd_encargos_rs_kwh;
  
  // Bandeira tarifária (aplica sobre consumo total)
  let bandeira_tarifa = 0;
  switch (bandeira) {
    case 'verde':
      bandeira_tarifa = tarifa.bandeira_verde_rs_kwh;
      break;
    case 'amarela':
      bandeira_tarifa = tarifa.bandeira_amarela_rs_kwh;
      break;
    case 'vermelha1':
      bandeira_tarifa = tarifa.bandeira_vermelha1_rs_kwh;
      break;
    case 'vermelha2':
      bandeira_tarifa = tarifa.bandeira_vermelha2_rs_kwh;
      break;
  }
  const bandeira_rs = consumoTotal * bandeira_tarifa;
  
  const demanda_total_rs = demanda_contratada_rs + demanda_geracao_rs + demanda_ultrapassagem_rs;
  const energia_rs = te_total_rs + tusd_total_rs;
  
  // Tarifa média (R$/kWh)
  const tarifa_media_rs_kwh = consumoTotal > 0 
    ? (energia_rs + bandeira_rs) / consumoTotal 
    : 0;
  
  return {
    te_ponta_rs,
    te_fora_ponta_rs,
    te_reservado_rs,
    te_total_rs,
    tusd_ponta_rs,
    tusd_fora_ponta_rs,
    tusd_reservado_rs,
    tusd_total_rs,
    tusd_fio_a_rs,
    tusd_fio_b_rs,
    tusd_encargos_rs,
    demanda_contratada_rs,
    demanda_geracao_rs,
    demanda_ultrapassagem_rs,
    demanda_total_rs,
    bandeira_rs,
    energia_rs,
    tarifa_media_rs_kwh,
  };
}

/**
 * Hook para buscar tarifas vigentes da concessionária
 */
export function useTarifas(
  concessionaria: string | null,
  grupoTarifario: 'A' | 'B' | null,
  modalidade?: string | null
) {
  return useQuery({
    queryKey: ['tarifas', concessionaria, grupoTarifario, modalidade],
    queryFn: async () => {
      if (!concessionaria || !grupoTarifario) return null;
      
      let query = supabase
        .from('tarifas_concessionaria')
        .select('*')
        .eq('concessionaria', concessionaria)
        .eq('grupo_tarifario', grupoTarifario)
        .eq('ativo', true)
        .lte('vigencia_inicio', new Date().toISOString().split('T')[0])
        .order('vigencia_inicio', { ascending: false })
        .limit(1);
      
      // Para Grupo A, filtra por modalidade (case-insensitive)
      // Para Grupo B, não filtra por modalidade pois geralmente é convencional
      if (modalidade && grupoTarifario === 'A') {
        query = query.ilike('modalidade', modalidade);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar tarifas:', error);
        throw error;
      }
      
      return data?.[0] as TarifaConcessionaria | null;
    },
    enabled: !!concessionaria && !!grupoTarifario,
    staleTime: 1000 * 60 * 60, // 1 hora - tarifas não mudam frequentemente
  });
}

/**
 * Hook para listar todas as tarifas disponíveis
 */
export function useTodasTarifas() {
  return useQuery({
    queryKey: ['tarifas', 'todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarifas_concessionaria')
        .select('*')
        .eq('ativo', true)
        .order('concessionaria', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar tarifas:', error);
        throw error;
      }
      
      return data as TarifaConcessionaria[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Retorna lista de concessionárias com tarifas cadastradas
 */
export function useConcessionariasComTarifas() {
  return useQuery({
    queryKey: ['tarifas', 'concessionarias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarifas_concessionaria')
        .select('concessionaria')
        .eq('ativo', true);
      
      if (error) {
        console.error('Erro ao buscar concessionárias:', error);
        throw error;
      }
      
      // Retorna lista única de concessionárias
      const unique = [...new Set(data?.map(t => t.concessionaria) || [])];
      return unique.sort();
    },
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook para buscar tarifas disponíveis para uma concessionária específica
 * Útil para mostrar fallback quando não encontra a tarifa desejada
 */
export function useTarifasDisponiveis(concessionaria: string | null) {
  return useQuery({
    queryKey: ['tarifas', 'disponiveis', concessionaria],
    queryFn: async () => {
      if (!concessionaria) return [];
      
      const { data, error } = await supabase
        .from('tarifas_concessionaria')
        .select('id, concessionaria, grupo_tarifario, subgrupo, modalidade, vigencia_inicio, resolucao_aneel')
        .eq('ativo', true)
        .ilike('concessionaria', `%${concessionaria}%`)
        .order('grupo_tarifario', { ascending: true })
        .order('modalidade', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar tarifas disponíveis:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!concessionaria,
    staleTime: 1000 * 60 * 60,
  });
}
