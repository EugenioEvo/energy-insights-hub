import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWizard } from '../WizardContext';
import { useUnidadesConsumidoras } from '@/hooks/useUnidadesConsumidoras';
import { useClientes } from '@/hooks/useClientes';
import { Building2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const concessionarias = [
  'Equatorial Goiás',
  'Equatorial Pará',
  'Equatorial Maranhão',
  'Equatorial Piauí',
  'Equatorial Alagoas',
  'CEMIG',
  'CPFL',
  'Enel',
  'Energisa',
  'Light',
  'Outra',
];

const modalidades = [
  { value: 'THS_VERDE', label: 'THS Verde' },
  { value: 'THS_AZUL', label: 'THS Azul' },
  { value: 'CONVENCIONAL', label: 'Convencional' },
];

const tiposFornecimento = [
  'MONOFÁSICO',
  'BIFÁSICO',
  'TRIFÁSICO',
];

export function Step0ContextoUC() {
  const { data, updateData, setCanProceed } = useWizard();
  const { data: unidades, isLoading: loadingUCs } = useUnidadesConsumidoras();
  const { data: clientes } = useClientes();

  // Validação
  useEffect(() => {
    const isValid = !!data.uc_id && data.demanda_contratada_kw > 0;
    setCanProceed(isValid);
  }, [data.uc_id, data.demanda_contratada_kw, setCanProceed]);

  // Preencher dados da UC selecionada
  const handleUCSelect = (ucId: string) => {
    const uc = unidades?.find(u => u.id === ucId);
    if (uc) {
      const cliente = clientes?.find(c => c.id === uc.cliente_id);
      updateData({
        uc_id: uc.id,
        uc_numero: uc.numero,
        concessionaria: uc.distribuidora,
        modalidade: uc.modalidade_tarifaria,
        demanda_contratada_kw: uc.demanda_contratada,
        cnpj: cliente?.cnpj || '',
        razao_social: cliente?.nome || '',
      });
    }
  };

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Passo 0 — Contexto da UC
        </CardTitle>
        <CardDescription>
          Selecione a unidade consumidora e revise os dados cadastrais. Estes dados são pré-preenchidos do cadastro.
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
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {concessionarias.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
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
                  placeholder="A A4 COMERCIAL..."
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
              <div className="space-y-2">
                <Label>Demanda Contratada (kW) *</Label>
                <Input 
                  type="number"
                  value={data.demanda_contratada_kw || ''} 
                  onChange={(e) => updateData({ demanda_contratada_kw: parseFloat(e.target.value) || 0 })}
                  className={!data.demanda_contratada_kw ? 'border-destructive' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Demanda de Geração (kW)</Label>
                <Input 
                  type="number"
                  value={data.demanda_geracao_kw || ''} 
                  onChange={(e) => updateData({ demanda_geracao_kw: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={data.cnpj} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input value={data.razao_social} readOnly className="bg-muted" />
            </div>
          </>
        )}

        {!data.demanda_contratada_kw && data.uc_id && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Demanda contratada deve ser maior que 0
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
