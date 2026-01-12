-- =====================================================
-- MIGRAÇÃO LEI 14.300/2022 - Marco Legal da GD
-- =====================================================

-- 1. Criar enum para classificação GD
DO $$ BEGIN
    CREATE TYPE classificacao_gd AS ENUM ('gd1', 'gd2');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar campos na tabela usinas_remotas
ALTER TABLE usinas_remotas 
ADD COLUMN IF NOT EXISTS data_protocolo_aneel date,
ADD COLUMN IF NOT EXISTS classificacao_gd text DEFAULT 'gd2',
ADD COLUMN IF NOT EXISTS numero_processo_aneel text;

COMMENT ON COLUMN usinas_remotas.data_protocolo_aneel IS 'Data de protocolo junto à ANEEL/distribuidora';
COMMENT ON COLUMN usinas_remotas.classificacao_gd IS 'gd1 = protocolo até 06/01/2023 (direito adquirido), gd2 = após';
COMMENT ON COLUMN usinas_remotas.numero_processo_aneel IS 'Número do processo na distribuidora';

-- 3. Adicionar campos na tabela unidades_consumidoras
ALTER TABLE unidades_consumidoras
ADD COLUMN IF NOT EXISTS grupo_tarifario text DEFAULT 'B',
ADD COLUMN IF NOT EXISTS subgrupo text,
ADD COLUMN IF NOT EXISTS custo_disponibilidade_kwh numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS tem_geracao_propria boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_protocolo_gd date;

COMMENT ON COLUMN unidades_consumidoras.grupo_tarifario IS 'Grupo tarifário: A (alta tensão) ou B (baixa tensão)';
COMMENT ON COLUMN unidades_consumidoras.subgrupo IS 'Subgrupo tarifário: A1, A2, A3, A4, AS, B1, B2, B3';
COMMENT ON COLUMN unidades_consumidoras.custo_disponibilidade_kwh IS 'Custo de disponibilidade em kWh (30, 50 ou 100)';
COMMENT ON COLUMN unidades_consumidoras.tem_geracao_propria IS 'Indica se UC possui geração própria (autoconsumo local)';
COMMENT ON COLUMN unidades_consumidoras.data_protocolo_gd IS 'Data de protocolo da GD para esta UC';

-- 4. Adicionar campos de decomposição TUSD na tabela faturas_mensais
ALTER TABLE faturas_mensais
ADD COLUMN IF NOT EXISTS tusd_fio_a_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tusd_fio_b_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tusd_encargos_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentual_fio_b_aplicado numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS economia_simultaneidade_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS economia_compensacao_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_nao_compensavel_rs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS classificacao_gd_aplicada text DEFAULT 'gd2';

COMMENT ON COLUMN faturas_mensais.tusd_fio_a_rs IS 'Componente Fio A da TUSD (transporte até subestação)';
COMMENT ON COLUMN faturas_mensais.tusd_fio_b_rs IS 'Componente Fio B da TUSD (distribuição local)';
COMMENT ON COLUMN faturas_mensais.tusd_encargos_rs IS 'Encargos setoriais embutidos na TUSD';
COMMENT ON COLUMN faturas_mensais.percentual_fio_b_aplicado IS 'Percentual de Fio B não compensável aplicado conforme ano';
COMMENT ON COLUMN faturas_mensais.economia_simultaneidade_rs IS 'Economia obtida por energia simultânea (100% compensável)';
COMMENT ON COLUMN faturas_mensais.economia_compensacao_rs IS 'Economia obtida por compensação de créditos';
COMMENT ON COLUMN faturas_mensais.valor_nao_compensavel_rs IS 'Valor não compensável conforme Lei 14.300';
COMMENT ON COLUMN faturas_mensais.classificacao_gd_aplicada IS 'Classificação GD aplicada nesta fatura (gd1 ou gd2)';

-- 5. Criar tabela de configuração de transição Lei 14.300
CREATE TABLE IF NOT EXISTS lei_14300_transicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano integer NOT NULL UNIQUE,
  percentual_fio_b numeric NOT NULL,
  percentual_encargos numeric DEFAULT 100,
  descricao text,
  vigente boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE lei_14300_transicao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lei_14300_transicao
CREATE POLICY "Permitir leitura de transição Lei 14300" 
ON lei_14300_transicao FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de transição Lei 14300" 
ON lei_14300_transicao FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de transição Lei 14300" 
ON lei_14300_transicao FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de transição Lei 14300" 
ON lei_14300_transicao FOR DELETE USING (true);

-- 6. Popular tabela com percentuais definidos na Lei 14.300/2022
INSERT INTO lei_14300_transicao (ano, percentual_fio_b, percentual_encargos, descricao) VALUES
  (2023, 15, 100, 'Primeiro ano de transição - 15% do Fio B'),
  (2024, 30, 100, 'Segundo ano - 30% do Fio B'),
  (2025, 45, 100, 'Terceiro ano - 45% do Fio B'),
  (2026, 60, 100, 'Quarto ano - 60% do Fio B'),
  (2027, 75, 100, 'Quinto ano - 75% do Fio B'),
  (2028, 90, 100, 'Sexto ano - 90% do Fio B'),
  (2029, 100, 100, 'Fim da transição - 100% do Fio B não compensável')
ON CONFLICT (ano) DO UPDATE SET
  percentual_fio_b = EXCLUDED.percentual_fio_b,
  percentual_encargos = EXCLUDED.percentual_encargos,
  descricao = EXCLUDED.descricao;

-- 7. Trigger para atualizar updated_at
CREATE TRIGGER update_lei_14300_transicao_updated_at
BEFORE UPDATE ON lei_14300_transicao
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 8. Função para classificar GD automaticamente baseado na data de protocolo
CREATE OR REPLACE FUNCTION classificar_gd(data_protocolo date)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF data_protocolo IS NULL THEN
    RETURN 'gd2';
  END IF;
  
  -- Data limite: 06/01/2023 (Lei 14.300)
  IF data_protocolo <= '2023-01-06'::date THEN
    RETURN 'gd1';
  ELSE
    RETURN 'gd2';
  END IF;
END;
$$;

-- 9. Função para obter percentual de Fio B por ano
CREATE OR REPLACE FUNCTION obter_percentual_fio_b(ano_referencia integer)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  percentual numeric;
BEGIN
  SELECT percentual_fio_b INTO percentual
  FROM lei_14300_transicao
  WHERE ano = ano_referencia AND vigente = true;
  
  IF percentual IS NULL THEN
    -- Após 2029, 100% não compensável
    IF ano_referencia >= 2029 THEN
      RETURN 100;
    -- Antes de 2023, 0% (regras antigas)
    ELSIF ano_referencia < 2023 THEN
      RETURN 0;
    ELSE
      RETURN 100; -- Default conservador
    END IF;
  END IF;
  
  RETURN percentual;
END;
$$;