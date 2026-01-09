
-- Criar enum para fonte de energia
CREATE TYPE public.fonte_energia AS ENUM ('solar', 'eolica', 'hidraulica', 'biomassa', 'outros');

-- Criar enum para modalidade de geração distribuída
CREATE TYPE public.modalidade_gd AS ENUM ('autoconsumo_remoto', 'geracao_compartilhada', 'consorcio', 'cooperativa');

-- Tabela de Usinas Remotas
CREATE TABLE public.usinas_remotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  uc_geradora TEXT NOT NULL,
  cnpj_titular TEXT NOT NULL,
  potencia_instalada_kw NUMERIC NOT NULL DEFAULT 0,
  fonte fonte_energia NOT NULL DEFAULT 'solar',
  modalidade_gd modalidade_gd NOT NULL DEFAULT 'autoconsumo_remoto',
  distribuidora TEXT NOT NULL,
  endereco TEXT,
  data_conexao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Vínculo Cliente-Usina
CREATE TABLE public.cliente_usina_vinculo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  usina_id UUID NOT NULL REFERENCES public.usinas_remotas(id) ON DELETE CASCADE,
  uc_beneficiaria_id UUID NOT NULL REFERENCES public.unidades_consumidoras(id) ON DELETE CASCADE,
  percentual_rateio NUMERIC NOT NULL DEFAULT 0 CHECK (percentual_rateio >= 0 AND percentual_rateio <= 100),
  energia_contratada_kwh NUMERIC NOT NULL DEFAULT 0,
  desconto_garantido_percent NUMERIC NOT NULL DEFAULT 0,
  data_inicio_contrato DATE,
  data_fim_contrato DATE,
  numero_contrato TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, usina_id, uc_beneficiaria_id)
);

-- Adicionar colunas na tabela assinaturas_mensais
ALTER TABLE public.assinaturas_mensais 
ADD COLUMN usina_id UUID REFERENCES public.usinas_remotas(id),
ADD COLUMN vinculo_id UUID REFERENCES public.cliente_usina_vinculo(id);

-- Habilitar RLS
ALTER TABLE public.usinas_remotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_usina_vinculo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usinas_remotas
CREATE POLICY "Permitir leitura de usinas" ON public.usinas_remotas
FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de usinas" ON public.usinas_remotas
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de usinas" ON public.usinas_remotas
FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de usinas" ON public.usinas_remotas
FOR DELETE USING (true);

-- Políticas RLS para cliente_usina_vinculo
CREATE POLICY "Permitir leitura de vínculos" ON public.cliente_usina_vinculo
FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de vínculos" ON public.cliente_usina_vinculo
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de vínculos" ON public.cliente_usina_vinculo
FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de vínculos" ON public.cliente_usina_vinculo
FOR DELETE USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_usinas_remotas_updated_at
BEFORE UPDATE ON public.usinas_remotas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cliente_usina_vinculo_updated_at
BEFORE UPDATE ON public.cliente_usina_vinculo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_cliente_usina_vinculo_cliente ON public.cliente_usina_vinculo(cliente_id);
CREATE INDEX idx_cliente_usina_vinculo_usina ON public.cliente_usina_vinculo(usina_id);
CREATE INDEX idx_usinas_remotas_ativo ON public.usinas_remotas(ativo);
