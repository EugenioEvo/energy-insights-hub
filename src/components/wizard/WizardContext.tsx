import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/types';

export type GrupoTarifario = 'A' | 'B';

export type AlertaWizard = {
  tipo: string;
  mensagem: string;
  severidade: 'info' | 'warning' | 'error';
};

export type FaturaWizardData = {
  // Passo 0 - Contexto UC
  uc_id: string;
  uc_numero: string;
  concessionaria: string;
  classe_tarifaria: string;
  modalidade: string;
  tensao_kv: number;
  tipo_fornecimento: string;
  demanda_contratada_kw: number;
  demanda_geracao_kw: number;
  cnpj: string;
  razao_social: string;
  grupo_tarifario: GrupoTarifario;
  tem_geracao_local: boolean;
  tem_usina_remota: boolean;
  
  // Passo 1 - Cabeçalho
  mes_ref: string;
  data_emissao: string;
  data_apresentacao: string;
  leitura_anterior: string;
  leitura_atual: string;
  dias_faturados: number;
  proxima_leitura: string;
  vencimento: string;
  valor_total_pagar: number;
  
  // Passo 2 - Consumo (Grupo A: por posto / Grupo B: total)
  consumo_ponta_kwh: number;
  consumo_fora_ponta_kwh: number;
  consumo_reservado_kwh: number;
  consumo_total_kwh: number;
  
  // Passo 3 - Demanda (apenas Grupo A)
  demanda_medida_kw: number;
  demanda_ultrapassagem_kw: number;
  valor_demanda_rs: number;
  valor_demanda_ultrapassagem_rs: number;
  
  // Passo 4 - Geração Local (Usina junto à carga)
  geracao_local_total_kwh: number;
  autoconsumo_ponta_kwh: number;
  autoconsumo_fp_kwh: number;
  autoconsumo_hr_kwh: number;
  autoconsumo_total_kwh: number;
  autoconsumo_rs: number;
  injecao_ponta_kwh: number;
  injecao_fp_kwh: number;
  injecao_hr_kwh: number;
  injecao_total_kwh: number;
  
  // Passo 5 - Créditos Remotos (Usina assinada)
  credito_remoto_kwh: number;
  credito_remoto_ponta_kwh: number;
  credito_remoto_fp_kwh: number;
  credito_remoto_hr_kwh: number;
  credito_remoto_compensado_rs: number;
  custo_assinatura_rs: number;
  economia_liquida_rs: number;
  
  // Fluxo de compensação
  consumo_residual_kwh: number;
  consumo_final_kwh: number;
  
  // Saldos de créditos (próprios + remotos)
  scee_geracao_ciclo_ponta_kwh: number;
  scee_geracao_ciclo_fp_kwh: number;
  scee_geracao_ciclo_hr_kwh: number;
  scee_credito_recebido_kwh: number;
  scee_excedente_recebido_kwh: number;
  scee_saldo_kwh_p: number;
  scee_saldo_kwh_fp: number;
  scee_saldo_kwh_hr: number;
  scee_saldo_expirar_30d_kwh: number;
  scee_saldo_expirar_60d_kwh: number;
  scee_rateio_percent: number;
  
  // Campos legados (manter compatibilidade)
  energia_simultanea_kwh: number;
  energia_simultanea_rs: number;
  credito_assinatura_kwh: number;
  credito_assinatura_rs: number;
  desconto_assinatura_percent: number;
  
  // Passo 6 - Itens de Fatura (decomposição TE/TUSD)
  bandeira_te_p_rs: number;
  bandeira_te_fp_rs: number;
  bandeira_te_hr_rs: number;
  nao_compensado_tusd_p_rs: number;
  nao_compensado_tusd_fp_rs: number;
  nao_compensado_tusd_hr_rs: number;
  nao_compensado_te_p_rs: number;
  nao_compensado_te_fp_rs: number;
  nao_compensado_te_hr_rs: number;
  scee_consumo_fp_tusd_rs: number;
  scee_parcela_te_fp_rs: number;
  scee_injecao_fp_te_rs: number;
  scee_injecao_fp_tusd_rs: number;
  ufer_fp_kvarh: number;
  ufer_fp_rs: number;
  cip_rs: number;
  
  // Passo 7 - Tributos
  base_pis_cofins_rs: number;
  pis_aliquota_percent: number;
  pis_rs: number;
  cofins_aliquota_percent: number;
  cofins_rs: number;
  base_icms_rs: number;
  icms_aliquota_percent: number;
  icms_rs: number;
  
  // Status
  status: 'rascunho' | 'fechado';
  alertas: AlertaWizard[];
  recomendacoes: string[];
};

