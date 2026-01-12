-- Adicionar campos para separar geração local de créditos remotos
-- E garantir que grupo_tarifario seja tratado corretamente

-- Campos de Geração Local (Usina junto à carga)
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS geracao_local_total_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS autoconsumo_ponta_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS autoconsumo_fp_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS autoconsumo_hr_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS autoconsumo_total_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS autoconsumo_rs numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS injecao_ponta_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS injecao_fp_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS injecao_hr_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS injecao_total_kwh numeric DEFAULT 0;

-- Campos de Créditos Remotos (Da usina assinada)
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS credito_remoto_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS credito_remoto_compensado_rs numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS custo_assinatura_rs numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS economia_liquida_rs numeric DEFAULT 0;

-- Campos adicionais para controle
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS consumo_residual_kwh numeric DEFAULT 0;
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS consumo_final_kwh numeric DEFAULT 0;

-- Criar enum para grupo tarifário se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grupo_tarifario') THEN
    CREATE TYPE public.grupo_tarifario AS ENUM ('A', 'B');
  END IF;
END $$;

-- Adicionar campo grupo_tarifario à tabela faturas_mensais para registro histórico
ALTER TABLE public.faturas_mensais ADD COLUMN IF NOT EXISTS grupo_tarifario text DEFAULT 'A';

-- Comentários explicativos
COMMENT ON COLUMN public.faturas_mensais.geracao_local_total_kwh IS 'Total gerado pela usina local no ciclo';
COMMENT ON COLUMN public.faturas_mensais.autoconsumo_total_kwh IS 'Energia consumida simultaneamente (100% economia)';
COMMENT ON COLUMN public.faturas_mensais.autoconsumo_rs IS 'Valor economizado pelo autoconsumo';
COMMENT ON COLUMN public.faturas_mensais.injecao_total_kwh IS 'Excedente injetado na rede (gera créditos próprios)';
COMMENT ON COLUMN public.faturas_mensais.credito_remoto_kwh IS 'Créditos recebidos da usina remota assinada';
COMMENT ON COLUMN public.faturas_mensais.credito_remoto_compensado_rs IS 'Valor compensado pelos créditos remotos';
COMMENT ON COLUMN public.faturas_mensais.custo_assinatura_rs IS 'Custo mensal da assinatura da usina remota';
COMMENT ON COLUMN public.faturas_mensais.economia_liquida_rs IS 'Economia líquida (compensação - custo assinatura)';
COMMENT ON COLUMN public.faturas_mensais.consumo_residual_kwh IS 'Consumo após autoconsumo (antes de créditos)';
COMMENT ON COLUMN public.faturas_mensais.consumo_final_kwh IS 'Consumo final a pagar após todas compensações';
COMMENT ON COLUMN public.faturas_mensais.grupo_tarifario IS 'Grupo tarifário no momento da fatura (A=binômia, B=monômia)';