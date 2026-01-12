import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UsinaGeracaoMensal {
  id: string;
  usina_id: string;
  mes_ref: string;
  geracao_total_kwh: number;
  geracao_ponta_kwh: number;
  geracao_fora_ponta_kwh: number;
  geracao_reservado_kwh: number;
  fator_capacidade_percent: number | null;
  disponibilidade_percent: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type UsinaGeracaoMensalInsert = Omit<UsinaGeracaoMensal, 'id' | 'created_at' | 'updated_at'>;
export type UsinaGeracaoMensalUpdate = Partial<UsinaGeracaoMensalInsert>;

export const useUsinaGeracaoMensal = (usinaId: string | undefined) => {
  return useQuery({
    queryKey: ['usina_geracao_mensal', usinaId],
    queryFn: async () => {
      if (!usinaId) return [];
      const { data, error } = await supabase
        .from('usina_geracao_mensal')
        .select('*')
        .eq('usina_id', usinaId)
        .order('mes_ref', { ascending: false });

      if (error) throw error;
      return data as UsinaGeracaoMensal[];
    },
    enabled: !!usinaId,
  });
};

export const useGeracaoMensalById = (geracaoId: string | undefined) => {
  return useQuery({
    queryKey: ['usina_geracao_mensal', 'detail', geracaoId],
    queryFn: async () => {
      if (!geracaoId) return null;
      const { data, error } = await supabase
        .from('usina_geracao_mensal')
        .select('*')
        .eq('id', geracaoId)
        .maybeSingle();

      if (error) throw error;
      return data as UsinaGeracaoMensal | null;
    },
    enabled: !!geracaoId,
  });
};

export const useCreateGeracaoMensal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (geracao: UsinaGeracaoMensalInsert) => {
      const { data, error } = await supabase
        .from('usina_geracao_mensal')
        .insert(geracao)
        .select()
        .single();

      if (error) throw error;
      return data as UsinaGeracaoMensal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['usina_geracao_mensal', data.usina_id] });
      queryClient.invalidateQueries({ queryKey: ['usina_geracao_mensal'] });
    },
  });
};

export const useUpdateGeracaoMensal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UsinaGeracaoMensalUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('usina_geracao_mensal')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UsinaGeracaoMensal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usina_geracao_mensal'] });
    },
  });
};

export const useDeleteGeracaoMensal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('usina_geracao_mensal')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usina_geracao_mensal'] });
      queryClient.invalidateQueries({ queryKey: ['usina_rateio_mensal'] });
    },
  });
};
