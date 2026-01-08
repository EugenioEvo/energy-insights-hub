import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { WizardProvider, useWizard, initialWizardData } from '@/components/wizard/WizardContext';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { Step0ContextoUC } from '@/components/wizard/steps/Step0ContextoUC';
import { Step1Cabecalho } from '@/components/wizard/steps/Step1Cabecalho';
import { Step2Consumo } from '@/components/wizard/steps/Step2Consumo';
import { Step3Demanda } from '@/components/wizard/steps/Step3Demanda';
import { Step4SCEE } from '@/components/wizard/steps/Step4SCEE';
import { Step5ItensFatura } from '@/components/wizard/steps/Step5ItensFatura';
import { Step6Tributos } from '@/components/wizard/steps/Step6Tributos';
import { Step7Conferencia } from '@/components/wizard/steps/Step7Conferencia';
import { useToast } from '@/hooks/use-toast';
import { useUpsertFatura } from '@/hooks/useFaturas';
import { ChevronLeft, ChevronRight, Save, FileCheck, Loader2 } from 'lucide-react';

function WizardContent() {
  const { currentStep, nextStep, prevStep, canProceed, data, resetWizard } = useWizard();
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
        // Consumo
        consumo_total_kwh: data.consumo_total_kwh,
        ponta_kwh: data.consumo_ponta_kwh,
        fora_ponta_kwh: data.consumo_fora_ponta_kwh,
        consumo_reservado_kwh: data.consumo_reservado_kwh,
        // Demanda
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
        // SCEE
        scee_geracao_ciclo_ponta_kwh: data.scee_geracao_ciclo_ponta_kwh,
        scee_geracao_ciclo_fp_kwh: data.scee_geracao_ciclo_fp_kwh,
        scee_geracao_ciclo_hr_kwh: data.scee_geracao_ciclo_hr_kwh,
        scee_credito_recebido_kwh: data.scee_credito_recebido_kwh,
        scee_excedente_recebido_kwh: data.scee_excedente_recebido_kwh,
        scee_saldo_kwh_p: data.scee_saldo_kwh_p,
        scee_saldo_kwh_fp: data.scee_saldo_kwh_fp,
        scee_saldo_kwh_hr: data.scee_saldo_kwh_hr,
        scee_saldo_expirar_30d_kwh: data.scee_saldo_expirar_30d_kwh,
        scee_saldo_expirar_60d_kwh: data.scee_saldo_expirar_60d_kwh,
        scee_rateio_percent: data.scee_rateio_percent,
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

  const steps = [
    <Step0ContextoUC key={0} />,
    <Step1Cabecalho key={1} />,
    <Step2Consumo key={2} />,
    <Step3Demanda key={3} />,
    <Step4SCEE key={4} />,
    <Step5ItensFatura key={5} />,
    <Step6Tributos key={6} />,
    <Step7Conferencia key={7} />,
  ];

  const isLastStep = currentStep === 7;

  return (
    <div className="max-w-5xl">
      <WizardStepper />
      
      <div className="mb-6">
        {steps[currentStep]}
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

export default function LancarDados() {
  return (
    <DashboardLayout 
      title="Lançar Dados" 
      subtitle="Wizard de Lançamento Mensal — Fatura + SCEE + Demanda (Equatorial / Grupo A)"
    >
      <WizardProvider>
        <WizardContent />
      </WizardProvider>
    </DashboardLayout>
  );
}
