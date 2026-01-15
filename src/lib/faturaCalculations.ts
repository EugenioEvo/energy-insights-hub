import { FaturaWizardData } from '@/components/wizard/WizardContext';

export interface ComponentesFatura {
  bandeiras: {
    ponta: number;
    foraPonta: number;
    reservado: number;
    total: number;
  };
  tusd: {
    ponta: number;
    foraPonta: number;
    reservado: number;
    total: number;
  };
  te: {
    ponta: number;
    foraPonta: number;
    reservado: number;
    total: number;
  };
  scee: {
    consumoTusd: number;
    parcelaTe: number;
    injecaoTe: number;
    injecaoTusd: number;
    total: number;
  };
  demanda: {
    contratada: number;
    ultrapassagem: number;
    total: number;
  };
  outros: {
    ufer: number;
    cip: number;
    total: number;
  };
  tributos: {
    pis: number;
    cofins: number;
    icms: number;
    total: number;
  };
  totalGeral: number;
}

export function calcularComponentesFatura(data: FaturaWizardData): ComponentesFatura {
  // Bandeiras
  const bandeiras = {
    ponta: data.bandeira_te_p_rs || 0,
    foraPonta: data.bandeira_te_fp_rs || 0,
    reservado: data.bandeira_te_hr_rs || 0,
    total: 0,
  };
  bandeiras.total = bandeiras.ponta + bandeiras.foraPonta + bandeiras.reservado;

  // TUSD
  const tusd = {
    ponta: data.nao_compensado_tusd_p_rs || 0,
    foraPonta: data.nao_compensado_tusd_fp_rs || 0,
    reservado: data.nao_compensado_tusd_hr_rs || 0,
    total: 0,
  };
  tusd.total = tusd.ponta + tusd.foraPonta + tusd.reservado;

  // TE
  const te = {
    ponta: data.nao_compensado_te_p_rs || 0,
    foraPonta: data.nao_compensado_te_fp_rs || 0,
    reservado: data.nao_compensado_te_hr_rs || 0,
    total: 0,
  };
  te.total = te.ponta + te.foraPonta + te.reservado;

  // SCEE
  const scee = {
    consumoTusd: data.scee_consumo_fp_tusd_rs || 0,
    parcelaTe: data.scee_parcela_te_fp_rs || 0,
    injecaoTe: data.scee_injecao_fp_te_rs || 0,
    injecaoTusd: data.scee_injecao_fp_tusd_rs || 0,
    total: 0,
  };
  scee.total = scee.consumoTusd + scee.parcelaTe + scee.injecaoTe + scee.injecaoTusd;

  // Demanda
  const demanda = {
    contratada: data.valor_demanda_rs || 0,
    ultrapassagem: data.valor_demanda_ultrapassagem_rs || 0,
    total: 0,
  };
  demanda.total = demanda.contratada + demanda.ultrapassagem;

  // Outros
  const outros = {
    ufer: data.ufer_fp_rs || 0,
    cip: data.cip_rs || 0,
    total: 0,
  };
  outros.total = outros.ufer + outros.cip;

  // Tributos
  const tributos = {
    pis: data.pis_rs || 0,
    cofins: data.cofins_rs || 0,
    icms: data.icms_rs || 0,
    total: 0,
  };
  tributos.total = tributos.pis + tributos.cofins + tributos.icms;

  // Total geral
  const totalGeral = 
    bandeiras.total +
    tusd.total +
    te.total +
    scee.total +
    demanda.total +
    outros.total +
    tributos.total;

  return {
    bandeiras,
    tusd,
    te,
    scee,
    demanda,
    outros,
    tributos,
    totalGeral,
  };
}

export interface ValidacaoCruzada {
  componentesPreenchidos: number;
  componentesVazios: string[];
  alertasValidacao: { campo: string; mensagem: string; severidade: 'info' | 'warning' | 'error' }[];
  percentualDiferenca: number;
  diferencaAbsoluta: number;
  isValid: boolean;
}

export function validarCruzado(data: FaturaWizardData, componentes: ComponentesFatura): ValidacaoCruzada {
  const alertas: ValidacaoCruzada['alertasValidacao'] = [];
  const componentesVazios: string[] = [];

  // Verificar componentes vazios
  if (componentes.bandeiras.total === 0 && data.bandeira !== 'verde') {
    componentesVazios.push('Bandeiras');
    alertas.push({
      campo: 'Bandeiras',
      mensagem: `Bandeira ${data.bandeira} selecionada mas nenhum valor de bandeira informado`,
      severidade: 'warning',
    });
  }

  if (componentes.tusd.total === 0) {
    componentesVazios.push('TUSD');
  }

  if (componentes.te.total === 0) {
    componentesVazios.push('TE');
  }

  if (componentes.demanda.total === 0 && data.demanda_contratada_kw > 0) {
    componentesVazios.push('Demanda');
    alertas.push({
      campo: 'Demanda',
      mensagem: 'Demanda contratada informada mas nenhum valor de demanda em R$ lançado',
      severidade: 'warning',
    });
  }

  if (componentes.tributos.total === 0 && componentes.totalGeral > 0) {
    componentesVazios.push('Tributos');
    alertas.push({
      campo: 'Tributos',
      mensagem: 'Nenhum tributo (PIS/COFINS/ICMS) informado',
      severidade: 'info',
    });
  }

  // Verificar consistência demanda medida x ultrapassagem
  if (data.demanda_medida_kw > data.demanda_contratada_kw && componentes.demanda.ultrapassagem === 0) {
    alertas.push({
      campo: 'Ultrapassagem',
      mensagem: 'Demanda medida maior que contratada, mas valor de ultrapassagem não informado',
      severidade: 'warning',
    });
  }

  // Verificar créditos SCEE
  const temCreditosSCEE = 
    (data.scee_credito_recebido_kwh || 0) > 0 || 
    (data.scee_excedente_recebido_kwh || 0) > 0;
  
  if (temCreditosSCEE && componentes.scee.total === 0) {
    alertas.push({
      campo: 'SCEE',
      mensagem: 'Créditos SCEE informados mas nenhum valor de compensação lançado',
      severidade: 'info',
    });
  }

  // Calcular diferença
  const valorTotal = data.valor_total_pagar || 0;
  const diferencaAbsoluta = Math.abs(componentes.totalGeral - valorTotal);
  const percentualDiferenca = valorTotal > 0 
    ? (diferencaAbsoluta / valorTotal) * 100 
    : 0;

  // Verificar se diferença é aceitável
  const isValid = componentes.totalGeral === 0 || percentualDiferenca <= 0.5;

  if (!isValid) {
    alertas.push({
      campo: 'Total',
      mensagem: `Diferença de ${percentualDiferenca.toFixed(2)}% entre valor informado e soma dos componentes`,
      severidade: 'error',
    });
  }

  const componentesPreenchidos = [
    componentes.bandeiras.total > 0,
    componentes.tusd.total > 0,
    componentes.te.total > 0,
    componentes.scee.total > 0,
    componentes.demanda.total > 0,
    componentes.outros.total > 0,
    componentes.tributos.total > 0,
  ].filter(Boolean).length;

  return {
    componentesPreenchidos,
    componentesVazios,
    alertasValidacao: alertas,
    percentualDiferenca,
    diferencaAbsoluta,
    isValid,
  };
}
