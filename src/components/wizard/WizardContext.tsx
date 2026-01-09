import React, { createContext, useContext, useState, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';

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
  
  // Passo 2 - Consumo
  consumo_ponta_kwh: number;
  consumo_fora_ponta_kwh: number;
  consumo_reservado_kwh: number;
  consumo_total_kwh: number;
  
  // Passo 3 - Demanda
  demanda_medida_kw: number;
  demanda_ultrapassagem_kw: number;
  valor_demanda_rs: number;
  valor_demanda_ultrapassagem_rs: number;
  
  // Passo 4 - SCEE/GD
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
  
  // Energia Simultânea vs Créditos de Assinatura
  energia_simultanea_kwh: number;
  energia_simultanea_rs: number;
  credito_assinatura_kwh: number;
  credito_assinatura_rs: number;
  desconto_assinatura_percent: number;
  
  // Passo 5 - Itens de Fatura
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
  
  // Passo 6 - Tributos
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
  alertas: Array<{ tipo: string; mensagem: string; severidade: 'info' | 'warning' | 'error' }>;
  recomendacoes: string[];
};

export const initialWizardData: FaturaWizardData = {
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
  mes_ref: '',
  data_emissao: '',
  data_apresentacao: '',
  leitura_anterior: '',
  leitura_atual: '',
  dias_faturados: 0,
  proxima_leitura: '',
  vencimento: '',
  valor_total_pagar: 0,
  consumo_ponta_kwh: 0,
  consumo_fora_ponta_kwh: 0,
  consumo_reservado_kwh: 0,
  consumo_total_kwh: 0,
  demanda_medida_kw: 0,
  demanda_ultrapassagem_kw: 0,
  valor_demanda_rs: 0,
  valor_demanda_ultrapassagem_rs: 0,
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
  energia_simultanea_kwh: 0,
  energia_simultanea_rs: 0,
  credito_assinatura_kwh: 0,
  credito_assinatura_rs: 0,
  desconto_assinatura_percent: 0,
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
  base_pis_cofins_rs: 0,
  pis_aliquota_percent: 0,
  pis_rs: 0,
  cofins_aliquota_percent: 0,
  cofins_rs: 0,
  base_icms_rs: 0,
  icms_aliquota_percent: 0,
  icms_rs: 0,
  status: 'rascunho',
  alertas: [],
  recomendacoes: [],
};

interface WizardContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  data: FaturaWizardData;
  updateData: (updates: Partial<FaturaWizardData>) => void;
  resetWizard: () => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceed: boolean;
  setCanProceed: (can: boolean) => void;
  totalSteps: number;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<FaturaWizardData>(initialWizardData);
  const [canProceed, setCanProceed] = useState(false);
  const totalSteps = 8;

  const updateData = useCallback((updates: Partial<FaturaWizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setData(initialWizardData);
    setCanProceed(false);
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
        nextStep,
        prevStep,
        canProceed,
        setCanProceed,
        totalSteps,
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
