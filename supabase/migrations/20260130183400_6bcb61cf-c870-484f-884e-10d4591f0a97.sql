-- =====================================================
-- SECURITY FIX: Proper RLS Policies for All Tables
-- =====================================================

-- =====================================================
-- 1. CLIENTES TABLE
-- =====================================================
-- Drop permissive policies
DROP POLICY IF EXISTS "Permitir leitura de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir inserção de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir atualização de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir exclusão de clientes" ON clientes;

-- Keep existing proper policies (Admins podem ver todos os clientes, Clientes podem ver apenas seus dados, Admins podem gerenciar clientes)

-- =====================================================
-- 2. UNIDADES_CONSUMIDORAS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de UCs" ON unidades_consumidoras;
DROP POLICY IF EXISTS "Permitir inserção de UCs" ON unidades_consumidoras;
DROP POLICY IF EXISTS "Permitir atualização de UCs" ON unidades_consumidoras;
DROP POLICY IF EXISTS "Permitir exclusão de UCs" ON unidades_consumidoras;

-- Admins can manage all UCs
CREATE POLICY "Admins podem gerenciar todas UCs" 
  ON unidades_consumidoras FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Clients can view UCs of their authorized clients
CREATE POLICY "Clientes podem ver suas UCs" 
  ON unidades_consumidoras FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT get_user_clientes(auth.uid())));

-- =====================================================
-- 3. FATURAS_MENSAIS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de faturas" ON faturas_mensais;
DROP POLICY IF EXISTS "Permitir inserção de faturas" ON faturas_mensais;
DROP POLICY IF EXISTS "Permitir atualização de faturas" ON faturas_mensais;
DROP POLICY IF EXISTS "Permitir exclusão de faturas" ON faturas_mensais;

-- Admins can manage all invoices
CREATE POLICY "Admins podem gerenciar todas faturas" 
  ON faturas_mensais FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Clients can view invoices of their UCs
CREATE POLICY "Clientes podem ver suas faturas" 
  ON faturas_mensais FOR SELECT TO authenticated
  USING (
    uc_id IN (
      SELECT uc.id FROM unidades_consumidoras uc
      WHERE uc.cliente_id IN (SELECT get_user_clientes(auth.uid()))
    )
  );

-- =====================================================
-- 4. GERACOES_MENSAIS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de gerações" ON geracoes_mensais;
DROP POLICY IF EXISTS "Permitir inserção de gerações" ON geracoes_mensais;
DROP POLICY IF EXISTS "Permitir atualização de gerações" ON geracoes_mensais;
DROP POLICY IF EXISTS "Permitir exclusão de gerações" ON geracoes_mensais;

-- Admins can manage all generation records
CREATE POLICY "Admins podem gerenciar todas gerações" 
  ON geracoes_mensais FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Clients can view generation of their UCs
CREATE POLICY "Clientes podem ver suas gerações" 
  ON geracoes_mensais FOR SELECT TO authenticated
  USING (
    uc_id IN (
      SELECT uc.id FROM unidades_consumidoras uc
      WHERE uc.cliente_id IN (SELECT get_user_clientes(auth.uid()))
    )
  );

-- =====================================================
-- 5. ASSINATURAS_MENSAIS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de assinaturas" ON assinaturas_mensais;
DROP POLICY IF EXISTS "Permitir inserção de assinaturas" ON assinaturas_mensais;
DROP POLICY IF EXISTS "Permitir atualização de assinaturas" ON assinaturas_mensais;
DROP POLICY IF EXISTS "Permitir exclusão de assinaturas" ON assinaturas_mensais;

-- Admins can manage all subscriptions
CREATE POLICY "Admins podem gerenciar todas assinaturas" 
  ON assinaturas_mensais FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Clients can view subscriptions of their UCs
CREATE POLICY "Clientes podem ver suas assinaturas" 
  ON assinaturas_mensais FOR SELECT TO authenticated
  USING (
    uc_id IN (
      SELECT uc.id FROM unidades_consumidoras uc
      WHERE uc.cliente_id IN (SELECT get_user_clientes(auth.uid()))
    )
  );

-- =====================================================
-- 6. USINAS_REMOTAS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de usinas" ON usinas_remotas;
DROP POLICY IF EXISTS "Permitir inserção de usinas" ON usinas_remotas;
DROP POLICY IF EXISTS "Permitir atualização de usinas" ON usinas_remotas;
DROP POLICY IF EXISTS "Permitir exclusão de usinas" ON usinas_remotas;

-- Admins can manage all power plants
CREATE POLICY "Admins podem gerenciar todas usinas" 
  ON usinas_remotas FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Clients can view power plants they have contracts with
