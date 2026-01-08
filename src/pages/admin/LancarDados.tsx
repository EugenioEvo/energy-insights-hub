import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useEnergy } from '@/contexts/EnergyContext';
import { useToast } from '@/hooks/use-toast';
import { Receipt, Sun, FileText, Save, Loader2 } from 'lucide-react';

export default function LancarDados() {
  const { addFatura, addGeracao, addAssinatura, ucId, unidadesConsumidoras, isLoading } = useEnergy();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [mesRef, setMesRef] = useState('');

  // Fatura state - Grupo A completo
  const [fatura, setFatura] = useState({
    // Consumo
    consumoTotalKwh: '',
    pontaKwh: '',
    foraPontaKwh: '',
    // Demanda
    demandaContratadaKw: '',
    demandaMedidaKw: '',
    demandaGeracaoKw: '',
    // Valores de Energia (R$)
    energiaPontaRs: '',
    energiaForaPontaRs: '',
    // Valores de Demanda (R$)
    demandaContratadaRs: '',
    demandaGeracaoRs: '',
    // Componentes tarifários
    valorTotal: '',
    valorTe: '',
    valorTusd: '',
    bandeiras: 'verde' as 'verde' | 'amarela' | 'vermelha1' | 'vermelha2',
    // Multas
    multaDemanda: '',
    multaDemandaUltrapassagem: '',
    multaUferPonta: '',
    multaUferForaPonta: '',
    // Outros
    iluminacaoPublica: '',
    outrosEncargos: '',
  });

  // Geracao state
  const [geracao, setGeracao] = useState({
    geracaoTotalKwh: '',
    autoconsumoKwh: '',
    injecaoKwh: '',
    compensacaoKwh: '',
    disponibilidadePercent: '',
    perdasEstimadasKwh: '',
  });

  // Assinatura state
  const [assinatura, setAssinatura] = useState({
    ucRemota: '',
    energiaContratadaKwh: '',
    energiaAlocadaKwh: '',
    valorAssinatura: '',
    economiaPrometidaPercent: '',
  });

  const handleSaveFatura = async () => {
    if (!mesRef) {
      toast({ title: 'Erro', description: 'Selecione o mês de referência', variant: 'destructive' });
      return;
    }

    if (!ucId) {
      toast({ title: 'Erro', description: 'Nenhuma unidade consumidora selecionada', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await addFatura({
        uc_id: ucId,
        mes_ref: mesRef,
        // Consumo
        consumo_total_kwh: parseFloat(fatura.consumoTotalKwh) || 0,
        ponta_kwh: parseFloat(fatura.pontaKwh) || 0,
        fora_ponta_kwh: parseFloat(fatura.foraPontaKwh) || 0,
        // Demanda
        demanda_contratada_kw: parseFloat(fatura.demandaContratadaKw) || 0,
        demanda_medida_kw: parseFloat(fatura.demandaMedidaKw) || 0,
        demanda_geracao_kw: parseFloat(fatura.demandaGeracaoKw) || 0,
        // Valores de Energia (R$)
        energia_ponta_rs: parseFloat(fatura.energiaPontaRs) || 0,
        energia_fora_ponta_rs: parseFloat(fatura.energiaForaPontaRs) || 0,
        // Valores de Demanda (R$)
        demanda_contratada_rs: parseFloat(fatura.demandaContratadaRs) || 0,
        demanda_geracao_rs: parseFloat(fatura.demandaGeracaoRs) || 0,
        // Componentes tarifários
        valor_total: parseFloat(fatura.valorTotal) || 0,
        valor_te: parseFloat(fatura.valorTe) || 0,
        valor_tusd: parseFloat(fatura.valorTusd) || 0,
        bandeiras: fatura.bandeiras,
        // Multas
        multa_demanda: parseFloat(fatura.multaDemanda) || 0,
        multa_demanda_ultrapassagem: parseFloat(fatura.multaDemandaUltrapassagem) || 0,
        multa_ufer_ponta: parseFloat(fatura.multaUferPonta) || 0,
        multa_ufer_fora_ponta: parseFloat(fatura.multaUferForaPonta) || 0,
        multa_reativo: 0, // mantido por compatibilidade
        // Outros
        iluminacao_publica: parseFloat(fatura.iluminacaoPublica) || 0,
        outros_encargos: parseFloat(fatura.outrosEncargos) || 0,
      });

      toast({ title: 'Sucesso', description: 'Fatura registrada com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar fatura', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeracao = async () => {
    if (!mesRef) {
      toast({ title: 'Erro', description: 'Selecione o mês de referência', variant: 'destructive' });
      return;
    }

    if (!ucId) {
      toast({ title: 'Erro', description: 'Nenhuma unidade consumidora selecionada', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await addGeracao({
        uc_id: ucId,
        mes_ref: mesRef,
        geracao_total_kwh: parseFloat(geracao.geracaoTotalKwh) || 0,
        autoconsumo_kwh: parseFloat(geracao.autoconsumoKwh) || 0,
        injecao_kwh: parseFloat(geracao.injecaoKwh) || 0,
        compensacao_kwh: parseFloat(geracao.compensacaoKwh) || 0,
        disponibilidade_percent: parseFloat(geracao.disponibilidadePercent) || 0,
        perdas_estimadas_kwh: parseFloat(geracao.perdasEstimadasKwh) || 0,
      });

      toast({ title: 'Sucesso', description: 'Geração registrada com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar geração', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssinatura = async () => {
    if (!mesRef) {
      toast({ title: 'Erro', description: 'Selecione o mês de referência', variant: 'destructive' });
      return;
    }

    if (!ucId) {
      toast({ title: 'Erro', description: 'Nenhuma unidade consumidora selecionada', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await addAssinatura({
        uc_id: ucId,
        mes_ref: mesRef,
        uc_remota: assinatura.ucRemota,
        energia_contratada_kwh: parseFloat(assinatura.energiaContratadaKwh) || 0,
        energia_alocada_kwh: parseFloat(assinatura.energiaAlocadaKwh) || 0,
        valor_assinatura: parseFloat(assinatura.valorAssinatura) || 0,
        economia_prometida_percent: parseFloat(assinatura.economiaPrometidaPercent) || 0,
      });

      toast({ title: 'Sucesso', description: 'Assinatura registrada com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar assinatura', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const generateMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    return months;
  };

  if (unidadesConsumidoras.length === 0) {
    return (
      <DashboardLayout title="Lançar Dados" subtitle="Registro mensal de faturas, geração e assinatura">
        <div className="flex flex-col items-center justify-center h-64 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground text-lg">Nenhuma unidade consumidora cadastrada.</p>
          <p className="text-muted-foreground text-sm mt-2">
            Acesse "Clientes" para cadastrar um cliente e uma unidade consumidora primeiro.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Lançar Dados" subtitle="Registro mensal de faturas, geração e assinatura - Grupo A">
      <div className="max-w-5xl">
        {/* Month Selector */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <Label htmlFor="mesRef" className="text-base font-medium">Mês de Referência</Label>
          <Select value={mesRef} onValueChange={setMesRef}>
            <SelectTrigger className="w-64 mt-2">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {generateMonths().map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="fatura" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fatura" className="gap-2">
              <Receipt className="h-4 w-4" />
              Fatura Grupo A
            </TabsTrigger>
            <TabsTrigger value="geracao" className="gap-2">
              <Sun className="h-4 w-4" />
              Geração Solar
            </TabsTrigger>
            <TabsTrigger value="assinatura" className="gap-2">
              <FileText className="h-4 w-4" />
              Assinatura
            </TabsTrigger>
          </TabsList>

          {/* Fatura Tab - Grupo A */}
          <TabsContent value="fatura">
            <div className="bg-card rounded-xl border border-border p-6 mt-4 space-y-6">
              <h3 className="text-lg font-semibold">Dados da Fatura - Grupo A</h3>
              
              {/* Consumo */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Consumo de Energia</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Consumo Total (kWh)</Label>
                    <Input
                      type="number"
                      value={fatura.consumoTotalKwh}
                      onChange={(e) => setFatura({ ...fatura, consumoTotalKwh: e.target.value })}
                      placeholder="45000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumo Ponta (kWh)</Label>
                    <Input
                      type="number"
                      value={fatura.pontaKwh}
                      onChange={(e) => setFatura({ ...fatura, pontaKwh: e.target.value })}
                      placeholder="8500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumo Fora Ponta (kWh)</Label>
                    <Input
                      type="number"
                      value={fatura.foraPontaKwh}
                      onChange={(e) => setFatura({ ...fatura, foraPontaKwh: e.target.value })}
                      placeholder="36500"
                    />
                  </div>
                </div>
              </div>

              {/* Demanda */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Demanda</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Demanda Contratada (kW)</Label>
                    <Input
                      type="number"
                      value={fatura.demandaContratadaKw}
                      onChange={(e) => setFatura({ ...fatura, demandaContratadaKw: e.target.value })}
                      placeholder="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Demanda Medida (kW)</Label>
                    <Input
                      type="number"
                      value={fatura.demandaMedidaKw}
                      onChange={(e) => setFatura({ ...fatura, demandaMedidaKw: e.target.value })}
                      placeholder="485"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Demanda de Geração (kW)</Label>
                    <Input
                      type="number"
                      value={fatura.demandaGeracaoKw}
                      onChange={(e) => setFatura({ ...fatura, demandaGeracaoKw: e.target.value })}
                      placeholder="200"
                    />
                  </div>
                </div>
              </div>

              {/* Valores de Energia */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Valores de Energia (R$)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Energia Ponta (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.energiaPontaRs}
                      onChange={(e) => setFatura({ ...fatura, energiaPontaRs: e.target.value })}
                      placeholder="12000.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Energia Fora Ponta (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.energiaForaPontaRs}
                      onChange={(e) => setFatura({ ...fatura, energiaForaPontaRs: e.target.value })}
                      placeholder="18000.00"
                    />
                  </div>
                </div>
              </div>

              {/* Valores de Demanda */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Valores de Demanda (R$)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Demanda Contratada (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.demandaContratadaRs}
                      onChange={(e) => setFatura({ ...fatura, demandaContratadaRs: e.target.value })}
                      placeholder="8500.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Demanda de Geração (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.demandaGeracaoRs}
                      onChange={(e) => setFatura({ ...fatura, demandaGeracaoRs: e.target.value })}
                      placeholder="3500.00"
                    />
                  </div>
                </div>
              </div>

              {/* Componentes Tarifários */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Componentes Tarifários</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Total (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.valorTotal}
                      onChange={(e) => setFatura({ ...fatura, valorTotal: e.target.value })}
                      placeholder="45000.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor TE (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.valorTe}
                      onChange={(e) => setFatura({ ...fatura, valorTe: e.target.value })}
                      placeholder="22000.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor TUSD (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.valorTusd}
                      onChange={(e) => setFatura({ ...fatura, valorTusd: e.target.value })}
                      placeholder="20000.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bandeira Tarifária</Label>
                    <Select 
                      value={fatura.bandeiras} 
                      onValueChange={(value: 'verde' | 'amarela' | 'vermelha1' | 'vermelha2') => 
                        setFatura({ ...fatura, bandeiras: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verde">Verde</SelectItem>
                        <SelectItem value="amarela">Amarela</SelectItem>
                        <SelectItem value="vermelha1">Vermelha 1</SelectItem>
                        <SelectItem value="vermelha2">Vermelha 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Multas */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Multas e Penalidades</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Multa Demanda (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.multaDemanda}
                      onChange={(e) => setFatura({ ...fatura, multaDemanda: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ultrapassagem Demanda (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.multaDemandaUltrapassagem}
                      onChange={(e) => setFatura({ ...fatura, multaDemandaUltrapassagem: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UFER Ponta (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.multaUferPonta}
                      onChange={(e) => setFatura({ ...fatura, multaUferPonta: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UFER Fora Ponta (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.multaUferForaPonta}
                      onChange={(e) => setFatura({ ...fatura, multaUferForaPonta: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Outros */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Outros Encargos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Iluminação Pública - CIP (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.iluminacaoPublica}
                      onChange={(e) => setFatura({ ...fatura, iluminacaoPublica: e.target.value })}
                      placeholder="350.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Outros Encargos (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fatura.outrosEncargos}
                      onChange={(e) => setFatura({ ...fatura, outrosEncargos: e.target.value })}
                      placeholder="500.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={handleSaveFatura} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Fatura
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Geracao Tab */}
          <TabsContent value="geracao">
            <div className="bg-card rounded-xl border border-border p-6 mt-4">
              <h3 className="text-lg font-semibold mb-6">Dados de Geração Solar</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="geracaoTotal">Geração Total (kWh)</Label>
                  <Input
                    id="geracaoTotal"
                    type="number"
                    value={geracao.geracaoTotalKwh}
                    onChange={(e) => setGeracao({ ...geracao, geracaoTotalKwh: e.target.value })}
                    placeholder="12500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoconsumo">Autoconsumo (kWh)</Label>
                  <Input
                    id="autoconsumo"
                    type="number"
                    value={geracao.autoconsumoKwh}
                    onChange={(e) => setGeracao({ ...geracao, autoconsumoKwh: e.target.value })}
                    placeholder="8500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="injecao">Injeção na Rede (kWh)</Label>
                  <Input
                    id="injecao"
                    type="number"
                    value={geracao.injecaoKwh}
                    onChange={(e) => setGeracao({ ...geracao, injecaoKwh: e.target.value })}
                    placeholder="4000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compensacao">Compensação (kWh)</Label>
                  <Input
                    id="compensacao"
                    type="number"
                    value={geracao.compensacaoKwh}
                    onChange={(e) => setGeracao({ ...geracao, compensacaoKwh: e.target.value })}
                    placeholder="3800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="disponibilidade">Disponibilidade (%)</Label>
                  <Input
                    id="disponibilidade"
                    type="number"
                    step="0.1"
                    value={geracao.disponibilidadePercent}
                    onChange={(e) => setGeracao({ ...geracao, disponibilidadePercent: e.target.value })}
                    placeholder="98.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perdas">Perdas Estimadas (kWh)</Label>
                  <Input
                    id="perdas"
                    type="number"
                    value={geracao.perdasEstimadasKwh}
                    onChange={(e) => setGeracao({ ...geracao, perdasEstimadasKwh: e.target.value })}
                    placeholder="200"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveGeracao} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Geração
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Assinatura Tab */}
          <TabsContent value="assinatura">
            <div className="bg-card rounded-xl border border-border p-6 mt-4">
              <h3 className="text-lg font-semibold mb-6">Dados da Assinatura de Energia</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ucRemota">UC Remota</Label>
                  <Input
                    id="ucRemota"
                    value={assinatura.ucRemota}
                    onChange={(e) => setAssinatura({ ...assinatura, ucRemota: e.target.value })}
                    placeholder="UFV-SOLAR-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="energiaContratada">Energia Contratada (kWh)</Label>
                  <Input
                    id="energiaContratada"
                    type="number"
                    value={assinatura.energiaContratadaKwh}
                    onChange={(e) => setAssinatura({ ...assinatura, energiaContratadaKwh: e.target.value })}
                    placeholder="15000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="energiaAlocada">Energia Alocada (kWh)</Label>
                  <Input
                    id="energiaAlocada"
                    type="number"
                    value={assinatura.energiaAlocadaKwh}
                    onChange={(e) => setAssinatura({ ...assinatura, energiaAlocadaKwh: e.target.value })}
                    placeholder="14200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorAssinatura">Valor Assinatura (R$)</Label>
                  <Input
                    id="valorAssinatura"
                    type="number"
                    step="0.01"
                    value={assinatura.valorAssinatura}
                    onChange={(e) => setAssinatura({ ...assinatura, valorAssinatura: e.target.value })}
                    placeholder="8500.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="economiaPrometida">Economia Prometida (%)</Label>
                  <Input
                    id="economiaPrometida"
                    type="number"
                    step="0.1"
                    value={assinatura.economiaPrometidaPercent}
                    onChange={(e) => setAssinatura({ ...assinatura, economiaPrometidaPercent: e.target.value })}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveAssinatura} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Assinatura
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
