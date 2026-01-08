import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type UnidadeConsumidora = Tables<'unidades_consumidoras'>;
export type UnidadeConsumidoraInsert = TablesInsert<'unidades_consumidoras'>;

export function useUnidadesConsumidoras(clienteId?: string) {
  return useQuery({
    queryKey: ['unidades_consumidoras', clienteId],
    queryFn: async () => {
      let query = supabase
        .from('unidades_consumidoras')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUnidadeConsumidora(id: string | undefined) {
  return useQuery({
    queryKey: ['unidades_consumidoras', 'single', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('unidades_consumidoras')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateUnidadeConsumidora() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (uc: UnidadeConsumidoraInsert) => {
      const { data, error } = await supabase
        .from('unidades_consumidoras')
        .insert(uc)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades_consumidoras'] });
    },
  });
}

export function useUpdateUnidadeConsumidora() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UnidadeConsumidora> & { id: string }) => {
      const { data, error } = await supabase
        .from('unidades_consumidoras')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades_consumidoras'] });
    },
  });
}

export function useDeleteUnidadeConsumidora() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unidades_consumidoras')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades_consumidoras'] });
    },
  });
}
