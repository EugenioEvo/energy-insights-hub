-- Criar tabela de tarifas por concessionária e grupo tarifário
CREATE TABLE public.tarifas_concessionaria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concessionaria TEXT NOT NULL,
  grupo_tarifario TEXT NOT NULL CHECK (grupo_tarifario IN ('A', 'B')),
  subgrupo TEXT, -- A1, A2, A3, A3a, A4, AS, B1, B2, B3
  modalidade TEXT, -- THS_VERDE, THS_AZUL, Convencional
  
  -- Tarifas TE (R$/kWh)
  te_ponta_rs_kwh NUMERIC DEFAULT 0,
  te_fora_ponta_rs_kwh NUMERIC DEFAULT 0,
  te_reservado_rs_kwh NUMERIC DEFAULT 0,
  te_unica_rs_kwh NUMERIC DEFAULT 0, -- Para Grupo B
  
  -- Tarifas TUSD (R$/kWh)
  tusd_ponta_rs_kwh NUMERIC DEFAULT 0,
  tusd_fora_ponta_rs_kwh NUMERIC DEFAULT 0,
  tusd_reservado_rs_kwh NUMERIC DEFAULT 0,
  tusd_unica_rs_kwh NUMERIC DEFAULT 0, -- Para Grupo B
  
  -- Componentes TUSD detalhados
  tusd_fio_a_rs_kwh NUMERIC DEFAULT 0,
  tusd_fio_b_rs_kwh NUMERIC DEFAULT 0,
  tusd_encargos_rs_kwh NUMERIC DEFAULT 0,
  
  -- Demanda (R$/kW)
  demanda_ponta_rs_kw NUMERIC DEFAULT 0,
  demanda_fora_ponta_rs_kw NUMERIC DEFAULT 0,
  demanda_unica_rs_kw NUMERIC DEFAULT 0,
  demanda_geracao_rs_kw NUMERIC DEFAULT 0,
  demanda_ultrapassagem_rs_kw NUMERIC DEFAULT 0,
  
  -- Bandeiras (R$/kWh adicional)
  bandeira_verde_rs_kwh NUMERIC DEFAULT 0,
  bandeira_amarela_rs_kwh NUMERIC DEFAULT 0,
  bandeira_vermelha1_rs_kwh NUMERIC DEFAULT 0,
  bandeira_vermelha2_rs_kwh NUMERIC DEFAULT 0,
  
  -- Tributos padrão (%)
  icms_percent NUMERIC DEFAULT 0,
  pis_percent NUMERIC DEFAULT 0,
  cofins_percent NUMERIC DEFAULT 0,
  
  -- Metadados
  vigencia_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim DATE,
  resolucao_aneel TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_tarifas_concessionaria_grupo ON public.tarifas_concessionaria(concessionaria, grupo_tarifario, ativo);
CREATE INDEX idx_tarifas_vigencia ON public.tarifas_concessionaria(vigencia_inicio, vigencia_fim);

-- Habilitar RLS
ALTER TABLE public.tarifas_concessionaria ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (leitura pública, escrita admin)
CREATE POLICY "Permitir leitura de tarifas" ON public.tarifas_concessionaria
FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de tarifas" ON public.tarifas_concessionaria
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de tarifas" ON public.tarifas_concessionaria
FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de tarifas" ON public.tarifas_concessionaria
FOR DELETE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_tarifas_concessionaria_updated_at
BEFORE UPDATE ON public.tarifas_concessionaria
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir tarifas exemplo para Equatorial Goiás (valores aproximados - devem ser atualizados com valores reais)
INSERT INTO public.tarifas_concessionaria (
  concessionaria, grupo_tarifario, subgrupo, modalidade,
  te_ponta_rs_kwh, te_fora_ponta_rs_kwh, te_unica_rs_kwh,
  tusd_ponta_rs_kwh, tusd_fora_ponta_rs_kwh, tusd_unica_rs_kwh,
  tusd_fio_a_rs_kwh, tusd_fio_b_rs_kwh, tusd_encargos_rs_kwh,
  demanda_ponta_rs_kw, demanda_fora_ponta_rs_kw, demanda_unica_rs_kw, demanda_geracao_rs_kw,
  bandeira_verde_rs_kwh, bandeira_amarela_rs_kwh, bandeira_vermelha1_rs_kwh, bandeira_vermelha2_rs_kwh,
  icms_percent, pis_percent, cofins_percent,
  resolucao_aneel
) VALUES 
-- Equatorial Goiás - Grupo A - THS Verde (A4)
('Equatorial Goiás', 'A', 'A4', 'THS_VERDE',
  0.42856, 0.28574, 0,
  0.55231, 0.17411, 0,
  0.08500, 0.05500, 0.03411,
  0, 0, 31.45, 12.58,
  0, 0.01874, 0.03971, 0.09492,
  29, 0.65, 3.00,
  'REH 3.187/2024'),

-- Equatorial Goiás - Grupo A - THS Azul (A4)
('Equatorial Goiás', 'A', 'A4', 'THS_AZUL',
  0.42856, 0.28574, 0,
  0.55231, 0.17411, 0,
  0.08500, 0.05500, 0.03411,
  45.67, 31.45, 0, 12.58,
  0, 0.01874, 0.03971, 0.09492,
  29, 0.65, 3.00,
  'REH 3.187/2024'),

-- Equatorial Goiás - Grupo B - Convencional (B3)
('Equatorial Goiás', 'B', 'B3', 'Convencional',
  0, 0, 0.35412,
  0, 0, 0.42156,
  0.08500, 0.05500, 0.03411,
  0, 0, 0, 0,
  0, 0.01874, 0.03971, 0.09492,
  29, 0.65, 3.00,
  'REH 3.187/2024'),

-- CEMIG - Grupo A - THS Verde (A4)
('CEMIG', 'A', 'A4', 'THS_VERDE',
  0.39876, 0.26584, 0,
  0.51234, 0.16178, 0,
  0.07800, 0.05100, 0.03278,
  0, 0, 28.92, 11.57,
  0, 0.01874, 0.03971, 0.09492,
  18, 0.65, 3.00,
  'REH 3.200/2024'),

-- CEMIG - Grupo B - Convencional (B3)
('CEMIG', 'B', 'B3', 'Convencional',
  0, 0, 0.32845,
  0, 0, 0.39123,
  0.07800, 0.05100, 0.03278,
  0, 0, 0, 0,
  0, 0.01874, 0.03971, 0.09492,
  18, 0.65, 3.00,
  'REH 3.200/2024');

-- Função para buscar tarifa vigente
CREATE OR REPLACE FUNCTION public.obter_tarifa_vigente(
  p_concessionaria TEXT,
  p_grupo_tarifario TEXT,
  p_modalidade TEXT DEFAULT NULL,
  p_data_referencia DATE DEFAULT CURRENT_DATE
)
RETURNS public.tarifas_concessionaria
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tarifa public.tarifas_concessionaria;
BEGIN
  SELECT * INTO v_tarifa
  FROM public.tarifas_concessionaria
  WHERE concessionaria = p_concessionaria
    AND grupo_tarifario = p_grupo_tarifario
    AND (p_modalidade IS NULL OR modalidade = p_modalidade)
    AND ativo = true
    AND vigencia_inicio <= p_data_referencia
    AND (vigencia_fim IS NULL OR vigencia_fim >= p_data_referencia)
  ORDER BY vigencia_inicio DESC
  LIMIT 1;
  
  RETURN v_tarifa;
END;
$$;