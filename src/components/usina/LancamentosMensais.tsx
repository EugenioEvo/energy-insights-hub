import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  useUsinaGeracaoMensal, 
  useDeleteGeracaoMensal 
} from '@/hooks/useUsinaGeracaoMensal';
import { useRateiosByGeracao } from '@/hooks/useUsinaRateioMensal';
import { useVinculosByUsina } from '@/hooks/useClienteUsinaVinculo';
import { UsinaRemota } from '@/hooks/useUsinasRemotas';
import { NovoLancamentoModal } from './NovoLancamentoModal';
import { 
  Plus, 
  Loader2, 
  Calendar, 
  Zap, 
  Users, 
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface LancamentosMensaisProps {
  usina: UsinaRemota;
}

function RateioDetails({ geracaoId }: { geracaoId: string }) {
  const { data: rateios = [], isLoading } = useRateiosByGeracao(geracaoId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando rateios...</div>;
  }

  if (rateios.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum rateio configurado</div>;
  }

  return (
    <div className="space-y-2">
      {rateios.map((rateio) => (
        <div 
          key={rateio.id} 
          className="flex items-center justify-between p-3 bg-background rounded-lg border"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">UC {rateio.unidade?.numero}</span>
              <Badge variant="outline" className="text-xs">
                {rateio.percentual_aplicado}%
              </Badge>
              <Badge 
                variant={rateio.status === 'utilizado' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {rateio.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {rateio.unidade?.endereco}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">{rateio.energia_alocada_kwh.toLocaleString('pt-BR')} kWh</p>
            <p className="text-xs text-muted-foreground">
              R$ {rateio.valor_fatura_usina_rs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LancamentosMensais({ usina }: LancamentosMensaisProps) {
  const { toast } = useToast();
  const { data: geracoes = [], isLoading } = useUsinaGeracaoMensal(usina.id);
  const { data: vinculos = [] } = useVinculosByUsina(usina.id);
  const deleteGeracao = useDeleteGeracaoMensal();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGeracaoId, setSelectedGeracaoId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    if (!selectedGeracaoId) return;
    try {
      await deleteGeracao.mutateAsync(selectedGeracaoId);
      toast({ title: 'Sucesso', description: 'Lançamento excluído' });
      setDeleteDialogOpen(false);
      setSelectedGeracaoId(null);
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Falha ao excluir lançamento', 
        variant: 'destructive' 
      });
    }
  };

  const formatMesRef = (mesRef: string) => {
    const [ano, mes] = mesRef.split('-');
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lançamentos Mensais
            </CardTitle>
            <CardDescription>
              Geração mensal e rateio entre beneficiários
            </CardDescription>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {vinculos.length === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ⚠️ Esta usina não possui beneficiários vinculados. Cadastre vínculos antes de lançar geração.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : geracoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum lançamento registrado</p>
            <p className="text-sm">Clique em "Novo Lançamento" para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {geracoes.map((geracao) => (
              <Collapsible 
                key={geracao.id}
                open={expandedIds.has(geracao.id)}
                onOpenChange={() => toggleExpanded(geracao.id)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{formatMesRef(geracao.mes_ref)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {geracao.geracao_total_kwh.toLocaleString('pt-BR')} kWh gerados
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{vinculos.length} beneficiários</span>
                          </div>
                          {geracao.fator_capacidade_percent && (
                            <p className="text-xs text-muted-foreground">
                              FC: {geracao.fator_capacidade_percent.toFixed(1)}%
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGeracaoId(geracao.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        {expandedIds.has(geracao.id) ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 pt-0 border-t bg-muted/30">
                      <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Rateio Entre Beneficiários
                      </h5>
                      <RateioDetails geracaoId={geracao.id} />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>

      <NovoLancamentoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        usina={usina}
        vinculos={vinculos}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá o lançamento e todo o rateio associado. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
