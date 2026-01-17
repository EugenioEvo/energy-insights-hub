import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FaturaWizardData } from '@/components/wizard/WizardContext';
import { toast } from 'sonner';

export interface AnaliseIA {
  status: 'ok' | 'atencao' | 'erro';
  analise: string;
  pontos_atencao: string[];
  sugestoes: string[];
  conformidade: {
    ren_1000: boolean;
    lei_14300: boolean;
    observacao?: string;
  };
}

interface UseAuditorIAReturn {
  analise: AnaliseIA | null;
  isAnalisando: boolean;
  erro: string | null;
  analisarPasso: (dados: Partial<FaturaWizardData>, passo: string, contexto?: string) => Promise<void>;
  limparAnalise: () => void;
  historicoAnalises: { passo: string; analise: AnaliseIA; timestamp: Date }[];
}

const DEBOUNCE_MS = 2000; // Aguardar 2 segundos antes de analisar

export function useAuditorIA(): UseAuditorIAReturn {
  const [analise, setAnalise] = useState<AnaliseIA | null>(null);
  const [isAnalisando, setIsAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [historicoAnalises, setHistoricoAnalises] = useState<{ passo: string; analise: AnaliseIA; timestamp: Date }[]>([]);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const ultimoHashRef = useRef<string>('');

  const analisarPasso = useCallback(async (
    dados: Partial<FaturaWizardData>, 
    passo: string, 
    contexto?: string
  ) => {
    // Criar hash simples para evitar análises duplicadas
    const hashDados = JSON.stringify({ dados, passo });
    if (hashDados === ultimoHashRef.current) {
      return; // Dados não mudaram
    }

    // Cancelar análise anterior pendente
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce para não sobrecarregar a API
    debounceRef.current = setTimeout(async () => {
      ultimoHashRef.current = hashDados;
      setIsAnalisando(true);
      setErro(null);

      try {
        const { data, error } = await supabase.functions.invoke('analisar-fatura', {
          body: {
            dadosWizard: dados,
            passoAtual: passo,
            contexto: contexto || `Análise do ${passo}`,
          },
        });

        if (error) {
          throw error;
        }

        if (data.error) {
          throw new Error(data.error);
        }

        const novaAnalise = data as AnaliseIA;
        setAnalise(novaAnalise);
        
        // Adicionar ao histórico
        setHistoricoAnalises(prev => [
          ...prev.filter(h => h.passo !== passo), // Remover análise anterior do mesmo passo
          { passo, analise: novaAnalise, timestamp: new Date() }
        ]);

        // Notificar se houver alertas críticos
        if (novaAnalise.status === 'erro') {
          toast.error('Auditor IA detectou um problema', {
            description: novaAnalise.analise,
          });
        } else if (novaAnalise.status === 'atencao' && novaAnalise.pontos_atencao.length > 0) {
          toast.warning('Auditor IA: Atenção', {
            description: novaAnalise.pontos_atencao[0],
          });
        }

      } catch (err) {
        console.error('Erro na análise IA:', err);
        const mensagemErro = err instanceof Error ? err.message : 'Erro ao analisar';
        setErro(mensagemErro);
        
        // Não mostrar toast para erros de rate limit (já tratado)
        if (!mensagemErro.includes('Limite') && !mensagemErro.includes('Créditos')) {
          toast.error('Erro na análise do Auditor IA');
        }
      } finally {
        setIsAnalisando(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const limparAnalise = useCallback(() => {
    setAnalise(null);
    setErro(null);
    ultimoHashRef.current = '';
  }, []);

  return {
    analise,
    isAnalisando,
    erro,
    analisarPasso,
    limparAnalise,
    historicoAnalises,
  };
}
