/**
 * Painel do Auditor IA
 * Exibe análise em tempo real do engenheiro especialista
 */

import { useState } from 'react';
import { 
  Bot, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, 
  Shield, Lightbulb, Loader2, Eye, EyeOff, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AnaliseIA } from '@/hooks/useAuditorIA';

interface AuditorIAPanelProps {
  analise: AnaliseIA | null;
  isAnalisando: boolean;
  erro: string | null;
  historicoAnalises: { passo: string; analise: AnaliseIA; timestamp: Date }[];
}

export function AuditorIAPanel({ 
  analise, 
  isAnalisando, 
  erro,
  historicoAnalises 
}: AuditorIAPanelProps) {
  const [expandido, setExpandido] = useState(true);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  const getStatusIcon = (status: AnaliseIA['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'atencao':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: AnaliseIA['status']) => {
    switch (status) {
      case 'ok':
        return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800';
      case 'atencao':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800';
      case 'erro':
        return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Collapsible open={expandido} onOpenChange={setExpandido}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="relative">
                <Bot className="h-5 w-5 text-primary" />
                {isAnalisando && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <span>Auditor IA</span>
              <Badge variant="outline" className="text-xs font-normal">
                Engenheiro Especialista
              </Badge>
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <p className="text-xs text-muted-foreground">
            REN 1000 • Lei 14.300 • Auditoria Tarifária
          </p>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Estado de carregamento */}
            {isAnalisando && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analisando dados...</span>
              </div>
            )}

            {/* Erro */}
            {erro && !isAnalisando && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                {erro}
              </div>
            )}

            {/* Análise atual */}
            {analise && !isAnalisando && (
              <div className="space-y-3">
                {/* Status e Análise */}
                <div className={cn("rounded-lg p-3 border", getStatusColor(analise.status))}>
                  <div className="flex items-start gap-2">
                    {getStatusIcon(analise.status)}
                    <p className="text-sm flex-1">{analise.analise}</p>
                  </div>
                </div>

                {/* Pontos de Atenção */}
                {analise.pontos_atencao.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      Pontos de Atenção
                    </div>
                    <ul className="text-xs space-y-1 pl-4">
                      {analise.pontos_atencao.map((ponto, i) => (
                        <li key={i} className="text-muted-foreground list-disc">{ponto}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sugestões */}
                {analise.sugestoes.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                      <Lightbulb className="h-3 w-3" />
                      Sugestões
                    </div>
                    <ul className="text-xs space-y-1 pl-4">
                      {analise.sugestoes.map((sugestao, i) => (
                        <li key={i} className="text-muted-foreground list-disc">{sugestao}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Conformidade */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1">
                    <Shield className={cn("h-3 w-3", analise.conformidade.ren_1000 ? "text-green-600" : "text-red-600")} />
                    <span className="text-xs">REN 1000</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className={cn("h-3 w-3", analise.conformidade.lei_14300 ? "text-green-600" : "text-red-600")} />
                    <span className="text-xs">Lei 14.300</span>
                  </div>
                </div>
                {analise.conformidade.observacao && (
                  <p className="text-xs text-muted-foreground italic">
                    {analise.conformidade.observacao}
                  </p>
                )}
              </div>
            )}

            {/* Sem análise ainda */}
            {!analise && !isAnalisando && !erro && (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Preencha os dados para receber análise automática
                </p>
              </div>
            )}

            {/* Histórico */}
            {historicoAnalises.length > 1 && (
              <>
                <Separator />
                <Collapsible open={mostrarHistorico} onOpenChange={setMostrarHistorico}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs">
                      <span className="flex items-center gap-1">
                        {mostrarHistorico ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        Histórico ({historicoAnalises.length} análises)
                      </span>
                      {mostrarHistorico ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-32 mt-2">
                      <div className="space-y-2">
                        {historicoAnalises.slice().reverse().map((item, i) => (
                          <div key={i} className="text-xs bg-muted/50 rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{item.passo}</span>
                              {getStatusIcon(item.analise.status)}
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{item.analise.analise}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
