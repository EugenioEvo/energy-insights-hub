import { useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useWizard, GrupoTarifario, FaturaWizardData } from '../WizardContext';
import { useUnidadesConsumidoras } from '@/hooks/useUnidadesConsumidoras';
import { useClientes } from '@/hooks/useClientes';
import { useConcessionariasComTarifas } from '@/hooks/useTarifas';
import { Building2, AlertCircle, Zap, Sun, PlugZap, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileImportCard } from '../FileImportCard';
import { classificarGD } from '@/lib/lei14300';

const modalidadesGrupoA = [
  { value: 'THS_VERDE', label: 'THS Verde' },
  { value: 'THS_AZUL', label: 'THS Azul' },
];

const modalidadesGrupoB = [
  { value: 'CONVENCIONAL', label: 'Convencional' },
  { value: 'BRANCA', label: 'Branca' },
];

const tiposFornecimento = [
  'MONOFÁSICO',
  'BIFÁSICO',
  'TRIFÁSICO',
];

export function Step0ContextoUC() {
  const { data, updateData, setCanProceed, isGrupoA } = useWizard();
  const { data: unidades, isLoading: loadingUCs } = useUnidadesConsumidoras();
  const { data: clientes } = useClientes();
  const { data: concessionarias, isLoading: loadingConcessionarias } = useConcessionariasComTarifas();

  // Validação baseada no grupo tarifário
  useEffect(() => {
    const baseValid = !!data.uc_id;
    const grupoAValid = !isGrupoA || data.demanda_contratada_kw > 0;
    setCanProceed(baseValid && grupoAValid);
  }, [data.uc_id, data.demanda_contratada_kw, isGrupoA, setCanProceed]);

  // Handler para importação de dados via PDF/CSV
  const handleImport = useCallback((importedData: Partial<FaturaWizardData>) => {
    // Se importou número de UC, tentar encontrar a UC correspondente
    if (importedData.uc_numero && unidades) {
      const matchedUC = unidades.find(uc => 
        uc.numero === importedData.uc_numero || 
        uc.numero.replace(/\D/g, '') === importedData.uc_numero.replace(/\D/g, '')
      );
      if (matchedUC) {
        importedData.uc_id = matchedUC.id;
        const cliente = clientes?.find(c => c.id === matchedUC.cliente_id);
        if (cliente) {
          importedData.cnpj = cliente.cnpj;
          importedData.razao_social = cliente.nome;
        }
      }
    }
    
    updateData(importedData);
  }, [unidades, clientes, updateData]);

  // Preencher dados da UC selecionada
  const handleUCSelect = (ucId: string) => {
    const uc = unidades?.find(u => u.id === ucId);
    if (uc) {
      const cliente = clientes?.find(c => c.id === uc.cliente_id);
      
      // Determinar grupo tarifário baseado no subgrupo/classe
      const grupoTarifario: GrupoTarifario = 
        uc.grupo_tarifario === 'B' || 
        uc.subgrupo?.startsWith('B') ||
        uc.classe_tarifaria?.startsWith('B') 
          ? 'B' 
          : 'A';
      
      // CORREÇÃO: Determinar classificação GD baseada na data de protocolo da UC
      // Se a UC tem data_protocolo_gd, usar classificarGD(), senão fallback para 'gd2' (conservador)
      const classificacaoGD = uc.data_protocolo_gd 
        ? classificarGD(uc.data_protocolo_gd)
        : 'gd2';
      
      updateData({
        uc_id: uc.id,
        uc_numero: uc.numero,
        concessionaria: uc.distribuidora,
        modalidade: uc.modalidade_tarifaria,
        demanda_contratada_kw: uc.demanda_contratada,
        demanda_geracao_kw: uc.demanda_geracao_kw || 0,
        cnpj: cliente?.cnpj || '',
        razao_social: cliente?.nome || '',
        grupo_tarifario: grupoTarifario,
        tem_geracao_local: uc.tem_geracao_propria || false,
        classe_tarifaria: uc.classe_tarifaria || '',
        tensao_kv: uc.tensao_kv || 0,
        classificacao_gd_aplicada: classificacaoGD,
      });
    }
  };

  const handleGrupoChange = (grupo: GrupoTarifario) => {
    updateData({ 
      grupo_tarifario: grupo,
      // Resetar modalidade ao trocar grupo
      modalidade: grupo === 'A' ? 'THS_VERDE' : 'CONVENCIONAL',
      // Grupo B não tem demanda
      demanda_contratada_kw: grupo === 'B' ? 0 : data.demanda_contratada_kw,
    });
  };

  const modalidades = isGrupoA ? modalidadesGrupoA : modalidadesGrupoB;

  if (loadingUCs) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  if (!unidades || unidades.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma unidade consumidora cadastrada. Cadastre uma UC antes de lançar faturas.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card de Importação Automática */}
      <FileImportCard onImport={handleImport} />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Passo 0 — Contexto da UC
          </CardTitle>
          <CardDescription>
            Selecione a unidade consumidora e configure o tipo de faturamento, ou importe de um PDF acima.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Seleção da UC */}
        <div className="space-y-2">
          <Label htmlFor="uc_select">Unidade Consumidora *</Label>
          <Select value={data.uc_id} onValueChange={handleUCSelect}>
            <SelectTrigger id="uc_select">
              <SelectValue placeholder="Selecione a UC" />
            </SelectTrigger>
            <SelectContent>
              {unidades?.map(uc => (
                <SelectItem key={uc.id} value={uc.id}>
                  {uc.numero} - {uc.endereco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {data.uc_id && (
          <>
            {/* Grupo Tarifário */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Grupo Tarifário
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Define a estrutura de faturamento
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge 
                    variant={isGrupoA ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleGrupoChange('A')}
                  >
                    Grupo A (Binômia)
                  </Badge>
                  <Badge 
                    variant={!isGrupoA ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleGrupoChange('B')}
                  >
                    Grupo B (Monômia)
                  </Badge>
                </div>
              </div>

              <div className="text-sm p-3 bg-background rounded border">
                {isGrupoA ? (
                  <div className="space-y-1">
                    <p className="font-medium text-primary">Grupo A - Tarifa Binômia</p>
                    <ul className="text-muted-foreground list-disc list-inside">
                      <li>Faturamento por demanda + energia</li>
                      <li>Postos horários: Ponta, Fora Ponta, Reservado</li>
                      <li>Tensão ≥ 2,3 kV</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium text-primary">Grupo B - Tarifa Monômia</p>
                    <ul className="text-muted-foreground list-disc list-inside">
                      <li>Faturamento apenas por energia</li>
                      <li>Sem postos horários (consumo total)</li>
                      <li>Tensão &lt; 2,3 kV</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Fontes de energia */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h3 className="font-medium">Fontes de Energia GD</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-background rounded border">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="font-medium text-sm">Geração Local</p>
                      <p className="text-xs text-muted-foreground">Usina junto à carga</p>
                    </div>
                  </div>
                  <Switch
                    checked={data.tem_geracao_local}
                    onCheckedChange={(checked) => updateData({ tem_geracao_local: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-background rounded border">
                  <div className="flex items-center gap-2">
                    <PlugZap className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">Usina Remota</p>
                      <p className="text-xs text-muted-foreground">Créditos via assinatura</p>
                    </div>
                  </div>
                  <Switch
                    checked={data.tem_usina_remota}
                    onCheckedChange={(checked) => updateData({ tem_usina_remota: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Dados da UC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número UC</Label>
                <Input value={data.uc_numero} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Concessionária</Label>
                <Select 
                  value={data.concessionaria} 
                  onValueChange={(v) => updateData({ concessionaria: v })}
                  disabled={loadingConcessionarias}
                >
                  <SelectTrigger>
                    {loadingConcessionarias ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando...
                      </span>
                    ) : (
                      <SelectValue placeholder="Selecione a concessionária" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {concessionarias?.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    {(!concessionarias || concessionarias.length === 0) && !loadingConcessionarias && (
                      <SelectItem value="" disabled>Nenhuma tarifa cadastrada</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Classe Tarifária</Label>
                <Input 
                  value={data.classe_tarifaria} 
                  onChange={(e) => updateData({ classe_tarifaria: e.target.value })}
                  placeholder={isGrupoA ? "A4 COMERCIAL" : "B3 RESIDENCIAL"}
                />
              </div>
              <div className="space-y-2">
                <Label>Modalidade Tarifária</Label>
                <Select 
                  value={data.modalidade} 
                  onValueChange={(v) => updateData({ modalidade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modalidades.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isGrupoA && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tensão (kV)</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={data.tensao_kv || ''} 
                    onChange={(e) => updateData({ tensao_kv: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demanda Contratada (kW) *</Label>
                  <Input 
                    type="number"
                    value={data.demanda_contratada_kw || ''} 
                    onChange={(e) => updateData({ demanda_contratada_kw: parseFloat(e.target.value) || 0 })}
                    className={!data.demanda_contratada_kw ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demanda de Geração (kW)</Label>
                  <Input 
                    type="number"
                    value={data.demanda_geracao_kw || ''} 
                    onChange={(e) => updateData({ demanda_geracao_kw: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}

            {!isGrupoA && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Fornecimento</Label>
                  <Select 
                    value={data.tipo_fornecimento} 
                    onValueChange={(v) => updateData({ tipo_fornecimento: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposFornecimento.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={data.cnpj} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input value={data.razao_social} readOnly className="bg-muted" />
              </div>
            </div>
          </>
        )}

        {isGrupoA && !data.demanda_contratada_kw && data.uc_id && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Para Grupo A, a demanda contratada deve ser maior que 0
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
