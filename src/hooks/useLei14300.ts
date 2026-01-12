import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TransicaoLei14300 {
  id: string;
  ano: number;
  percentual_fio_b: number;
  percentual_encargos: number;
  descricao: string | null;
  vigente: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para buscar a tabela de transição da Lei 14.300
 */
export function useTransicaoLei14300() {
  return useQuery({
    queryKey: ['lei_14300_transicao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lei_14300_transicao')
        .select('*')
        .eq('vigente', true)
        .order('ano', { ascending: true });
      
      if (error) throw error;
      return data as TransicaoLei14300[];
    },
  });
}

/**
 * Hook para obter o percentual de Fio B para um ano específico
 */
export function usePercentualFioB(ano: number) {
  return useQuery({
    queryKey: ['lei_14300_transicao', 'percentual', ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lei_14300_transicao')
        .select('percentual_fio_b')
        .eq('ano', ano)
        .eq('vigente', true)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        // Retornar valores padrão se não encontrado no banco
        if (ano < 2023) return 0;
        if (ano >= 2029) return 100;
        return 100; // Valor conservador
      }
      
      return data.percentual_fio_b;
    },
  });
}

/**
 * Hook para classificar GD baseado na data de protocolo usando função do banco
 */
export function useClassificacaoGD(dataProtocolo: string | null) {
  return useQuery({
    queryKey: ['classificacao_gd', dataProtocolo],
    queryFn: async () => {
      if (!dataProtocolo) return 'gd2';
      
      const { data, error } = await supabase
        .rpc('classificar_gd', { data_protocolo: dataProtocolo });
      
      if (error) throw error;
      return (data as string) || 'gd2';
    },
    enabled: !!dataProtocolo,
  });
}

/**
 * Função helper para calcular ano de referência a partir de mes_ref (YYYY-MM)
 */
export function extrairAnoDeReferencia(mesRef: string): number {
  const ano = parseInt(mesRef.split('-')[0], 10);
  return isNaN(ano) ? new Date().getFullYear() : ano;
}
