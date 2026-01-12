-- Enum para modalidade de economia
CREATE TYPE public.modalidade_economia AS ENUM ('ppa_tarifa', 'desconto_fatura_global');

-- Enum para referência de desconto
CREATE TYPE public.referencia_desconto AS ENUM ('valor_total', 'te_tusd', 'apenas_te');

-- Adicionar campos na tabela cliente_usina_vinculo
ALTER TABLE public.cliente_usina_vinculo
ADD COLUMN IF NOT EXISTS modalidade_economia public.modalidade_economia DEFAULT 'desconto_fatura_global',
ADD COLUMN IF NOT EXISTS tarifa_ppa_rs_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS referencia_desconto public.referencia_desconto DEFAULT 'valor_total';