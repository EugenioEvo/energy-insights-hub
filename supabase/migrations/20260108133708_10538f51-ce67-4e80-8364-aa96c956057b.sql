-- Tabela de Clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Unidades Consumidoras
CREATE TABLE public.unidades_consumidoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  endereco TEXT NOT NULL,
  distribuidora TEXT NOT NULL,
  modalidade_tarifaria TEXT NOT NULL CHECK (modalidade_tarifaria IN ('convencional', 'branca', 'verde', 'azul')),
  demanda_contratada NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Faturas Mensais
CREATE TABLE public.faturas_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uc_id UUID NOT NULL REFERENCES public.unidades_consumidoras(id) ON DELETE CASCADE,
  mes_ref TEXT NOT NULL, -- YYYY-MM
  consumo_total_kwh NUMERIC NOT NULL DEFAULT 0,
  ponta_kwh NUMERIC NOT NULL DEFAULT 0,
  fora_ponta_kwh NUMERIC NOT NULL DEFAULT 0,
  demanda_contratada_kw NUMERIC NOT NULL DEFAULT 0,
  demanda_medida_kw NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_te NUMERIC NOT NULL DEFAULT 0,
  valor_tusd NUMERIC NOT NULL DEFAULT 0,
  bandeiras TEXT NOT NULL CHECK (bandeiras IN ('verde', 'amarela', 'vermelha1', 'vermelha2')),
  multa_demanda NUMERIC NOT NULL DEFAULT 0,
  multa_reativo NUMERIC NOT NULL DEFAULT 0,
  outros_encargos NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(uc_id, mes_ref)
);

-- Tabela de Gerações Mensais
CREATE TABLE public.geracoes_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uc_id UUID NOT NULL REFERENCES public.unidades_consumidoras(id) ON DELETE CASCADE,
  mes_ref TEXT NOT NULL, -- YYYY-MM
  geracao_total_kwh NUMERIC NOT NULL DEFAULT 0,
  autoconsumo_kwh NUMERIC NOT NULL DEFAULT 0,
  injecao_kwh NUMERIC NOT NULL DEFAULT 0,
  compensacao_kwh NUMERIC NOT NULL DEFAULT 0,
  disponibilidade_percent NUMERIC NOT NULL DEFAULT 100,
  perdas_estimadas_kwh NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(uc_id, mes_ref)
);

-- Tabela de Assinaturas Mensais
CREATE TABLE public.assinaturas_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uc_id UUID NOT NULL REFERENCES public.unidades_consumidoras(id) ON DELETE CASCADE,
  mes_ref TEXT NOT NULL, -- YYYY-MM
  uc_remota TEXT NOT NULL,
  energia_contratada_kwh NUMERIC NOT NULL DEFAULT 0,
  energia_alocada_kwh NUMERIC NOT NULL DEFAULT 0,
  valor_assinatura NUMERIC NOT NULL DEFAULT 0,
  economia_prometida_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(uc_id, mes_ref)
);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_consumidoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas_mensais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geracoes_mensais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_mensais ENABLE ROW LEVEL SECURITY;

-- Policies para leitura pública (sistema interno sem autenticação por enquanto)
CREATE POLICY "Permitir leitura de clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de clientes" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de clientes" ON public.clientes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de clientes" ON public.clientes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de UCs" ON public.unidades_consumidoras FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de UCs" ON public.unidades_consumidoras FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de UCs" ON public.unidades_consumidoras FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de UCs" ON public.unidades_consumidoras FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de faturas" ON public.faturas_mensais FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de faturas" ON public.faturas_mensais FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de faturas" ON public.faturas_mensais FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de faturas" ON public.faturas_mensais FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de gerações" ON public.geracoes_mensais FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de gerações" ON public.geracoes_mensais FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de gerações" ON public.geracoes_mensais FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de gerações" ON public.geracoes_mensais FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de assinaturas" ON public.assinaturas_mensais FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de assinaturas" ON public.assinaturas_mensais FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de assinaturas" ON public.assinaturas_mensais FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de assinaturas" ON public.assinaturas_mensais FOR DELETE USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ucs_updated_at
  BEFORE UPDATE ON public.unidades_consumidoras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faturas_updated_at
  BEFORE UPDATE ON public.faturas_mensais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geracoes_updated_at
  BEFORE UPDATE ON public.geracoes_mensais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assinaturas_updated_at
  BEFORE UPDATE ON public.assinaturas_mensais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_ucs_cliente_id ON public.unidades_consumidoras(cliente_id);
CREATE INDEX idx_faturas_uc_id ON public.faturas_mensais(uc_id);
CREATE INDEX idx_faturas_mes_ref ON public.faturas_mensais(mes_ref);
CREATE INDEX idx_geracoes_uc_id ON public.geracoes_mensais(uc_id);
CREATE INDEX idx_geracoes_mes_ref ON public.geracoes_mensais(mes_ref);
CREATE INDEX idx_assinaturas_uc_id ON public.assinaturas_mensais(uc_id);
CREATE INDEX idx_assinaturas_mes_ref ON public.assinaturas_mensais(mes_ref);