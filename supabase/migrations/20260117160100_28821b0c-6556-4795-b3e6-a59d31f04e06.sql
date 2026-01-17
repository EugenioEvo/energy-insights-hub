-- Adicionar campos de detalhamento por posto horário R$ na tabela faturas_mensais
ALTER TABLE public.faturas_mensais 
ADD COLUMN IF NOT EXISTS autoconsumo_ponta_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS autoconsumo_fp_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS autoconsumo_hr_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_remoto_ponta_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_remoto_fp_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_remoto_hr_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_remoto_ponta_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_remoto_fp_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_remoto_hr_rs numeric DEFAULT 0;