export const initialWizardData: FaturaWizardData = {
  // Contexto
  uc_id: '',
  uc_numero: '',
  concessionaria: 'Equatorial Goiás',
  classe_tarifaria: '',
  modalidade: 'THS_VERDE',
  tensao_kv: 13.8,
  tipo_fornecimento: 'TRIFÁSICO',
  demanda_contratada_kw: 0,
  demanda_geracao_kw: 0,
  cnpj: '',
  razao_social: '',
  grupo_tarifario: 'A',
  tem_geracao_local: false,
  tem_usina_remota: false,
  
  // Cabeçalho
  mes_ref: '',
  data_emissao: '',
  data_apresentacao: '',
  leitura_anterior: '',
  leitura_atual: '',
  dias_faturados: 0,
  proxima_leitura: '',
  vencimento: '',
  valor_total_pagar: 0,
  
  // Consumo
  consumo_ponta_kwh: 0,
  consumo_fora_ponta_kwh: 0,
  consumo_reservado_kwh: 0,
  consumo_total_kwh: 0,
  
  // Demanda
  demanda_medida_kw: 0,
  demanda_ultrapassagem_kw: 0,
  valor_demanda_rs: 0,
  valor_demanda_ultrapassagem_rs: 0,
  
  // Geração Local
  geracao_local_total_kwh: 0,
  autoconsumo_ponta_kwh: 0,
  autoconsumo_fp_kwh: 0,
  autoconsumo_hr_kwh: 0,
  autoconsumo_total_kwh: 0,
  autoconsumo_rs: 0,
  injecao_ponta_kwh: 0,
  injecao_fp_kwh: 0,
  injecao_hr_kwh: 0,
  injecao_total_kwh: 0,
  
  // Créditos Remotos
  credito_remoto_kwh: 0,
  credito_remoto_ponta_kwh: 0,
  credito_remoto_fp_kwh: 0,
  credito_remoto_hr_kwh: 0,
  credito_remoto_compensado_rs: 0,
  custo_assinatura_rs: 0,
  economia_liquida_rs: 0,
  
  // Fluxo
  consumo_residual_kwh: 0,
  consumo_final_kwh: 0,
  
  // SCEE/Saldos
  scee_geracao_ciclo_ponta_kwh: 0,
  scee_geracao_ciclo_fp_kwh: 0,
  scee_geracao_ciclo_hr_kwh: 0,
  scee_credito_recebido_kwh: 0,
  scee_excedente_recebido_kwh: 0,
  scee_saldo_kwh_p: 0,
  scee_saldo_kwh_fp: 0,
  scee_saldo_kwh_hr: 0,
  scee_saldo_expirar_30d_kwh: 0,
  scee_saldo_expirar_60d_kwh: 0,
  scee_rateio_percent: 0,
  
  // Legado
  energia_simultanea_kwh: 0,
  energia_simultanea_rs: 0,
  credito_assinatura_kwh: 0,
  credito_assinatura_rs: 0,
  desconto_assinatura_percent: 0,
  
  // Itens Fatura
  bandeira_te_p_rs: 0,
  bandeira_te_fp_rs: 0,
  bandeira_te_hr_rs: 0,
  nao_compensado_tusd_p_rs: 0,
  nao_compensado_tusd_fp_rs: 0,
  nao_compensado_tusd_hr_rs: 0,
  nao_compensado_te_p_rs: 0,
  nao_compensado_te_fp_rs: 0,
  nao_compensado_te_hr_rs: 0,
  scee_consumo_fp_tusd_rs: 0,
  scee_parcela_te_fp_rs: 0,
  scee_injecao_fp_te_rs: 0,
  scee_injecao_fp_tusd_rs: 0,
  ufer_fp_kvarh: 0,
  ufer_fp_rs: 0,
  cip_rs: 0,
  
  // Tributos
  base_pis_cofins_rs: 0,
  pis_aliquota_percent: 0,
  pis_rs: 0,
  cofins_aliquota_percent: 0,
  cofins_rs: 0,
  base_icms_rs: 0,
  icms_aliquota_percent: 0,
  icms_rs: 0,
  
  // Status
  status: 'rascunho',
  alertas: [],
  recomendacoes: [],
};

