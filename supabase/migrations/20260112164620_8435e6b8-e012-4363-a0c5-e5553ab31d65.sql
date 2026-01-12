-- Tabela para registrar geração mensal de cada usina remota
CREATE TABLE public.usina_geracao_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usina_id UUID NOT NULL REFERENCES public.usinas_remotas(id) ON DELETE CASCADE,
  mes_ref TEXT NOT NULL, -- YYYY-MM
  geracao_total_kwh NUMERIC NOT NULL DEFAULT 0,
  geracao_ponta_kwh NUMERIC DEFAULT 0,
  geracao_fora_ponta_kwh NUMERIC DEFAULT 0,
  geracao_reservado_kwh NUMERIC DEFAULT 0,
  fator_capacidade_percent NUMERIC,
  disponibilidade_percent NUMERIC DEFAULT 100,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usina_id, mes_ref)
);

-- Tabela para registrar rateio de créditos entre UCs beneficiárias
CREATE TABLE public.usina_rateio_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geracao_id UUID NOT NULL REFERENCES public.usina_geracao_mensal(id) ON DELETE CASCADE,
  vinculo_id UUID NOT NULL REFERENCES public.cliente_usina_vinculo(id) ON DELETE CASCADE,
  uc_beneficiaria_id UUID NOT NULL REFERENCES public.unidades_consumidoras(id),
  energia_alocada_kwh NUMERIC NOT NULL DEFAULT 0,
  energia_ponta_kwh NUMERIC DEFAULT 0,
  energia_fora_ponta_kwh NUMERIC DEFAULT 0,
  energia_reservado_kwh NUMERIC DEFAULT 0,
  percentual_aplicado NUMERIC NOT NULL DEFAULT 0,
  valor_fatura_usina_rs NUMERIC DEFAULT 0,
  valor_compensado_estimado_rs NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'utilizado', 'expirado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(geracao_id, vinculo_id)
);

-- Habilitar RLS
ALTER TABLE public.usina_geracao_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usina_rateio_mensal ENABLE ROW LEVEL SECURITY;

-- Policies para usina_geracao_mensal
CREATE POLICY "Permitir leitura de gerações de usina" ON public.usina_geracao_mensal
  FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de gerações de usina" ON public.usina_geracao_mensal
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de gerações de usina" ON public.usina_geracao_mensal
  FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de gerações de usina" ON public.usina_geracao_mensal
  FOR DELETE USING (true);

-- Policies para usina_rateio_mensal
CREATE POLICY "Permitir leitura de rateios" ON public.usina_rateio_mensal
  FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de rateios" ON public.usina_rateio_mensal
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de rateios" ON public.usina_rateio_mensal
  FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de rateios" ON public.usina_rateio_mensal
  FOR DELETE USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_usina_geracao_mensal_updated_at
  BEFORE UPDATE ON public.usina_geracao_mensal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usina_rateio_mensal_updated_at
  BEFORE UPDATE ON public.usina_rateio_mensal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();