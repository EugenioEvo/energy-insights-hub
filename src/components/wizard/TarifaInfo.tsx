import { useTarifas, useTarifasDisponiveis, TarifaConcessionaria } from '@/hooks/useTarifas';
import { useWizard } from './WizardContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Info, AlertTriangle, CheckCircle, Database, MousePointerClick } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface TarifaInfoProps {
  showDetails?: boolean;
  compact?: boolean;
}

function TarifasFallback({ concessionaria, grupoTarifario, modalidade }: { 
  concessionaria: string; 
  grupoTarifario: 'A' | 'B'; 
  modalidade?: string | null;
}) {
  const { data: tarifasDisponiveis, isLoading } = useTarifasDisponiveis(concessionaria);
  const { updateData } = useWizard();

  const handleSelectTarifa = (tarifa: { 
    grupo_tarifario: string; 
    modalidade: string | null;
    subgrupo: string | null;
  }) => {
    const updates: Record<string, unknown> = {
      grupo_tarifario: tarifa.grupo_tarifario as 'A' | 'B',
    };
    
    if (tarifa.modalidade) {
      updates.modalidade = tarifa.modalidade;
    }
    
    updateData(updates);
    
    toast.success('Tarifa aplicada!', {
      description: `Grupo ${tarifa.grupo_tarifario}${tarifa.modalidade ? ` - ${tarifa.modalidade}` : ''} selecionado.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Buscando tarifas disponíveis...</span>
      </div>
    );
  }

  if (!tarifasDisponiveis || tarifasDisponiveis.length === 0) {
    return (
      <Alert variant="destructive" className="mt-3">
        <Database className="h-4 w-4" />
        <AlertTitle>Nenhuma tarifa cadastrada</AlertTitle>
        <AlertDescription>
          Não há tarifas cadastradas para a concessionária "{concessionaria}".
          Acesse a página de Tarifas para cadastrar as tarifas necessárias.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <MousePointerClick className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Clique em uma tarifa para aplicá-la:</span>
      </div>
      <Card className="border-muted">
        <ScrollArea className="max-h-48">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Grupo</TableHead>
                <TableHead className="text-xs">Subgrupo</TableHead>
                <TableHead className="text-xs">Modalidade</TableHead>
                <TableHead className="text-xs">Resolução</TableHead>
                <TableHead className="text-xs">Vigência</TableHead>
                <TableHead className="text-xs w-20">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarifasDisponiveis.map((t) => {
                const isMatch = t.grupo_tarifario === grupoTarifario && 
                  (grupoTarifario === 'B' || 
                    (t.modalidade?.toLowerCase() === modalidade?.toLowerCase()));
                
                return (
                  <TableRow 
                    key={t.id} 
                    className={`cursor-pointer hover:bg-accent/50 transition-colors ${isMatch ? "bg-green-500/10" : ""}`}
                    onClick={() => handleSelectTarifa(t)}
                  >
                    <TableCell className="py-1">
                      <Badge variant={t.grupo_tarifario === grupoTarifario ? "default" : "outline"} className="text-xs">
                        {t.grupo_tarifario}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1 text-xs">{t.subgrupo || '—'}</TableCell>
                    <TableCell className="py-1 text-xs">{t.modalidade || '—'}</TableCell>
                    <TableCell className="py-1 text-xs font-mono">{t.resolucao_aneel || '—'}</TableCell>
                    <TableCell className="py-1 text-xs">
                      {new Date(t.vigencia_inicio).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="py-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-xs px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTarifa(t);
                        }}
                      >
                        Aplicar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
      <p className="text-xs text-muted-foreground">
        💡 Ao selecionar, o Grupo Tarifário e Modalidade da fatura serão atualizados automaticamente.
      </p>
    </div>
  );
}

export function TarifaInfo({ showDetails = false, compact = false }: TarifaInfoProps) {
  const { data, isGrupoA } = useWizard();
  
  const { data: tarifa, isLoading, error } = useTarifas(
    data.concessionaria,
    data.grupo_tarifario,
    isGrupoA ? data.modalidade : null
  );

  const formatTarifa = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '—';
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 5, 
      maximumFractionDigits: 5 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Carregando tarifas...</span>
      </div>
    );
  }

  if (error || !tarifa) {
    return (
      <div className="space-y-2">
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Tarifas não encontradas para <strong>{data.concessionaria}</strong> (Grupo {data.grupo_tarifario}
            {isGrupoA && data.modalidade && `, ${data.modalidade}`}).
            Os valores devem ser informados manualmente.
          </AlertDescription>
        </Alert>
        <TarifasFallback 
          concessionaria={data.concessionaria || ''} 
          grupoTarifario={data.grupo_tarifario || 'B'}
          modalidade={isGrupoA ? data.modalidade : null}
        />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-muted-foreground">Tarifas:</span>
        <Badge variant="outline" className="font-mono">
          {tarifa.resolucao_aneel || 'Vigente'}
        </Badge>
        <span className="text-muted-foreground">|</span>
        <span className="font-medium">
          {isGrupoA ? (
            <>TE P: R$ {formatTarifa(tarifa.te_ponta_rs_kwh)} | FP: R$ {formatTarifa(tarifa.te_fora_ponta_rs_kwh)}</>
          ) : (
            <>TE: R$ {formatTarifa(tarifa.te_unica_rs_kwh)} | TUSD: R$ {formatTarifa(tarifa.tusd_unica_rs_kwh)}</>
          )}
        </span>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Tarifas Aplicáveis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {tarifa.concessionaria}
            </Badge>
            <Badge variant="outline">
              {tarifa.subgrupo || `Grupo ${tarifa.grupo_tarifario}`}
            </Badge>
            {tarifa.modalidade && (
              <Badge>
                {tarifa.modalidade}
              </Badge>
            )}
          </div>
        </div>
        {tarifa.resolucao_aneel && (
          <CardDescription className="text-xs">
            Resolução: {tarifa.resolucao_aneel} • Vigência: {new Date(tarifa.vigencia_inicio).toLocaleDateString('pt-BR')}
          </CardDescription>
        )}
      </CardHeader>
      
      {showDetails && (
        <CardContent className="space-y-4">
          {/* Tarifas de Energia */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Tarifa de Energia (TE) - R$/kWh
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {isGrupoA ? (
                <>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Ponta</span>
                    <p className="font-mono font-semibold">{formatTarifa(tarifa.te_ponta_rs_kwh)}</p>
                  </div>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Fora Ponta</span>
                    <p className="font-mono font-semibold">{formatTarifa(tarifa.te_fora_ponta_rs_kwh)}</p>
                  </div>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Reservado</span>
                    <p className="font-mono font-semibold">{formatTarifa(tarifa.te_reservado_rs_kwh)}</p>
                  </div>
                </>
              ) : (
                <div className="bg-background rounded p-2 col-span-2">
                  <span className="text-muted-foreground">Única</span>
                  <p className="font-mono font-semibold">{formatTarifa(tarifa.te_unica_rs_kwh)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tarifas de Distribuição */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              TUSD - R$/kWh
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {isGrupoA ? (
                <>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Ponta</span>
                    <p className="font-mono font-semibold">{formatTarifa(tarifa.tusd_ponta_rs_kwh)}</p>
                  </div>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Fora Ponta</span>
                    <p className="font-mono font-semibold">{formatTarifa(tarifa.tusd_fora_ponta_rs_kwh)}</p>
                  </div>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Fio A</span>
                    <p className="font-mono font-semibold">{formatTarifa(tarifa.tusd_fio_a_rs_kwh)}</p>
                  </div>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Fio B</span>
                    <p className="font-mono font-semibold">{formatTarifa(tarifa.tusd_fio_b_rs_kwh)}</p>
                  </div>
                </>
              ) : (
                <div className="bg-background rounded p-2 col-span-2">
                  <span className="text-muted-foreground">Única</span>
                  <p className="font-mono font-semibold">{formatTarifa(tarifa.tusd_unica_rs_kwh)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Demanda - apenas Grupo A */}
          {isGrupoA && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Demanda - R$/kW
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-background rounded p-2">
                  <span className="text-muted-foreground">Única</span>
                  <p className="font-mono font-semibold">{formatTarifa(tarifa.demanda_unica_rs_kw)}</p>
                </div>
                <div className="bg-background rounded p-2">
                  <span className="text-muted-foreground">Geração</span>
                  <p className="font-mono font-semibold">{formatTarifa(tarifa.demanda_geracao_rs_kw)}</p>
                </div>
                {tarifa.demanda_ponta_rs_kw > 0 && (
                  <>
                    <div className="bg-background rounded p-2">
                      <span className="text-muted-foreground">Ponta (Azul)</span>
                      <p className="font-mono font-semibold">{formatTarifa(tarifa.demanda_ponta_rs_kw)}</p>
                    </div>
                    <div className="bg-background rounded p-2">
                      <span className="text-muted-foreground">F.Ponta (Azul)</span>
                      <p className="font-mono font-semibold">{formatTarifa(tarifa.demanda_fora_ponta_rs_kw)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bandeiras */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Bandeiras Tarifárias - R$/kWh
            </h4>
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div className="bg-green-500/10 rounded p-2 border border-green-500/20">
                <span className="text-green-600">Verde</span>
                <p className="font-mono font-semibold">{formatTarifa(tarifa.bandeira_verde_rs_kwh)}</p>
              </div>
              <div className="bg-yellow-500/10 rounded p-2 border border-yellow-500/20">
                <span className="text-yellow-600">Amarela</span>
                <p className="font-mono font-semibold">{formatTarifa(tarifa.bandeira_amarela_rs_kwh)}</p>
              </div>
              <div className="bg-red-400/10 rounded p-2 border border-red-400/20">
                <span className="text-red-500">Verm. 1</span>
                <p className="font-mono font-semibold">{formatTarifa(tarifa.bandeira_vermelha1_rs_kwh)}</p>
              </div>
              <div className="bg-red-600/10 rounded p-2 border border-red-600/20">
                <span className="text-red-600">Verm. 2</span>
                <p className="font-mono font-semibold">{formatTarifa(tarifa.bandeira_vermelha2_rs_kwh)}</p>
              </div>
            </div>
          </div>

          {/* Tributos */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Tributos Estaduais (%)
            </h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-background rounded p-2">
                <span className="text-muted-foreground">ICMS</span>
                <p className="font-mono font-semibold">{tarifa.icms_percent?.toFixed(2) || '0.00'}%</p>
              </div>
              <div className="bg-background rounded p-2">
                <span className="text-muted-foreground">PIS</span>
                <p className="font-mono font-semibold">{tarifa.pis_percent?.toFixed(2) || '0.00'}%</p>
              </div>
              <div className="bg-background rounded p-2">
                <span className="text-muted-foreground">COFINS</span>
                <p className="font-mono font-semibold">{tarifa.cofins_percent?.toFixed(2) || '0.00'}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function useTarifaAtual(): TarifaConcessionaria | null {
  const { data, isGrupoA } = useWizard();
  
  const { data: tarifa } = useTarifas(
    data.concessionaria,
    data.grupo_tarifario,
    isGrupoA ? data.modalidade : null
  );

  return tarifa || null;
}