CREATE POLICY "Clientes podem ver usinas vinculadas" 
  ON usinas_remotas FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT cuv.usina_id FROM cliente_usina_vinculo cuv
      WHERE cuv.cliente_id IN (SELECT get_user_clientes(auth.uid()))
    )
  );

-- =====================================================
-- 7. CLIENTE_USINA_VINCULO TABLE
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de vínculos" ON cliente_usina_vinculo;
DROP POLICY IF EXISTS "Permitir inserção de vínculos" ON cliente_usina_vinculo;
DROP POLICY IF EXISTS "Permitir atualização de vínculos" ON cliente_usina_vinculo;
DROP POLICY IF EXISTS "Permitir exclusão de vínculos" ON cliente_usina_vinculo;

-- Admins can manage all contracts
CREATE POLICY "Admins podem gerenciar todos vínculos" 
  ON cliente_usina_vinculo FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Clients can view their contracts
CREATE POLICY "Clientes podem ver seus vínculos" 
  ON cliente_usina_vinculo FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT get_user_clientes(auth.uid())));

-- =====================================================
-- 8. USINA_GERACAO_MENSAL TABLE
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de gerações de usina" ON usina_geracao_mensal;
DROP POLICY IF EXISTS "Permitir inserção de gerações de usina" ON usina_geracao_mensal;
DROP POLICY IF EXISTS "Permitir atualização de gerações de usina" ON usina_geracao_mensal;
DROP POLICY IF EXISTS "Permitir exclusão de gerações de usina" ON usina_geracao_mensal;

-- Admins can manage all power plant generation
CREATE POLICY "Admins podem gerenciar gerações de usinas" 
  ON usina_geracao_mensal FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Clients can view generation of plants they have contracts with
CREATE POLICY "Clientes podem ver gerações de usinas vinculadas" 
  ON usina_geracao_mensal FOR SELECT TO authenticated
  USING (
    usina_id IN (
      SELECT cuv.usina_id FROM cliente_usina_vinculo cuv
      WHERE cuv.cliente_id IN (SELECT get_user_clientes(auth.uid()))
    )
  );

-- =====================================================
-- 9. USINA_RATEIO_MENSAL TABLE
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de rateios" ON usina_rateio_mensal;
DROP POLICY IF EXISTS "Permitir inserção de rateios" ON usina_rateio_mensal;
DROP POLICY IF EXISTS "Permitir atualização de rateios" ON usina_rateio_mensal;
DROP POLICY IF EXISTS "Permitir exclusão de rateios" ON usina_rateio_mensal;

-- Admins can manage all allocations
CREATE POLICY "Admins podem gerenciar todos rateios" 
  ON usina_rateio_mensal FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Clients can view allocations for their UCs
CREATE POLICY "Clientes podem ver seus rateios" 
  ON usina_rateio_mensal FOR SELECT TO authenticated
  USING (
    uc_beneficiaria_id IN (
      SELECT uc.id FROM unidades_consumidoras uc
      WHERE uc.cliente_id IN (SELECT get_user_clientes(auth.uid()))
    )
  );

-- =====================================================
-- 10. TARIFAS_CONCESSIONARIA TABLE (Reference data)
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de tarifas" ON tarifas_concessionaria;
DROP POLICY IF EXISTS "Permitir inserção de tarifas" ON tarifas_concessionaria;
DROP POLICY IF EXISTS "Permitir atualização de tarifas" ON tarifas_concessionaria;
DROP POLICY IF EXISTS "Permitir exclusão de tarifas" ON tarifas_concessionaria;

-- All authenticated users can read tariffs (reference data)
CREATE POLICY "Usuários autenticados podem ler tarifas" 
  ON tarifas_concessionaria FOR SELECT TO authenticated
  USING (true);

-- Only admins can manage tariffs
CREATE POLICY "Admins podem gerenciar tarifas" 
  ON tarifas_concessionaria FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- =====================================================
-- 11. LEI_14300_TRANSICAO TABLE (Reference data)
-- =====================================================
DROP POLICY IF EXISTS "Permitir leitura de transição Lei 14300" ON lei_14300_transicao;
DROP POLICY IF EXISTS "Permitir inserção de transição Lei 14300" ON lei_14300_transicao;
DROP POLICY IF EXISTS "Permitir atualização de transição Lei 14300" ON lei_14300_transicao;
DROP POLICY IF EXISTS "Permitir exclusão de transição Lei 14300" ON lei_14300_transicao;

-- All authenticated users can read legal transition data (reference data)
CREATE POLICY "Usuários autenticados podem ler lei 14300" 
  ON lei_14300_transicao FOR SELECT TO authenticated
  USING (true);

-- Only admins can manage legal transition data
CREATE POLICY "Admins podem gerenciar lei 14300" 
  ON lei_14300_transicao FOR ALL TO authenticated
  USING (is_admin(auth.uid()));