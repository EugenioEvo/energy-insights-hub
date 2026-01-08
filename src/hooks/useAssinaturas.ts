import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type AssinaturaMensal = Tables<'assinaturas_mensais'>;
export type AssinaturaMensalInsert = TablesInsert<'assinaturas_mensais'>;

export function useAssinaturas(ucId?: string) {
  return useQuery({
    queryKey: ['assinaturas_mensais', ucId],
    queryFn: async () => {
      let query = supabase
        .from('assinaturas_mensais')
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

export function useAssinatura(id: string | undefined) {
  return useQuery({
    queryKey: ['assinaturas_mensais', 'single', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('assinaturas_mensais')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAssinatura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assinatura: AssinaturaMensalInsert) => {
      const { data, error } = await supabase
        .from('assinaturas_mensais')
        .insert(assinatura)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assinaturas_mensais'] });
    },
  });
}

export function useUpsertAssinatura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assinatura: AssinaturaMensalInsert) => {
      const { data, error } = await supabase
        .from('assinaturas_mensais')
        .upsert(assinatura, { onConflict: 'uc_id,mes_ref' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assinaturas_mensais'] });
    },
  });
}

export function useUpdateAssinatura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AssinaturaMensal> & { id: string }) => {
      const { data, error } = await supabase
        .from('assinaturas_mensais')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assinaturas_mensais'] });
    },
  });
}

export function useDeleteAssinatura() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assinaturas_mensais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assinaturas_mensais'] });
    },
  });
}
