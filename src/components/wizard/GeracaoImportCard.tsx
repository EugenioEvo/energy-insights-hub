import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FaturaWizardData } from './WizardContext';

interface GeracaoImportCardProps {
  onImport: (data: Partial<FaturaWizardData>) => void;
}

interface UploadedFile {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  data?: any;
  error?: string;
}

interface GeracaoPreviewData {
  mes_ref?: string;
  geracao_total_kwh?: number;
  geracao_ponta_kwh?: number;
  geracao_fora_ponta_kwh?: number;
  geracao_reservado_kwh?: number;
  linhas_processadas?: number;
}

export function GeracaoImportCard({ onImport }: GeracaoImportCardProps) {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<GeracaoPreviewData | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      processFile(droppedFiles[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  }, []);

  const processFile = (file: File) => {
    const extension = file.name.toLowerCase().split('.').pop();
    
    if (extension !== 'csv') {
      toast({
        title: 'Formato inválido',
        description: 'Apenas arquivos CSV são aceitos para importação de geração',
        variant: 'destructive',
      });
      return;
    }
    
    setUploadedFile({ file, status: 'pending' });
    setPreviewData(null);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreviewData(null);
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseCSVLocally = (content: string): GeracaoPreviewData => {
    const lines = content.trim().split(/\r?\n/).filter(line => line.trim());
    
    console.log('CSV Lines:', lines.length, 'First lines:', lines.slice(0, 5));
    
    if (lines.length < 1) {
      throw new Error('CSV vazio');
    }

    // Detectar separador (vírgula, ponto-e-vírgula ou tab)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
    
    const data: GeracaoPreviewData = {};

    // Normalizar texto para comparação (remove acentos e caracteres especiais)
    const normalize = (text: string) => 
      text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    // Keywords para detectar coluna de geração/energia
    const energyKeywords = [
      'geracao', 'geracaototal', 'geracaodia', 'total', 'totalkwh', 'kwh',
      'energy', 'energia', 'energiadia', 'yield', 'production', 'producao',
      'produced', 'etotal', 'eday', 'daily', 'dailyyield', 'dailyenergy', 'valor'
    ];

    // Keywords para detectar coluna de data
    const dateKeywords = [
      'data', 'date', 'dia', 'day', 'datetime', 'timestamp', 'mes', 'month', 'periodo'
    ];

    // Tentar parsear como CSV com header
    const headers = firstLine.split(separator).map(h => h.replace(/['"]/g, '').trim());
    console.log('Headers detectados:', headers);

    // Verificar se primeira linha parece ser header (contém texto não numérico)
    const isFirstLineHeader = headers.some(h => {
      const normalized = normalize(h);
      return energyKeywords.some(k => normalized.includes(k)) || 
             dateKeywords.some(k => normalized.includes(k)) ||
             isNaN(parseFloat(h.replace(',', '.')));
    });

    console.log('Primeira linha é header:', isFirstLineHeader);

    // Encontrar índice da coluna de energia
    let energyColumnIndex = -1;
    let dateColumnIndex = -1;

    if (isFirstLineHeader) {
      headers.forEach((header, index) => {
        const normalized = normalize(header);
        
        // Procurar coluna de energia
        if (energyColumnIndex === -1 && energyKeywords.some(k => normalized.includes(k) || k.includes(normalized))) {
          energyColumnIndex = index;
        }
        
        // Procurar coluna de data
        if (dateColumnIndex === -1 && dateKeywords.some(k => normalized.includes(k) || k.includes(normalized))) {
          dateColumnIndex = index;
        }
      });
    }

    console.log('Índice coluna energia:', energyColumnIndex, 'Índice coluna data:', dateColumnIndex);

    // Se não encontrou coluna de energia pelo header, tentar pela segunda coluna (formato comum: data, valor)
    if (energyColumnIndex === -1 && headers.length >= 2) {
      // Assumir que a última coluna numérica é a geração
      energyColumnIndex = headers.length - 1;
    }

    // Processar linhas de dados
    const dataLines = isFirstLineHeader ? lines.slice(1) : lines;
    let totalGeracao = 0;
    let rowCount = 0;

    for (const line of dataLines) {
      const values = line.split(separator).map(v => v.replace(/['"]/g, '').trim());
      
      if (values.length === 0) continue;

      // Tentar pegar valor da coluna identificada
      let valorLinha = 0;
      
      if (energyColumnIndex >= 0 && energyColumnIndex < values.length) {
        const val = parseFloat(values[energyColumnIndex].replace(',', '.'));
        if (!isNaN(val) && val >= 0) {
          valorLinha = val;
        }
      }

      // Se não encontrou na coluna esperada, procurar primeiro número válido
      if (valorLinha === 0) {
        for (let i = values.length - 1; i >= 0; i--) {
          const val = parseFloat(values[i].replace(',', '.'));
          // Ignorar valores que parecem ser datas (ex: 2024, 01, 15)
          if (!isNaN(val) && val > 0 && val < 100000) {
            valorLinha = val;
            break;
          }
        }
      }

      if (valorLinha > 0) {
        totalGeracao += valorLinha;
        rowCount++;
      }
    }

    console.log('Total geração calculado:', totalGeracao, 'Linhas processadas:', rowCount);

    if (totalGeracao > 0) {
      data.geracao_total_kwh = parseFloat(totalGeracao.toFixed(2));
      data.linhas_processadas = rowCount;
    }

    return data;
  };

  const processUploadedFile = async () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    setUploadedFile(prev => prev ? { ...prev, status: 'processing' } : null);
    
    try {
      setProgress(30);
      const content = await readFileAsText(uploadedFile.file);
      
      setProgress(60);
      
      // Tentar parsear localmente primeiro
      let parsedData: GeracaoPreviewData;
      try {
        parsedData = parseCSVLocally(content);
      } catch (localError) {
        console.error('Erro no parse local:', localError);
        // Se falhar, tentar via edge function
        const { data, error } = await supabase.functions.invoke('parsear-fatura', {
          body: {
            type: 'csv',
            content,
            fileName: uploadedFile.file.name,
          },
        });
        
        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.error || 'Erro ao processar arquivo');
        
        parsedData = data.data;
      }
      
      setProgress(100);
      
      if (!parsedData.geracao_total_kwh || parsedData.geracao_total_kwh === 0) {
        throw new Error('Não foi possível extrair dados de geração do CSV. Verifique se o arquivo contém uma coluna numérica com valores de geração.');
      }
      
      setUploadedFile(prev => prev ? { ...prev, status: 'success', data: parsedData } : null);
      setPreviewData(parsedData);
      
    } catch (err) {
      console.error('Erro ao processar CSV:', err);
      setUploadedFile(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: err instanceof Error ? err.message : 'Erro desconhecido' 
      } : null);
      toast({
        title: 'Erro ao processar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
    
    setIsProcessing(false);
  };

  const handleConfirmImport = () => {
    if (previewData) {
      const mappedData: Partial<FaturaWizardData> = {
        tem_geracao_local: true,
      };
      
      if (previewData.geracao_total_kwh) {
        mappedData.geracao_local_total_kwh = previewData.geracao_total_kwh;
      }
      if (previewData.mes_ref) {
        mappedData.mes_ref = previewData.mes_ref;
      }
      if (previewData.geracao_ponta_kwh) {
        mappedData.injecao_ponta_kwh = previewData.geracao_ponta_kwh;
      }
      if (previewData.geracao_fora_ponta_kwh) {
        mappedData.injecao_fp_kwh = previewData.geracao_fora_ponta_kwh;
      }
      if (previewData.geracao_reservado_kwh) {
        mappedData.injecao_hr_kwh = previewData.geracao_reservado_kwh;
      }
      
      // Calcular injeção total
      if (mappedData.injecao_ponta_kwh || mappedData.injecao_fp_kwh || mappedData.injecao_hr_kwh) {
        mappedData.injecao_total_kwh = 
          (mappedData.injecao_ponta_kwh || 0) + 
          (mappedData.injecao_fp_kwh || 0) + 
          (mappedData.injecao_hr_kwh || 0);
      }
      
      onImport(mappedData);
      setUploadedFile(null);
      setPreviewData(null);
      toast({
        title: 'Geração importada!',
        description: `${previewData.linhas_processadas || 1} registro(s) processado(s)`,
      });
    }
  };

  const formatNumber = (value: number | undefined) => {
    if (value === undefined) return '-';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  return (
    <Card className="border-dashed border-2 border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-green-500" />
          Importar Geração (CSV)
        </CardTitle>
        <CardDescription className="text-xs">
          Arraste o CSV de geração ou clique para selecionar. Soma automática de dados diários.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${dragOver ? 'border-green-500 bg-green-500/5' : 'border-green-200 dark:border-green-900/50 hover:border-green-400'}
          `}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet className="h-10 w-10 text-green-400" />
            <p className="text-sm text-muted-foreground">
              Arraste o CSV de geração aqui
            </p>
            <Badge variant="outline" className="text-xs">
              Formato: Data, Geração (kWh)
            </Badge>
          </div>
        </div>

        {/* Arquivo selecionado */}
        {uploadedFile && (
          <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-500" />
              <span className="text-sm truncate max-w-[200px]">{uploadedFile.file.name}</span>
              <Badge variant="outline" className="text-xs">CSV</Badge>
            </div>
            <div className="flex items-center gap-2">
              {uploadedFile.status === 'processing' && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {uploadedFile.status === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {uploadedFile.status === 'error' && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Erro */}
        {uploadedFile?.status === 'error' && uploadedFile.error && (
          <p className="text-xs text-destructive">{uploadedFile.error}</p>
        )}

        {/* Progresso */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Processando... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Preview dos dados */}
        {previewData && (
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Dados Extraídos
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {previewData.linhas_processadas && (
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Linhas processadas:</span>
                  <span className="font-medium">{previewData.linhas_processadas} dias</span>
                </div>
              )}
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">Geração Total:</span>
                <span className="font-medium text-green-600">{formatNumber(previewData.geracao_total_kwh)} kWh</span>
              </div>
            </div>
            <Button onClick={handleConfirmImport} className="w-full mt-2" size="sm">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Importação
            </Button>
          </div>
        )}

        {/* Botão de processar */}
        {uploadedFile && !isProcessing && uploadedFile.status === 'pending' && (
          <Button onClick={processUploadedFile} className="w-full" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Processar CSV
          </Button>
        )}

        {/* Dica de formato */}
        <Alert className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            CSV com colunas <code className="text-xs bg-muted px-1 rounded">data</code> e <code className="text-xs bg-muted px-1 rounded">geração</code>. Valores diários serão somados automaticamente.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
