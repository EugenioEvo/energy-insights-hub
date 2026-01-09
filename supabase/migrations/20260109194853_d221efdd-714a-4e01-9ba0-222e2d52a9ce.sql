-- Adicionar campos para distinguir energia simultânea vs créditos de assinatura
-- na tabela faturas_mensais

-- Energia Simultânea (geração própria consumida em tempo real)
ALTER TABLE public.faturas_mensais 
ADD COLUMN IF NOT EXISTS energia_simultanea_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS energia_simultanea_rs numeric DEFAULT 0;

-- Créditos de Assinatura (recebidos de usina remota)
ALTER TABLE public.faturas_mensais 
ADD COLUMN IF NOT EXISTS credito_assinatura_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_assinatura_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS desconto_assinatura_percent numeric DEFAULT 0;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.faturas_mensais.energia_simultanea_kwh IS 'Energia gerada e consumida simultaneamente pela própria usina (kWh)';
COMMENT ON COLUMN public.faturas_mensais.energia_simultanea_rs IS 'Valor economizado com energia simultânea (R$)';
COMMENT ON COLUMN public.faturas_mensais.credito_assinatura_kwh IS 'Créditos recebidos de usina remota por assinatura (kWh)';
COMMENT ON COLUMN public.faturas_mensais.credito_assinatura_rs IS 'Valor dos créditos de assinatura após desconto (R$)';
COMMENT ON COLUMN public.faturas_mensais.desconto_assinatura_percent IS 'Percentual de desconto aplicado na assinatura (%)';