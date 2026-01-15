import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle, AlertCircle, Clock, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { TarifasTable } from '@/components/tarifas/TarifasTable';

export default function Tarifas() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

  // Buscar tarifas do banco
  const { data: tarifas, isLoading } = useQuery({
    queryKey: ['tarifas-concessionaria'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarifas_concessionaria')
        .select('*')
        .eq('ativo', true)
        .order('subgrupo', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation para buscar tarifas via Perplexity
  const buscarTarifasMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buscar-tarifas-equatorial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar tarifas');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Tarifas atualizadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['tarifas-concessionaria'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao buscar tarifas');
    },
  });

  const tarifasGrupoA = tarifas?.filter((t) => t.grupo_tarifario === 'A') || [];
  const tarifasGrupoB = tarifas?.filter((t) => t.grupo_tarifario === 'B') || [];

  const ultimaAtualizacao = tarifas?.[0]?.updated_at 
    ? new Date(tarifas[0].updated_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const resolucaoAtual = tarifas?.[0]?.resolucao_aneel;
  const vigenciaAtual = tarifas?.[0]?.vigencia_inicio
    ? new Date(tarifas[0].vigencia_inicio).toLocaleDateString('pt-BR')
    : null;

  return (
    <DashboardLayout title="Gerenciamento de Tarifas" subtitle="Atualize as tarifas da concessionária automaticamente via IA">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-end">
          <Button
            onClick={() => buscarTarifasMutation.mutate()}
            disabled={buscarTarifasMutation.isPending}
            className="gap-2"
          >
            {buscarTarifasMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Buscar Tarifas da Equatorial GO
              </>
            )}
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Concessionária</p>
                  <p className="font-semibold">Equatorial Goiás</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resolução ANEEL</p>
                  <p className="font-semibold">{resolucaoAtual || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vigência</p>
                  <p className="font-semibold">{vigenciaAtual || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Atualização</p>
                  <p className="font-semibold text-sm">{ultimaAtualizacao || 'Nunca'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info sobre busca via IA */}
        {buscarTarifasMutation.isPending && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="font-medium text-foreground">Buscando tarifas via IA...</p>
                  <p className="text-sm text-muted-foreground">
                    A Perplexity está consultando o site oficial da Equatorial Goiás para extrair as tarifas mais recentes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado da busca */}
        {buscarTarifasMutation.isSuccess && buscarTarifasMutation.data && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Tarifas atualizadas com sucesso!</p>
                  <p className="text-sm text-muted-foreground">
                    {buscarTarifasMutation.data.tarifas_count} tarifas encontradas • 
                    Resolução: {buscarTarifasMutation.data.resolucao} • 
                    Vigência: {buscarTarifasMutation.data.vigencia}
                  </p>
                  {buscarTarifasMutation.data.citations?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {buscarTarifasMutation.data.citations.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Fonte {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Tarifas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tarifas Vigentes</CardTitle>
                <CardDescription>
                  {tarifas?.length || 0} tarifas cadastradas
                </CardDescription>
              </div>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'A' | 'B')}>
                <TabsList>
                  <TabsTrigger value="A" className="gap-2">
                    <Badge variant="outline" className="font-mono">A</Badge>
                    Alta Tensão ({tarifasGrupoA.length})
                  </TabsTrigger>
                  <TabsTrigger value="B" className="gap-2">
                    <Badge variant="outline" className="font-mono">B</Badge>
                    Baixa Tensão ({tarifasGrupoB.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeTab === 'A' ? (
              <TarifasTable tarifas={tarifasGrupoA} grupoTarifario="A" />
            ) : (
              <TarifasTable tarifas={tarifasGrupoB} grupoTarifario="B" />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
