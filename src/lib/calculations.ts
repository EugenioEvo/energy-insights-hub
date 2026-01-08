import { FaturaMensal, GeracaoMensal, AssinaturaMensal, Alerta, KPIs, DadosMensais } from '@/types/energy';

export function calcularKPIsMensais(
  fatura: FaturaMensal,
  geracao: GeracaoMensal,
  assinatura: AssinaturaMensal
): DadosMensais['kpis'] {
  // Custo base por kWh (sem assinatura)
  const custoKwhBase = fatura.valorTotal / fatura.consumoTotalKwh;

  // Valor total atual (fatura + assinatura)
  const valorTotalAtual = fatura.valorTotal + assinatura.valorAssinatura;

  // Custo kWh atual
  const custoKwhAtual = valorTotalAtual / fatura.consumoTotalKwh;

  // Perda de assinatura (energia não utilizada)
  const perdaAssinatura = Math.max(0, assinatura.energiaContratadaKwh - assinatura.energiaAlocadaKwh);
  const custoPerdaAssinatura = perdaAssinatura * (assinatura.valorAssinatura / assinatura.energiaContratadaKwh);

  // Economia prometida (valor que seria pago sem a compensação)
  const valorBaseEstimado = fatura.consumoTotalKwh * custoKwhBase;
  
  // Economia mensal (diferença entre o que pagaria sem benefícios e o que paga agora)
  // Considerando compensação de energia solar e assinatura
  const beneficioCompensacao = geracao.compensacaoKwh * custoKwhBase;
  const economiaMensalRs = beneficioCompensacao - assinatura.valorAssinatura + (fatura.valorTotal * (assinatura.economiaPrometidaPercent / 100));
  
  // Economia percentual
  const economiaMensalPercent = (economiaMensalRs / valorBaseEstimado) * 100;

  return {
    custoKwhBase,
    valorTotalAtual,
    economiaMensalRs: Math.max(0, economiaMensalRs),
    economiaMensalPercent: Math.max(0, economiaMensalPercent),
    custoKwhAtual,
    perdaAssinatura,
    custoPerdaAssinatura,
  };
}

export function gerarAlertas(
  fatura: FaturaMensal,
  geracao: GeracaoMensal,
  assinatura: AssinaturaMensal,
  geracoesAnteriores: GeracaoMensal[]
): Alerta[] {
  const alertas: Alerta[] = [];

  // Alerta de demanda
  if (fatura.demandaMedidaKw > fatura.demandaContratadaKw) {
    const ultrapassagem = ((fatura.demandaMedidaKw - fatura.demandaContratadaKw) / fatura.demandaContratadaKw) * 100;
    alertas.push({
      tipo: 'demanda',
      severidade: 'critico',
      titulo: 'Ultrapassagem de Demanda',
      descricao: `Demanda medida (${fatura.demandaMedidaKw} kW) excedeu a contratada (${fatura.demandaContratadaKw} kW) em ${ultrapassagem.toFixed(1)}%`,
      valor: fatura.multaDemanda,
    });
  }

  // Alerta de multas
  const totalMultas = fatura.multaDemanda + fatura.multaReativo;
  if (totalMultas > 0) {
    alertas.push({
      tipo: 'multa',
      severidade: totalMultas > 500 ? 'critico' : 'atencao',
      titulo: 'Multas Identificadas',
      descricao: `Multas totais no valor de R$ ${totalMultas.toFixed(2)} (Demanda: R$ ${fatura.multaDemanda.toFixed(2)}, Reativo: R$ ${fatura.multaReativo.toFixed(2)})`,
      valor: totalMultas,
    });
  }

  // Alerta de subgeração
  if (geracoesAnteriores.length >= 3) {
    const ultimas3 = geracoesAnteriores.slice(0, 3);
    const mediaGeracao = ultimas3.reduce((acc, g) => acc + g.geracaoTotalKwh, 0) / 3;
    const limiteMinimo = mediaGeracao * 0.9;

    if (geracao.geracaoTotalKwh < limiteMinimo) {
      const queda = ((mediaGeracao - geracao.geracaoTotalKwh) / mediaGeracao) * 100;
      alertas.push({
        tipo: 'subgeracao',
        severidade: 'atencao',
        titulo: 'Geração Abaixo do Esperado',
        descricao: `Geração de ${geracao.geracaoTotalKwh.toLocaleString()} kWh ficou ${queda.toFixed(1)}% abaixo da média dos últimos 3 meses`,
        valor: geracao.geracaoTotalKwh,
      });
    }
  }

  // Alerta de subutilização da assinatura
  const utilizacaoAssinatura = (assinatura.energiaAlocadaKwh / assinatura.energiaContratadaKwh) * 100;
  if (utilizacaoAssinatura < 90) {
    alertas.push({
      tipo: 'assinatura',
      severidade: utilizacaoAssinatura < 70 ? 'atencao' : 'info',
      titulo: 'Subutilização de Energia Contratada',
      descricao: `Apenas ${utilizacaoAssinatura.toFixed(1)}% da energia contratada foi alocada. Considere ajustar o contrato.`,
      valor: assinatura.energiaContratadaKwh - assinatura.energiaAlocadaKwh,
    });
  }

  return alertas;
}

