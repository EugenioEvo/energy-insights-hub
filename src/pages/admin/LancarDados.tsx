import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WizardProvider, useWizard, mapFaturaToWizardData } from '@/components/wizard/WizardContext';
import type { Tables } from '@/integrations/supabase/types';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { Step0ContextoUC } from '@/components/wizard/steps/Step0ContextoUC';
import { Step1Cabecalho } from '@/components/wizard/steps/Step1Cabecalho';
import { Step2Consumo } from '@/components/wizard/steps/Step2Consumo';
import { Step3Demanda } from '@/components/wizard/steps/Step3Demanda';
import { Step4GeracaoLocal } from '@/components/wizard/steps/Step4GeracaoLocal';
import { Step5CreditosRemotos } from '@/components/wizard/steps/Step5CreditosRemotos';
import { Step5ItensFatura } from '@/components/wizard/steps/Step5ItensFatura';
import { Step6Tributos } from '@/components/wizard/steps/Step6Tributos';
import { Step7Conferencia } from '@/components/wizard/steps/Step7Conferencia';
import { Step2ConsumoSimples } from '@/components/wizard/steps/grupoB/Step2ConsumoSimples';
import { useToast } from '@/hooks/use-toast';
import { useUpsertFatura } from '@/hooks/useFaturas';
import { ChevronLeft, ChevronRight, Save, FileCheck, Loader2 } from 'lucide-react';