// Definição de passos por grupo tarifário
export type StepDefinition = {
  id: string;
  name: string;
  description: string;
};

export const STEPS_GRUPO_A: StepDefinition[] = [
  { id: 'contexto', name: 'Contexto UC', description: 'Seleção e configuração da unidade consumidora' },
  { id: 'cabecalho', name: 'Cabeçalho', description: 'Dados gerais da fatura' },
  { id: 'consumo', name: 'Consumo', description: 'Consumo por posto horário' },
  { id: 'demanda', name: 'Demanda', description: 'Demanda contratada e medida' },
  { id: 'geracao_local', name: 'Geração Local', description: 'Autoconsumo e injeção da usina própria' },
  { id: 'creditos_remotos', name: 'Créditos Remotos', description: 'Créditos da usina assinada' },
  { id: 'itens_fatura', name: 'Itens Fatura', description: 'Decomposição TE/TUSD' },
  { id: 'tributos', name: 'Tributos', description: 'PIS, COFINS, ICMS' },
  { id: 'conferencia', name: 'Conferência', description: 'Validação e fechamento' },
];

export const STEPS_GRUPO_B: StepDefinition[] = [
  { id: 'contexto', name: 'Contexto UC', description: 'Seleção e configuração da unidade consumidora' },
  { id: 'cabecalho', name: 'Cabeçalho', description: 'Dados gerais da fatura' },
  { id: 'consumo', name: 'Consumo', description: 'Consumo total' },
  { id: 'geracao_local', name: 'Geração Local', description: 'Autoconsumo e injeção' },
  { id: 'creditos_remotos', name: 'Créditos Remotos', description: 'Créditos da usina assinada' },
  { id: 'tributos', name: 'Tributos', description: 'Tributos simplificados' },
  { id: 'conferencia', name: 'Conferência', description: 'Validação e fechamento' },
];

