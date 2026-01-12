import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type ModalidadeEconomia = Database['public']['Enums']['modalidade_economia'];
export type ReferenciaDesconto = Database['public']['Enums']['referencia_desconto'];

export interface ClienteUsinaVinculo {
  id: string;
  cliente_id: string;
  usina_id: string;
  uc_beneficiaria_id: string;
  percentual_rateio: number;
  energia_contratada_kwh: number;
  desconto_garantido_percent: number;
  data_inicio_contrato: string | null;
  data_fim_contrato: string | null;
  numero_contrato: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos de modalidade de economia
  modalidade_economia: ModalidadeEconomia;
  tarifa_ppa_rs_kwh: number;
  referencia_desconto: ReferenciaDesconto;
}

export interface ClienteUsinaVinculoWithRelations extends ClienteUsinaVinculo {
  usinas_remotas: {
    id: string;
    nome: string;
    uc_geradora: string;
    modalidade_gd: string;
    fonte: string;
    potencia_instalada_kw: number;
  };
  unidades_consumidoras: {
    id: string;
    numero: string;
    endereco: string;
  };
}

export type ClienteUsinaVinculoInsert = Omit<ClienteUsinaVinculo, 'id' | 'created_at' | 'updated_at'>;
export type ClienteUsinaVinculoUpdate = Partial<ClienteUsinaVinculoInsert>;

export const useVinculosByCliente = (clienteId: string | undefined) => {
  return useQuery({
    queryKey: ['cliente_usina_vinculo', 'cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('cliente_usina_vinculo')
        .select(`
          *,
          usinas_remotas (
            id,
            nome,
            uc_geradora,
            modalidade_gd,
            fonte,
            potencia_instalada_kw
          ),
          unidades_consumidoras (
            id,
            numero,
            endereco
          )
        `)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClienteUsinaVinculoWithRelations[];
    },
    enabled: !!clienteId,
  });
};

export const useVinculosByUsina = (usinaId: string | undefined) => {
  return useQuery({
    queryKey: ['cliente_usina_vinculo', 'usina', usinaId],
    queryFn: async () => {
      if (!usinaId) return [];
      const { data, error } = await supabase
        .from('cliente_usina_vinculo')
        .select(`
          *,
          clientes (
            id,
            nome,
            cnpj
          ),
          unidades_consumidoras (
            id,
            numero,
            endereco
          )
        `)
        .eq('usina_id', usinaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!usinaId,
  });
};

export const useCreateVinculo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vinculo: ClienteUsinaVinculoInsert) => {
      const { data, error } = await supabase
        .from('cliente_usina_vinculo')
        .insert(vinculo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente_usina_vinculo'] });
    },
  });
};

export const useUpdateVinculo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClienteUsinaVinculoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('cliente_usina_vinculo')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente_usina_vinculo'] });
    },
  });
};

export const useDeleteVinculo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cliente_usina_vinculo')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente_usina_vinculo'] });
    },
  });
};