function WizardContent() {
  const { currentStep, nextStep, prevStep, canProceed, data, resetWizard, totalSteps, currentStepId, isGrupoA, isEditing } = useWizard();
  const { toast } = useToast();
  const upsertFatura = useUpsertFatura();
  const [saving, setSaving] = useState(false);

  const handleSave = async (fechar: boolean) => {
    setSaving(true);
    try {
      await upsertFatura.mutateAsync({
        uc_id: data.uc_id,
        mes_ref: data.mes_ref,
        status: fechar ? 'fechado' : 'rascunho',
        bandeiras: 'verde',
        grupo_tarifario: data.grupo_tarifario,
        // Consumo
        consumo_total_kwh: data.consumo_total_kwh,
        ponta_kwh: data.consumo_ponta_kwh,
        fora_ponta_kwh: data.consumo_fora_ponta_kwh,
        consumo_reservado_kwh: data.consumo_reservado_kwh,
        // Demanda (apenas Grupo A)
        demanda_contratada_kw: data.demanda_contratada_kw,
        demanda_medida_kw: data.demanda_medida_kw,
        demanda_ultrapassagem_kw: data.demanda_ultrapassagem_kw,
        valor_demanda_rs: data.valor_demanda_rs,
        multa_demanda_ultrapassagem: data.valor_demanda_ultrapassagem_rs,
        // Datas
        data_emissao: data.data_emissao || null,
        data_apresentacao: data.data_apresentacao || null,
        leitura_anterior: data.leitura_anterior || null,
        leitura_atual: data.leitura_atual || null,
        dias_faturados: data.dias_faturados || null,
        proxima_leitura: data.proxima_leitura || null,
        vencimento: data.vencimento || null,
        valor_total: data.valor_total_pagar,
        // Geração Local
        geracao_local_total_kwh: data.geracao_local_total_kwh,
        autoconsumo_ponta_kwh: data.autoconsumo_ponta_kwh,
        autoconsumo_fp_kwh: data.autoconsumo_fp_kwh,
        autoconsumo_hr_kwh: data.autoconsumo_hr_kwh,
        autoconsumo_total_kwh: data.autoconsumo_total_kwh,
        autoconsumo_rs: data.autoconsumo_rs,
        injecao_ponta_kwh: data.injecao_ponta_kwh,
        injecao_fp_kwh: data.injecao_fp_kwh,
        injecao_hr_kwh: data.injecao_hr_kwh,
        injecao_total_kwh: data.injecao_total_kwh,
        // Créditos Remotos
        credito_remoto_kwh: data.credito_remoto_kwh,
        credito_remoto_compensado_rs: data.credito_remoto_compensado_rs,
        custo_assinatura_rs: data.custo_assinatura_rs,
        economia_liquida_rs: data.economia_liquida_rs,
        consumo_residual_kwh: data.consumo_residual_kwh,
        consumo_final_kwh: data.consumo_final_kwh,
        // SCEE/Saldos
        scee_saldo_kwh_p: data.scee_saldo_kwh_p,
        scee_saldo_kwh_fp: data.scee_saldo_kwh_fp,
        scee_saldo_kwh_hr: data.scee_saldo_kwh_hr,
        scee_saldo_expirar_30d_kwh: data.scee_saldo_expirar_30d_kwh,
        scee_saldo_expirar_60d_kwh: data.scee_saldo_expirar_60d_kwh,
        // Legado (manter compatibilidade)
        energia_simultanea_kwh: data.autoconsumo_total_kwh,
        energia_simultanea_rs: data.autoconsumo_rs,
        credito_assinatura_kwh: data.credito_remoto_kwh,
        credito_assinatura_rs: data.credito_remoto_compensado_rs,
        // Itens Fatura
        bandeira_te_p_rs: data.bandeira_te_p_rs,
        bandeira_te_fp_rs: data.bandeira_te_fp_rs,
        bandeira_te_hr_rs: data.bandeira_te_hr_rs,
        nao_compensado_tusd_p_rs: data.nao_compensado_tusd_p_rs,
        nao_compensado_tusd_fp_rs: data.nao_compensado_tusd_fp_rs,
        nao_compensado_tusd_hr_rs: data.nao_compensado_tusd_hr_rs,
        nao_compensado_te_p_rs: data.nao_compensado_te_p_rs,
        nao_compensado_te_fp_rs: data.nao_compensado_te_fp_rs,
        nao_compensado_te_hr_rs: data.nao_compensado_te_hr_rs,
        scee_consumo_fp_tusd_rs: data.scee_consumo_fp_tusd_rs,
        scee_parcela_te_fp_rs: data.scee_parcela_te_fp_rs,
        scee_injecao_fp_te_rs: data.scee_injecao_fp_te_rs,
        scee_injecao_fp_tusd_rs: data.scee_injecao_fp_tusd_rs,
        ufer_fp_kvarh: data.ufer_fp_kvarh,
        ufer_fp_rs: data.ufer_fp_rs,
        cip_rs: data.cip_rs,
        // Tributos
        base_pis_cofins_rs: data.base_pis_cofins_rs,
        pis_aliquota_percent: data.pis_aliquota_percent,
        pis_rs: data.pis_rs,
        cofins_aliquota_percent: data.cofins_aliquota_percent,
        cofins_rs: data.cofins_rs,
        base_icms_rs: data.base_icms_rs,
        icms_aliquota_percent: data.icms_aliquota_percent,
        icms_rs: data.icms_rs,
        // Alertas
        alertas: data.alertas as any,
        recomendacoes: data.recomendacoes as any,
      });

      toast({
        title: fechar ? 'Mês fechado!' : 'Rascunho salvo!',
        description: fechar 
          ? 'A fatura foi fechada com sucesso.' 
          : 'Os dados foram salvos como rascunho.',
      });

      if (fechar) {
        resetWizard();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar os dados.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Renderizar step baseado no ID (dinâmico por grupo)
  const renderStep = () => {
    switch (currentStepId) {
      case 'contexto':
        return <Step0ContextoUC />;
      case 'cabecalho':
        return <Step1Cabecalho />;
      case 'consumo':
        return isGrupoA ? <Step2Consumo /> : <Step2ConsumoSimples />;
      case 'demanda':
        return <Step3Demanda />;
      case 'geracao_local':
        return <Step4GeracaoLocal />;
      case 'creditos_remotos':
        return <Step5CreditosRemotos />;
      case 'itens_fatura':
        return <Step5ItensFatura />;
      case 'tributos':
        return <Step6Tributos />;
      case 'conferencia':
        return <Step7Conferencia />;
      default:
        return <Step0ContextoUC />;
    }
  };

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant={isGrupoA ? "default" : "secondary"} className="text-sm">
            {isGrupoA ? 'Grupo A — Tarifa Binômia' : 'Grupo B — Tarifa Monômia'}
          </Badge>
          {isEditing && (
            <Badge variant="outline" className="text-sm border-amber-500 text-amber-600">
              Editando Rascunho
            </Badge>
          )}
        </div>
        {data.uc_numero && (
          <span className="text-sm text-muted-foreground">UC: {data.uc_numero}</span>
        )}
      </div>

      <WizardStepper />
      
      <div className="mb-6">
        {renderStep()}
      </div>

      <div className="flex justify-between items-center bg-card rounded-xl border border-border p-4">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving || !data.uc_id || !data.mes_ref}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Rascunho
          </Button>

          {isLastStep ? (
            <Button
              onClick={() => handleSave(true)}
              disabled={saving || !canProceed}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
              Fechar Mês
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canProceed}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface LocationState {
  editFatura?: Tables<'faturas_mensais'> & {
    unidades_consumidoras?: Tables<'unidades_consumidoras'> & {
      clientes?: Tables<'clientes'>;
    };
  };
}

export default function LancarDados() {
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  
  const initialFatura = useMemo(() => {
    if (state?.editFatura) {
      return mapFaturaToWizardData(state.editFatura, state.editFatura.unidades_consumidoras);
    }
    return undefined;
  }, [state?.editFatura]);

  return (
    <DashboardLayout 
      title={initialFatura ? "Editar Fatura" : "Lançar Dados"}
      subtitle="Wizard de Lançamento Mensal — Fatura de Energia com Geração Distribuída"
    >
      <WizardProvider initialFatura={initialFatura}>
        <WizardContent />
      </WizardProvider>
    </DashboardLayout>
  );
}
