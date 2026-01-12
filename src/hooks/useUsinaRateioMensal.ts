import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UsinaRateioMensal {
  id: string;
  geracao_id: string;
  vinculo_id: string;
  uc_beneficiaria_id: string;
  energia_alocada_kwh: number;
  energia_ponta_kwh: number;
  energia_fora_ponta_kwh: number;
  energia_reservado_kwh: number;
  percentual_aplicado: number;
  valor_fatura_usina_rs: number;
  valor_compensado_estimado_rs: number;
  status: 'pendente' | 'utilizado' | 'expirado';
  created_at: string;
  updated_at: string;
}

export interface RateioWithRelations extends UsinaRateioMensal {
  geracao?: {
    mes_ref: string;
    geracao_total_kwh: number;
    usina_id: string;
  };
  vinculo?: {
    cliente_id: string;
    desconto_garantido_percent: number;
    modalidade_economia: string;
    tarifa_ppa_rs_kwh: number;
  };
  unidade?: {
    numero: string;
    endereco: string;
    cliente_id: string;
  };
}

export type UsinaRateioMensalInsert = Omit<UsinaRateioMensal, 'id' | 'created_at' | 'updated_at'>;
export type UsinaRateioMensalUpdate = Partial<UsinaRateioMensalInsert>;

// Buscar rateios por geração (usina mensal)
export const useRateiosByGeracao = (geracaoId: string | undefined) => {
  return useQuery({
    queryKey: ['usina_rateio_mensal', 'geracao', geracaoId],
    queryFn: async () => {
      if (!geracaoId) return [];
      const { data, error } = await supabase
        .from('usina_rateio_mensal')
        .select(`
          *,
          vinculo:cliente_usina_vinculo(
            cliente_id,
            desconto_garantido_percent,
            modalidade_economia,
            tarifa_ppa_rs_kwh
          ),
          unidade:unidades_consumidoras(
            numero,
            endereco,
            cliente_id
          )
        `)
        .eq('geracao_id', geracaoId);

      if (error) throw error;
      return data as RateioWithRelations[];
    },
    enabled: !!geracaoId,
  });
};

// Buscar rateio específico para uma UC em um mês
export const useRateioByUCMes = (ucId: string | undefined, mesRef: string | undefined) => {
  return useQuery({
    queryKey: ['usina_rateio_mensal', 'uc', ucId, mesRef],
    queryFn: async () => {
      if (!ucId || !mesRef) return null;
      
      const { data, error } = await supabase
        .from('usina_rateio_mensal')
        .select(`
          *,
          geracao:usina_geracao_mensal(
            mes_ref,
            geracao_total_kwh,
            usina_id
          ),
          vinculo:cliente_usina_vinculo(
            cliente_id,
            desconto_garantido_percent,
            modalidade_economia,
            tarifa_ppa_rs_kwh
          )
        `)
        .eq('uc_beneficiaria_id', ucId)
        .eq('geracao.mes_ref', mesRef)
        .maybeSingle();

      if (error) throw error;
      return data as RateioWithRelations | null;
    },
    enabled: !!ucId && !!mesRef,
  });
};

// Buscar todos os rateios de uma UC (histórico)
export const useRateiosByUC = (ucId: string | undefined) => {
  return useQuery({
    queryKey: ['usina_rateio_mensal', 'uc', ucId],
    queryFn: async () => {
      if (!ucId) return [];
      
      const { data, error } = await supabase
        .from('usina_rateio_mensal')
        .select(`
          *,
          geracao:usina_geracao_mensal(
            mes_ref,
            geracao_total_kwh,
            usina_id
          )
        `)
        .eq('uc_beneficiaria_id', ucId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RateioWithRelations[];
    },
    enabled: !!ucId,
  });
};

export const useCreateRateio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rateio: UsinaRateioMensalInsert) => {
      const { data, error } = await supabase
        .from('usina_rateio_mensal')
        .insert(rateio)
        .select()
        .single();

      if (error) throw error;
      return data as UsinaRateioMensal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['usina_rateio_mensal'] });
    },
  });
};

export const useCreateRateiosBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rateios: UsinaRateioMensalInsert[]) => {
      const { data, error } = await supabase
        .from('usina_rateio_mensal')
        .insert(rateios)
        .select();

      if (error) throw error;
      return data as UsinaRateioMensal[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usina_rateio_mensal'] });
    },
  });
};

export const useUpdateRateio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UsinaRateioMensalUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('usina_rateio_mensal')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UsinaRateioMensal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usina_rateio_mensal'] });
    },
  });
};

export const useDeleteRateio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('usina_rateio_mensal')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usina_rateio_mensal'] });
    },
  });
};