// Helper para converter fatura do banco para formato do wizard
export function mapFaturaToWizardData(
  fatura: Tables<'faturas_mensais'>,
  uc?: Tables<'unidades_consumidoras'> & { clientes?: Tables<'clientes'> }
): Partial<FaturaWizardData> {
  return {
    // Contexto UC
    uc_id: fatura.uc_id,
    uc_numero: uc?.numero || '',
    concessionaria: uc?.concessionaria || 'Equatorial Goiás',
    classe_tarifaria: uc?.classe_tarifaria || '',
    modalidade: uc?.modalidade_tarifaria || 'THS_VERDE',
    tensao_kv: uc?.tensao_kv || 13.8,
    tipo_fornecimento: uc?.tipo_fornecimento || 'TRIFÁSICO',
    demanda_contratada_kw: uc?.demanda_contratada || 0,
    demanda_geracao_kw: uc?.demanda_geracao_kw || 0,
    cnpj: uc?.clientes?.cnpj || '',
    razao_social: uc?.clientes?.nome || '',
    grupo_tarifario: (fatura.grupo_tarifario === 'A' || fatura.grupo_tarifario === 'B' ? fatura.grupo_tarifario : 'A') as GrupoTarifario,
    tem_geracao_local: uc?.tem_geracao_propria || false,
    tem_usina_remota: (fatura.credito_remoto_kwh || 0) > 0,
    
    // Cabeçalho
    mes_ref: fatura.mes_ref,
    data_emissao: fatura.data_emissao || '',
    data_apresentacao: fatura.data_apresentacao || '',
    leitura_anterior: fatura.leitura_anterior || '',
    leitura_atual: fatura.leitura_atual || '',
    dias_faturados: fatura.dias_faturados || 0,
    proxima_leitura: fatura.proxima_leitura || '',
    vencimento: fatura.vencimento || '',
    valor_total_pagar: fatura.valor_total || 0,
    
    // Consumo
    consumo_ponta_kwh: fatura.ponta_kwh || 0,
    consumo_fora_ponta_kwh: fatura.fora_ponta_kwh || 0,
    consumo_reservado_kwh: fatura.consumo_reservado_kwh || 0,
    consumo_total_kwh: fatura.consumo_total_kwh || 0,
    
    // Demanda
    demanda_medida_kw: fatura.demanda_medida_kw || 0,
    demanda_ultrapassagem_kw: fatura.demanda_ultrapassagem_kw || 0,
    valor_demanda_rs: fatura.valor_demanda_rs || 0,
    valor_demanda_ultrapassagem_rs: fatura.valor_demanda_ultrapassagem_rs || 0,
    
    // Geração Local
    geracao_local_total_kwh: fatura.geracao_local_total_kwh || 0,
    autoconsumo_ponta_kwh: fatura.autoconsumo_ponta_kwh || 0,
    autoconsumo_fp_kwh: fatura.autoconsumo_fp_kwh || 0,
    autoconsumo_hr_kwh: fatura.autoconsumo_hr_kwh || 0,
    autoconsumo_total_kwh: fatura.autoconsumo_total_kwh || 0,
    autoconsumo_rs: fatura.autoconsumo_rs || 0,
    injecao_ponta_kwh: fatura.injecao_ponta_kwh || 0,
    injecao_fp_kwh: fatura.injecao_fp_kwh || 0,
    injecao_hr_kwh: fatura.injecao_hr_kwh || 0,
    injecao_total_kwh: fatura.injecao_total_kwh || 0,
    
    // Créditos Remotos
    credito_remoto_kwh: fatura.credito_remoto_kwh || 0,
    credito_remoto_compensado_rs: fatura.credito_remoto_compensado_rs || 0,
    custo_assinatura_rs: fatura.custo_assinatura_rs || 0,
    economia_liquida_rs: fatura.economia_liquida_rs || 0,
    
    // Fluxo
    consumo_residual_kwh: fatura.consumo_residual_kwh || 0,
    consumo_final_kwh: fatura.consumo_final_kwh || 0,
    
    // SCEE/Saldos
    scee_geracao_ciclo_ponta_kwh: fatura.scee_geracao_ciclo_ponta_kwh || 0,
    scee_geracao_ciclo_fp_kwh: fatura.scee_geracao_ciclo_fp_kwh || 0,
    scee_geracao_ciclo_hr_kwh: fatura.scee_geracao_ciclo_hr_kwh || 0,
    scee_credito_recebido_kwh: fatura.scee_credito_recebido_kwh || 0,
    scee_excedente_recebido_kwh: fatura.scee_excedente_recebido_kwh || 0,
    scee_saldo_kwh_p: fatura.scee_saldo_kwh_p || 0,
    scee_saldo_kwh_fp: fatura.scee_saldo_kwh_fp || 0,
    scee_saldo_kwh_hr: fatura.scee_saldo_kwh_hr || 0,
    scee_saldo_expirar_30d_kwh: fatura.scee_saldo_expirar_30d_kwh || 0,
    scee_saldo_expirar_60d_kwh: fatura.scee_saldo_expirar_60d_kwh || 0,
    scee_rateio_percent: fatura.scee_rateio_percent || 0,
    
    // Legado
    energia_simultanea_kwh: fatura.energia_simultanea_kwh || 0,
    energia_simultanea_rs: fatura.energia_simultanea_rs || 0,
    credito_assinatura_kwh: fatura.credito_assinatura_kwh || 0,
    credito_assinatura_rs: fatura.credito_assinatura_rs || 0,
    desconto_assinatura_percent: fatura.desconto_assinatura_percent || 0,
    
    // Itens Fatura
    bandeira_te_p_rs: fatura.bandeira_te_p_rs || 0,
    bandeira_te_fp_rs: fatura.bandeira_te_fp_rs || 0,
    bandeira_te_hr_rs: fatura.bandeira_te_hr_rs || 0,
    nao_compensado_tusd_p_rs: fatura.nao_compensado_tusd_p_rs || 0,
    nao_compensado_tusd_fp_rs: fatura.nao_compensado_tusd_fp_rs || 0,
    nao_compensado_tusd_hr_rs: fatura.nao_compensado_tusd_hr_rs || 0,
    nao_compensado_te_p_rs: fatura.nao_compensado_te_p_rs || 0,
    nao_compensado_te_fp_rs: fatura.nao_compensado_te_fp_rs || 0,
    nao_compensado_te_hr_rs: fatura.nao_compensado_te_hr_rs || 0,
    scee_consumo_fp_tusd_rs: fatura.scee_consumo_fp_tusd_rs || 0,
    scee_parcela_te_fp_rs: fatura.scee_parcela_te_fp_rs || 0,
    scee_injecao_fp_te_rs: fatura.scee_injecao_fp_te_rs || 0,
    scee_injecao_fp_tusd_rs: fatura.scee_injecao_fp_tusd_rs || 0,
    ufer_fp_kvarh: fatura.ufer_fp_kvarh || 0,
    ufer_fp_rs: fatura.ufer_fp_rs || 0,
    cip_rs: fatura.cip_rs || 0,
    
    // Tributos
    base_pis_cofins_rs: fatura.base_pis_cofins_rs || 0,
    pis_aliquota_percent: fatura.pis_aliquota_percent || 0,
    pis_rs: fatura.pis_rs || 0,
    cofins_aliquota_percent: fatura.cofins_aliquota_percent || 0,
    cofins_rs: fatura.cofins_rs || 0,
    base_icms_rs: fatura.base_icms_rs || 0,
    icms_aliquota_percent: fatura.icms_aliquota_percent || 0,
    icms_rs: fatura.icms_rs || 0,
    
    // Status
    status: (fatura.status === 'fechado' ? 'fechado' : 'rascunho') as 'rascunho' | 'fechado',
    alertas: (fatura.alertas as AlertaWizard[]) || [],
    recomendacoes: (fatura.recomendacoes as string[]) || [],
  };
}