export function calcularStatusGeral(alertas: Alerta[]): 'OK' | 'ATENCAO' | 'CRITICO' {
  const temCritico = alertas.some(a => a.severidade === 'critico');
  const temAtencao = alertas.some(a => a.severidade === 'atencao');

  if (temCritico) return 'CRITICO';
  if (temAtencao) return 'ATENCAO';
  return 'OK';
}

export function calcularKPIsGlobais(
  faturas: FaturaMensal[],
  geracoes: GeracaoMensal[],
  assinaturas: AssinaturaMensal[]
): KPIs {
  // Return empty KPIs if any required data is missing
  if (faturas.length === 0 || geracoes.length === 0 || assinaturas.length === 0) {
    return {
      economiaDoMes: 0,
      economiaAcumulada: 0,
      custoKwhAntes: 0,
      custoKwhDepois: 0,
      statusGeral: 'OK',
      alertas: [],
    };
  }

  // Ordenar por data (mais recente primeiro)
  const faturasSorted = [...faturas].sort((a, b) => b.mesRef.localeCompare(a.mesRef));
  const geracoesSorted = [...geracoes].sort((a, b) => b.mesRef.localeCompare(a.mesRef));
  const assinaturasSorted = [...assinaturas].sort((a, b) => b.mesRef.localeCompare(a.mesRef));

  const faturaMaisRecente = faturasSorted[0];
  const geracaoMaisRecente = geracoesSorted.find(g => g.mesRef === faturaMaisRecente.mesRef) || geracoesSorted[0];
  const assinaturaMaisRecente = assinaturasSorted.find(a => a.mesRef === faturaMaisRecente.mesRef) || assinaturasSorted[0];

  // Safety check - should not happen due to length check above, but just in case
  if (!geracaoMaisRecente || !assinaturaMaisRecente) {
    return {
      economiaDoMes: 0,
      economiaAcumulada: 0,
      custoKwhAntes: 0,
      custoKwhDepois: 0,
      statusGeral: 'OK',
      alertas: [],
    };
  }

  // Calcular KPIs do mês mais recente
  const kpisMensais = calcularKPIsMensais(faturaMaisRecente, geracaoMaisRecente, assinaturaMaisRecente);

  // Calcular economia acumulada
  let economiaAcumulada = 0;
  faturasSorted.forEach((fatura, index) => {
    const geracao = geracoesSorted.find(g => g.mesRef === fatura.mesRef);
    const assinatura = assinaturasSorted.find(a => a.mesRef === fatura.mesRef);
    if (geracao && assinatura) {
      const kpis = calcularKPIsMensais(fatura, geracao, assinatura);
      economiaAcumulada += kpis.economiaMensalRs;
    }
  });

  // Gerar alertas
  const alertas = gerarAlertas(
    faturaMaisRecente,
    geracaoMaisRecente,
    assinaturaMaisRecente,
    geracoesSorted.slice(1)
  );

  // Calcular médias de custo
  const totalConsumo = faturasSorted.reduce((acc, f) => acc + f.consumoTotalKwh, 0);
  const totalValor = faturasSorted.reduce((acc, f) => acc + f.valorTotal, 0);
  const totalAssinatura = assinaturasSorted.reduce((acc, a) => acc + a.valorAssinatura, 0);

  const custoKwhAntes = totalValor / totalConsumo;
  const custoKwhDepois = (totalValor + totalAssinatura) / totalConsumo;

  return {
    economiaDoMes: kpisMensais.economiaMensalRs,
    economiaAcumulada,
    custoKwhAntes,
    custoKwhDepois,
    statusGeral: calcularStatusGeral(alertas),
    alertas,
  };
}
