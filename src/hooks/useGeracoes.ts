import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type GeracaoMensal = Tables<'geracoes_mensais'>;
export type GeracaoMensalInsert = TablesInsert<'geracoes_mensais'>;

export function useGeracoes(ucId?: string) {
  return useQuery({
    queryKey: ['geracoes_mensais', ucId],
    queryFn: async () => {
      let query = supabase
        .from('geracoes_mensais')
        .select('*')
        .order('mes_ref', { ascending: false });
      
      if (ucId) {
        query = query.eq('uc_id', ucId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

export function useGeracao(id: string | undefined) {
  return useQuery({
    queryKey: ['geracoes_mensais', 'single', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('geracoes_mensais')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateGeracao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (geracao: GeracaoMensalInsert) => {
      const { data, error } = await supabase
        .from('geracoes_mensais')
        .insert(geracao)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geracoes_mensais'] });
    },
  });
}

export function useUpsertGeracao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (geracao: GeracaoMensalInsert) => {
      const { data, error } = await supabase
        .from('geracoes_mensais')
        .upsert(geracao, { onConflict: 'uc_id,mes_ref' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geracoes_mensais'] });
    },
  });
}

export function useUpdateGeracao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GeracaoMensal> & { id: string }) => {
      const { data, error } = await supabase
        .from('geracoes_mensais')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geracoes_mensais'] });
    },
  });
}

export function useDeleteGeracao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('geracoes_mensais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geracoes_mensais'] });
    },
  });
}
