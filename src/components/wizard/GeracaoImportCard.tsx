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
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV deve ter pelo menos cabeçalho e uma linha de dados');
    }

    const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase());
    const values = lines[1].split(/[,;]/).map(v => v.trim());

    const data: GeracaoPreviewData = {};

    // Mapear colunas conhecidas
    const columnMappings: Record<string, keyof GeracaoPreviewData> = {
      'mes_ref': 'mes_ref',
      'mes': 'mes_ref',
      'referencia': 'mes_ref',
      'geracao_total_kwh': 'geracao_total_kwh',
      'geracao_total': 'geracao_total_kwh',
      'total_kwh': 'geracao_total_kwh',
      'total': 'geracao_total_kwh',
      'geracao_kwh': 'geracao_total_kwh',
      'geracao_ponta_kwh': 'geracao_ponta_kwh',
      'ponta_kwh': 'geracao_ponta_kwh',
      'ponta': 'geracao_ponta_kwh',
      'geracao_fora_ponta_kwh': 'geracao_fora_ponta_kwh',
      'fora_ponta_kwh': 'geracao_fora_ponta_kwh',
      'fora_ponta': 'geracao_fora_ponta_kwh',
      'fp_kwh': 'geracao_fora_ponta_kwh',
      'geracao_reservado_kwh': 'geracao_reservado_kwh',
      'reservado_kwh': 'geracao_reservado_kwh',
      'reservado': 'geracao_reservado_kwh',
      'hr_kwh': 'geracao_reservado_kwh',
    };

    headers.forEach((header, index) => {
      const cleanHeader = header.replace(/['"]/g, '').trim();
      const mappedKey = columnMappings[cleanHeader];
      
      if (mappedKey && values[index]) {
        const value = values[index].replace(/['"]/g, '').trim();
        if (mappedKey === 'mes_ref') {
          data[mappedKey] = value;
        } else {
          const numValue = parseFloat(value.replace(',', '.'));
          if (!isNaN(numValue)) {
            data[mappedKey] = numValue;
          }
        }
      }
    });

    // Se não encontrou total mas tem ponta + fora ponta, calcular
    if (!data.geracao_total_kwh && (data.geracao_ponta_kwh || data.geracao_fora_ponta_kwh)) {
      data.geracao_total_kwh = 
        (data.geracao_ponta_kwh || 0) + 
        (data.geracao_fora_ponta_kwh || 0) + 
        (data.geracao_reservado_kwh || 0);
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
        throw new Error('Não foi possível extrair dados de geração do CSV');
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
        description: 'Os dados de geração foram preenchidos',
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
          Arraste o CSV de geração ou clique para selecionar. Aceita exportações de inversores.
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
              Fronius, Growatt, Solis...
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
              {previewData.mes_ref && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mês:</span>
                  <span className="font-medium">{previewData.mes_ref}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Geração Total:</span>
                <span className="font-medium">{formatNumber(previewData.geracao_total_kwh)} kWh</span>
              </div>
              {previewData.geracao_ponta_kwh !== undefined && previewData.geracao_ponta_kwh > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ponta:</span>
                  <span>{formatNumber(previewData.geracao_ponta_kwh)} kWh</span>
                </div>
              )}
              {previewData.geracao_fora_ponta_kwh !== undefined && previewData.geracao_fora_ponta_kwh > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fora Ponta:</span>
                  <span>{formatNumber(previewData.geracao_fora_ponta_kwh)} kWh</span>
                </div>
              )}
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
            O CSV deve ter colunas como: <code className="text-xs bg-muted px-1 rounded">geracao_total_kwh</code>, <code className="text-xs bg-muted px-1 rounded">ponta_kwh</code>, <code className="text-xs bg-muted px-1 rounded">fora_ponta_kwh</code>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
