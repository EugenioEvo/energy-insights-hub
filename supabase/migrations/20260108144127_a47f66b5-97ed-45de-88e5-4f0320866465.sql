-- =============================================
-- MIGRAÇÃO: Wizard de Lançamento Mensal Equatorial/Grupo A
-- =============================================

-- 1. Adicionar novos campos na tabela unidades_consumidoras
ALTER TABLE public.unidades_consumidoras
ADD COLUMN IF NOT EXISTS concessionaria text NOT NULL DEFAULT 'Equatorial Goiás',
ADD COLUMN IF NOT EXISTS classe_tarifaria text,
ADD COLUMN IF NOT EXISTS tensao_kv numeric DEFAULT 13.8,
ADD COLUMN IF NOT EXISTS tipo_fornecimento text DEFAULT 'TRIFÁSICO',
ADD COLUMN IF NOT EXISTS demanda_geracao_kw numeric DEFAULT 0;

-- 2. Adicionar novos campos na tabela faturas_mensais para cabeçalho e detalhamento
ALTER TABLE public.faturas_mensais
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'rascunho',
ADD COLUMN IF NOT EXISTS data_emissao date,
ADD COLUMN IF NOT EXISTS data_apresentacao date,
ADD COLUMN IF NOT EXISTS leitura_anterior date,
ADD COLUMN IF NOT EXISTS leitura_atual date,
ADD COLUMN IF NOT EXISTS dias_faturados integer,
ADD COLUMN IF NOT EXISTS proxima_leitura date,
ADD COLUMN IF NOT EXISTS vencimento date,
-- Consumo reservado (horário reservado)
ADD COLUMN IF NOT EXISTS consumo_reservado_kwh numeric DEFAULT 0,
-- Demanda
ADD COLUMN IF NOT EXISTS demanda_ultrapassagem_kw numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_demanda_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_demanda_ultrapassagem_rs numeric DEFAULT 0,
-- SCEE / GD
ADD COLUMN IF NOT EXISTS scee_geracao_ciclo_ponta_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_geracao_ciclo_fp_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_geracao_ciclo_hr_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_credito_recebido_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_excedente_recebido_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_saldo_kwh_p numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_saldo_kwh_fp numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_saldo_kwh_hr numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_saldo_expirar_30d_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_saldo_expirar_60d_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_rateio_percent numeric DEFAULT 0,
-- Bandeiras TE
ADD COLUMN IF NOT EXISTS bandeira_te_p_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bandeira_te_fp_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bandeira_te_hr_rs numeric DEFAULT 0,
-- Consumo não compensado TUSD
ADD COLUMN IF NOT EXISTS nao_compensado_tusd_p_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS nao_compensado_tusd_fp_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS nao_compensado_tusd_hr_rs numeric DEFAULT 0,
-- Consumo não compensado TE
ADD COLUMN IF NOT EXISTS nao_compensado_te_p_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS nao_compensado_te_fp_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS nao_compensado_te_hr_rs numeric DEFAULT 0,
-- SCEE compensação
ADD COLUMN IF NOT EXISTS scee_consumo_fp_tusd_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_parcela_te_fp_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_injecao_fp_te_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scee_injecao_fp_tusd_rs numeric DEFAULT 0,
-- Reativo + CIP
ADD COLUMN IF NOT EXISTS ufer_fp_kvarh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ufer_fp_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cip_rs numeric DEFAULT 0,
-- Tributos
ADD COLUMN IF NOT EXISTS base_pis_cofins_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pis_aliquota_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pis_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cofins_aliquota_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cofins_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_icms_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS icms_aliquota_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS icms_rs numeric DEFAULT 0,
-- Alertas gerados
ADD COLUMN IF NOT EXISTS alertas jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recomendacoes jsonb DEFAULT '[]'::jsonb;

-- 3. Índice para status de rascunho
CREATE INDEX IF NOT EXISTS idx_faturas_mensais_status ON public.faturas_mensais(status);

-- 4. Comentários para documentação
COMMENT ON COLUMN public.faturas_mensais.status IS 'Status da fatura: rascunho, fechado';
COMMENT ON COLUMN public.faturas_mensais.alertas IS 'Array JSON com alertas gerados automaticamente';
COMMENT ON COLUMN public.faturas_mensais.recomendacoes IS 'Array JSON com recomendações baseadas nos alertas';