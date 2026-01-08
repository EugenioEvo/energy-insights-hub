import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type FaturaMensal = Tables<'faturas_mensais'>;
export type FaturaMensalInsert = TablesInsert<'faturas_mensais'>;

export function useFaturas(ucId?: string) {
  return useQuery({
    queryKey: ['faturas_mensais', ucId],
    queryFn: async () => {
      let query = supabase
        .from('faturas_mensais')
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

export function useFatura(id: string | undefined) {
  return useQuery({
    queryKey: ['faturas_mensais', 'single', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('faturas_mensais')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateFatura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (fatura: FaturaMensalInsert) => {
      const { data, error } = await supabase
        .from('faturas_mensais')
        .insert(fatura)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturas_mensais'] });
    },
  });
}

export function useUpsertFatura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (fatura: FaturaMensalInsert) => {
      const { data, error } = await supabase
        .from('faturas_mensais')
        .upsert(fatura, { onConflict: 'uc_id,mes_ref' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturas_mensais'] });
    },
  });
}

export function useUpdateFatura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FaturaMensal> & { id: string }) => {
      const { data, error } = await supabase
        .from('faturas_mensais')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturas_mensais'] });
    },
  });
}

export function useDeleteFatura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('faturas_mensais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturas_mensais'] });
    },
  });
}
