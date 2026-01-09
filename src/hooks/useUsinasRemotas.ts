import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UsinaRemota {
  id: string;
  nome: string;
  uc_geradora: string;
  cnpj_titular: string;
  potencia_instalada_kw: number;
  fonte: 'solar' | 'eolica' | 'hidraulica' | 'biomassa' | 'outros';
  modalidade_gd: 'autoconsumo_remoto' | 'geracao_compartilhada' | 'consorcio' | 'cooperativa';
  distribuidora: string;
  endereco: string | null;
  data_conexao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type UsinaRemotaInsert = Omit<UsinaRemota, 'id' | 'created_at' | 'updated_at'>;
export type UsinaRemotaUpdate = Partial<UsinaRemotaInsert>;

export const useUsinasRemotas = () => {
  return useQuery({
    queryKey: ['usinas_remotas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usinas_remotas')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as UsinaRemota[];
    },
  });
};

export const useUsinaRemota = (id: string | undefined) => {
  return useQuery({
    queryKey: ['usinas_remotas', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('usinas_remotas')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as UsinaRemota | null;
    },
    enabled: !!id,
  });
};

export const useCreateUsinaRemota = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usina: UsinaRemotaInsert) => {
      const { data, error } = await supabase
        .from('usinas_remotas')
        .insert(usina)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usinas_remotas'] });
    },
  });
};

export const useUpdateUsinaRemota = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UsinaRemotaUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('usinas_remotas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usinas_remotas'] });
    },
  });
};

export const useDeleteUsinaRemota = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('usinas_remotas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usinas_remotas'] });
    },
  });
};
