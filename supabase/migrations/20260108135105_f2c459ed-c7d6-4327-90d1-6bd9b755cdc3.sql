-- Adicionar campos específicos para Grupo A
ALTER TABLE public.faturas_mensais 
ADD COLUMN IF NOT EXISTS demanda_geracao_kw NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS multa_ufer_ponta NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS multa_ufer_fora_ponta NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS iluminacao_publica NUMERIC NOT NULL DEFAULT 0;

-- Renomear multa_reativo para multa_demanda_ultrapassagem (mais claro)
-- Manter multa_reativo para compatibilidade mas adicionar novo campo
ALTER TABLE public.faturas_mensais 
ADD COLUMN IF NOT EXISTS multa_demanda_ultrapassagem NUMERIC NOT NULL DEFAULT 0;

-- Adicionar energia_ponta_rs e energia_fora_ponta_rs para valores em R$
ALTER TABLE public.faturas_mensais 
ADD COLUMN IF NOT EXISTS energia_ponta_rs NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS energia_fora_ponta_rs NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS demanda_contratada_rs NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS demanda_geracao_rs NUMERIC NOT NULL DEFAULT 0;

-- Comentários para documentar os campos
COMMENT ON COLUMN public.faturas_mensais.demanda_geracao_kw IS 'Demanda de geração medida em kW (para consumidores com geração própria)';
COMMENT ON COLUMN public.faturas_mensais.multa_ufer_ponta IS 'Multa por excedente de reativos (UFER) no horário de ponta';
COMMENT ON COLUMN public.faturas_mensais.multa_ufer_fora_ponta IS 'Multa por excedente de reativos (UFER) no horário fora de ponta';
COMMENT ON COLUMN public.faturas_mensais.iluminacao_publica IS 'Contribuição para Iluminação Pública (CIP/COSIP)';
COMMENT ON COLUMN public.faturas_mensais.multa_demanda_ultrapassagem IS 'Multa por ultrapassagem de demanda contratada';
COMMENT ON COLUMN public.faturas_mensais.energia_ponta_rs IS 'Valor em R$ da energia consumida no horário de ponta';
COMMENT ON COLUMN public.faturas_mensais.energia_fora_ponta_rs IS 'Valor em R$ da energia consumida no horário fora de ponta';
COMMENT ON COLUMN public.faturas_mensais.demanda_contratada_rs IS 'Valor em R$ da demanda contratada';
COMMENT ON COLUMN public.faturas_mensais.demanda_geracao_rs IS 'Valor em R$ da demanda de geração';