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

  // SCEE - valores de injeção são créditos (negativos = abatimentos)
  const scee = {
    consumoTusd: data.scee_consumo_fp_tusd_rs || 0,
    parcelaTe: data.scee_parcela_te_fp_rs || 0,
    // Injeção são créditos - valores negativos reduzem o total
    injecaoTe: data.scee_injecao_fp_te_rs || 0,
    injecaoTusd: data.scee_injecao_fp_tusd_rs || 0,
    total: 0,
  };
  // consumoTusd e parcelaTe são cobranças (positivos)
  // injecaoTe e injecaoTusd são créditos (geralmente negativos, reduzem o total)
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

// Validação de Integridade de Dados
export interface ValidacaoIntegridade {
  checks: Array<{
    nome: string;
    esperado: number;
    encontrado: number;
    diferenca: number;
    status: 'ok' | 'warning' | 'error';
    mensagem: string;
  }>;
  isValid: boolean;
}

export function validarIntegridadeDados(data: FaturaWizardData): ValidacaoIntegridade {
  const checks: ValidacaoIntegridade['checks'] = [];

  // Check 1: Consumo total = soma dos postos (Grupo A)
  if (data.grupo_tarifario === 'A') {
    const somaPostos = (data.consumo_ponta_kwh || 0) + 
                       (data.consumo_fora_ponta_kwh || 0) + 
                       (data.consumo_reservado_kwh || 0);
    const consumoTotal = data.consumo_total_kwh || 0;
    
    if (consumoTotal > 0 || somaPostos > 0) {
      const diff = Math.abs(consumoTotal - somaPostos);
      checks.push({
        nome: 'Consumo Total vs Postos',
        esperado: consumoTotal,
        encontrado: somaPostos,
        diferenca: diff,
        status: diff < 1 ? 'ok' : diff < 10 ? 'warning' : 'error',
        mensagem: `Total (${consumoTotal.toFixed(0)}) vs P+FP+HR (${somaPostos.toFixed(0)})`
      });
    }
  }

  // Check 2: Geração = Autoconsumo + Injeção
  const geracaoLocal = data.geracao_local_total_kwh || 0;
  if (geracaoLocal > 0) {
    const somaGeracaoSaida = (data.autoconsumo_total_kwh || 0) + (data.injecao_total_kwh || 0);
    const diffGeracao = Math.abs(geracaoLocal - somaGeracaoSaida);
    
    if (somaGeracaoSaida > 0) {
      checks.push({
        nome: 'Geração = Auto + Injeção',
        esperado: geracaoLocal,
        encontrado: somaGeracaoSaida,
        diferenca: diffGeracao,
        status: diffGeracao < 1 ? 'ok' : diffGeracao < 10 ? 'warning' : 'error',
        mensagem: `Geração (${geracaoLocal.toFixed(0)}) vs Saídas (${somaGeracaoSaida.toFixed(0)})`
      });
    }
  }

  // Check 3: Demanda ultrapassagem consistente
  const demandaMedida = data.demanda_medida_kw || 0;
  const demandaContratada = data.demanda_contratada_kw || 0;
  
  if (demandaMedida > demandaContratada && demandaContratada > 0) {
    const ultrapassagemEsperada = demandaMedida - demandaContratada;
    const ultrapassagemInformada = data.demanda_ultrapassagem_kw || 0;
    const diffUltra = Math.abs(ultrapassagemInformada - ultrapassagemEsperada);
    
    checks.push({
      nome: 'Ultrapassagem Demanda',
      esperado: ultrapassagemEsperada,
      encontrado: ultrapassagemInformada,
      diferenca: diffUltra,
      status: diffUltra < 1 ? 'ok' : 'warning',
      mensagem: `Esperado (${ultrapassagemEsperada.toFixed(1)}) vs Informado (${ultrapassagemInformada.toFixed(1)})`
    });
  }

  // Check 4: Autoconsumo por posto = total (Grupo A)
  if (data.grupo_tarifario === 'A') {
    const autoconsumoTotal = data.autoconsumo_total_kwh || 0;
    const somaAutoconsumoPostos = (data.autoconsumo_ponta_kwh || 0) + 
                                   (data.autoconsumo_fp_kwh || 0) + 
                                   (data.autoconsumo_hr_kwh || 0);
    
    if (autoconsumoTotal > 0 || somaAutoconsumoPostos > 0) {
      const diffAuto = Math.abs(autoconsumoTotal - somaAutoconsumoPostos);
      checks.push({
        nome: 'Autoconsumo Total vs Postos',
        esperado: autoconsumoTotal,
        encontrado: somaAutoconsumoPostos,
        diferenca: diffAuto,
        status: diffAuto < 1 ? 'ok' : diffAuto < 5 ? 'warning' : 'error',
        mensagem: `Total (${autoconsumoTotal.toFixed(0)}) vs P+FP+HR (${somaAutoconsumoPostos.toFixed(0)})`
      });
    }
  }

  // Check 5: Injeção por posto = total (Grupo A)
  if (data.grupo_tarifario === 'A') {
    const injecaoTotal = data.injecao_total_kwh || 0;
    const somaInjecaoPostos = (data.injecao_ponta_kwh || 0) + 
                               (data.injecao_fp_kwh || 0) + 
                               (data.injecao_hr_kwh || 0);
    
    if (injecaoTotal > 0 || somaInjecaoPostos > 0) {
      const diffInj = Math.abs(injecaoTotal - somaInjecaoPostos);
      checks.push({
        nome: 'Injeção Total vs Postos',
        esperado: injecaoTotal,
        encontrado: somaInjecaoPostos,
        diferenca: diffInj,
        status: diffInj < 1 ? 'ok' : diffInj < 5 ? 'warning' : 'error',
        mensagem: `Total (${injecaoTotal.toFixed(0)}) vs P+FP+HR (${somaInjecaoPostos.toFixed(0)})`
      });
    }
  }

  const hasErrors = checks.some(c => c.status === 'error');

  return {
    checks,
    isValid: !hasErrors
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
  // Só alertar sobre bandeiras se não for verde E tem consumo
  const temConsumo = (data.consumo_total_kwh || 0) > 0;
  const bandeiraRequerValor = data.bandeira && data.bandeira !== 'verde' && temConsumo;
  
  if (componentes.bandeiras.total === 0 && bandeiraRequerValor) {
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

  // Contar componentes preenchidos
  const componentesPreenchidos = [
    componentes.bandeiras.total > 0,
    componentes.tusd.total > 0,
    componentes.te.total > 0,
    componentes.scee.total !== 0, // SCEE pode ser negativo (créditos)
    componentes.demanda.total > 0,
    componentes.outros.total > 0,
    componentes.tributos.total > 0,
  ].filter(Boolean).length;

  // Verificar se diferença é aceitável
  // Exigir pelo menos 2 componentes preenchidos OU totalGeral = 0 (wizard ainda não preenchido)
  const temDadosMinimos = componentesPreenchidos >= 2 || componentes.totalGeral === 0;
  const isValid = temDadosMinimos && (componentes.totalGeral === 0 || percentualDiferenca <= 0.5);

  if (!isValid && componentes.totalGeral > 0) {
    if (!temDadosMinimos) {
      alertas.push({
        campo: 'Total',
        mensagem: 'Preencha pelo menos 2 componentes da fatura para validação',
        severidade: 'error',
      });
    } else {
      alertas.push({
        campo: 'Total',
        mensagem: `Diferença de ${percentualDiferenca.toFixed(2)}% entre valor informado e soma dos componentes`,
        severidade: 'error',
      });
    }
  }

  return {
    componentesPreenchidos,
    componentesVazios,
    alertasValidacao: alertas,
    percentualDiferenca,
    diferencaAbsoluta,
    isValid,
  };
}