interface WizardContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  data: FaturaWizardData;
  updateData: (updates: Partial<FaturaWizardData>) => void;
  resetWizard: () => void;
  loadFatura: (fatura: Partial<FaturaWizardData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceed: boolean;
  setCanProceed: (can: boolean) => void;
  totalSteps: number;
  steps: StepDefinition[];
  currentStepId: string;
  isGrupoA: boolean;
  isGrupoB: boolean;
  isEditing: boolean;
}

interface WizardProviderProps {
  children: React.ReactNode;
  initialFatura?: Partial<FaturaWizardData>;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children, initialFatura }: WizardProviderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<FaturaWizardData>(() => 
    initialFatura ? { ...initialWizardData, ...initialFatura } : initialWizardData
  );
  const [canProceed, setCanProceed] = useState(false);
  const [isEditing, setIsEditing] = useState(!!initialFatura);

  // Atualizar dados quando initialFatura mudar (ex: navegação)
  useEffect(() => {
    if (initialFatura) {
      setData({ ...initialWizardData, ...initialFatura });
      setIsEditing(true);
    }
  }, [initialFatura]);

  const isGrupoA = data.grupo_tarifario === 'A';
  const isGrupoB = data.grupo_tarifario === 'B';
  
  const steps = useMemo(() => {
    return isGrupoA ? STEPS_GRUPO_A : STEPS_GRUPO_B;
  }, [isGrupoA]);

  const totalSteps = steps.length;
  const currentStepId = steps[currentStep]?.id || 'contexto';

  const updateData = useCallback((updates: Partial<FaturaWizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const loadFatura = useCallback((fatura: Partial<FaturaWizardData>) => {
    setData({ ...initialWizardData, ...fatura });
    setIsEditing(true);
    setCurrentStep(0);
  }, []);

  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setData(initialWizardData);
    setCanProceed(false);
    setIsEditing(false);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      setCanProceed(false);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  return (
    <WizardContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        data,
        updateData,
        resetWizard,
        loadFatura,
        nextStep,
        prevStep,
        canProceed,
        setCanProceed,
        totalSteps,
        steps,
        currentStepId,
        isGrupoA,
        isGrupoB,
        isEditing,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}
