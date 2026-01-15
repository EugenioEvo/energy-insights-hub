import React, { useState, useCallback } from 'react';
import { Upload, FileText, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FaturaWizardData } from './WizardContext';
import { ImportPreviewModal } from './ImportPreviewModal';

interface FileImportCardProps {
  onImport: (data: Partial<FaturaWizardData>) => void;
}

interface UploadedFile {
  file: File;
  type: 'pdf' | 'csv';
  status: 'pending' | 'processing' | 'success' | 'error';
  data?: any;
  error?: string;
}

export function FileImportCard({ onImport }: FileImportCardProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<Partial<FaturaWizardData> | null>(null);
  const [showPreview, setShowPreview] = useState(false);
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
    processFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, []);

  const processFiles = (fileList: File[]) => {
    const validFiles: UploadedFile[] = [];
    
    for (const file of fileList) {
      const extension = file.name.toLowerCase().split('.').pop();
      
      if (extension === 'pdf') {
        // Verificar se já tem PDF
        if (files.some(f => f.type === 'pdf') || validFiles.some(f => f.type === 'pdf')) {
          toast({
            title: 'Atenção',
            description: 'Apenas um PDF de fatura pode ser importado por vez',
            variant: 'destructive',
          });
          continue;
        }
        validFiles.push({ file, type: 'pdf', status: 'pending' });
      } else if (extension === 'csv') {
        // Verificar se já tem CSV
        if (files.some(f => f.type === 'csv') || validFiles.some(f => f.type === 'csv')) {
          toast({
            title: 'Atenção',
            description: 'Apenas um CSV de geração pode ser importado por vez',
            variant: 'destructive',
          });
          continue;
        }
        validFiles.push({ file, type: 'csv', status: 'pending' });
      } else {
        toast({
          title: 'Formato inválido',
          description: `${file.name} não é um PDF ou CSV válido`,
          variant: 'destructive',
        });
      }
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remover prefixo data:...;base64,
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const processUploadedFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    const totalFiles = files.length;
    let processedCount = 0;
    let combinedData: Partial<FaturaWizardData> = {};
    
    for (let i = 0; i < files.length; i++) {
      const uploadedFile = files[i];
      
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));
      
      try {
        let content: string;
        
        if (uploadedFile.type === 'pdf') {
          content = await readFileAsBase64(uploadedFile.file);
        } else {
          content = await readFileAsText(uploadedFile.file);
        }
        
        const { data, error } = await supabase.functions.invoke('parsear-fatura', {
          body: {
            type: uploadedFile.type,
            content,
            fileName: uploadedFile.file.name,
          },
        });
        
        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.error || 'Erro ao processar arquivo');
        
        // Merge dos dados extraídos
        if (uploadedFile.type === 'pdf') {
          combinedData = { ...combinedData, ...mapPdfDataToWizard(data.data) };
        } else {
          combinedData = { ...combinedData, ...mapCsvDataToWizard(data.data) };
        }
        
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'success', data: data.data } : f
        ));
        
      } catch (err) {
        console.error('Erro ao processar arquivo:', err);
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Erro desconhecido' } : f
        ));
      }
      
      processedCount++;
      setProgress((processedCount / totalFiles) * 100);
    }
    
    setIsProcessing(false);
    
    // Se extraiu dados, mostrar preview
    if (Object.keys(combinedData).length > 0) {
      setPreviewData(combinedData);
      setShowPreview(true);
    } else {
      toast({
        title: 'Nenhum dado extraído',
        description: 'Não foi possível extrair dados dos arquivos',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmImport = () => {
    if (previewData) {
      onImport(previewData);
      setShowPreview(false);
      setFiles([]);
      setPreviewData(null);
      toast({
        title: 'Dados importados!',
        description: 'Os campos foram preenchidos automaticamente',
      });
    }
  };

  const pdfFile = files.find(f => f.type === 'pdf');
  const csvFile = files.find(f => f.type === 'csv');

  return (
    <>
      <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importação Automática
          </CardTitle>
          <CardDescription className="text-xs">
            Arraste arquivos ou clique para selecionar. A IA extrairá os dados automaticamente.
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
              ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
            `}
          >
            <input
              type="file"
              accept=".pdf,.csv"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">PDF Fatura</span>
                </div>
                <div className="flex flex-col items-center">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">CSV Geração</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Arraste arquivos aqui ou clique para selecionar
              </p>
            </div>
          </div>

          {/* Lista de arquivos */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-background rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    {file.type === 'pdf' ? (
                      <FileText className="h-4 w-4 text-red-500" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm truncate max-w-[180px]">{file.file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {file.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === 'processing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {file.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {!isProcessing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Progresso */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                Processando com IA... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Botão de processar */}
          {files.length > 0 && !isProcessing && (
            <Button
              onClick={processUploadedFiles}
              className="w-full"
              disabled={files.every(f => f.status === 'success' || f.status === 'error')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Processar Documentos
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Modal de Preview */}
      <ImportPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        data={previewData}
        onConfirm={handleConfirmImport}
      />
    </>
  );
}

// Mapear dados do PDF para formato do wizard
function mapPdfDataToWizard(data: any): Partial<FaturaWizardData> {
  if (!data) return {};
  
  const mapped: Partial<FaturaWizardData> = {};
  
  // Identificação
  if (data.uc_numero) mapped.uc_numero = String(data.uc_numero);
  if (data.mes_ref) mapped.mes_ref = data.mes_ref;
  if (data.grupo_tarifario === 'A' || data.grupo_tarifario === 'B') {
    mapped.grupo_tarifario = data.grupo_tarifario;
  }
  if (data.modalidade) mapped.modalidade = data.modalidade;
  if (data.classe_tarifaria) mapped.classe_tarifaria = data.classe_tarifaria;
  if (data.concessionaria) mapped.concessionaria = data.concessionaria;
  
  // Cabeçalho
  if (data.data_emissao) mapped.data_emissao = data.data_emissao;
  if (data.data_apresentacao) mapped.data_apresentacao = data.data_apresentacao;
  if (data.vencimento) mapped.vencimento = data.vencimento;
  if (data.leitura_anterior) mapped.leitura_anterior = data.leitura_anterior;
  if (data.leitura_atual) mapped.leitura_atual = data.leitura_atual;
  if (data.dias_faturados != null) mapped.dias_faturados = Number(data.dias_faturados);
  if (data.proxima_leitura) mapped.proxima_leitura = data.proxima_leitura;
  if (data.valor_total_pagar != null) mapped.valor_total_pagar = Number(data.valor_total_pagar);
  
  // Consumo
  if (data.consumo_ponta_kwh != null) mapped.consumo_ponta_kwh = Number(data.consumo_ponta_kwh);
  if (data.consumo_fora_ponta_kwh != null) mapped.consumo_fora_ponta_kwh = Number(data.consumo_fora_ponta_kwh);
  if (data.consumo_reservado_kwh != null) mapped.consumo_reservado_kwh = Number(data.consumo_reservado_kwh);
  if (data.consumo_total_kwh != null) mapped.consumo_total_kwh = Number(data.consumo_total_kwh);
  
  // Demanda
  if (data.demanda_contratada_kw != null) mapped.demanda_contratada_kw = Number(data.demanda_contratada_kw);
  if (data.demanda_medida_kw != null) mapped.demanda_medida_kw = Number(data.demanda_medida_kw);
  if (data.demanda_ultrapassagem_kw != null) mapped.demanda_ultrapassagem_kw = Number(data.demanda_ultrapassagem_kw);
  if (data.valor_demanda_rs != null) mapped.valor_demanda_rs = Number(data.valor_demanda_rs);
  if (data.valor_demanda_ultrapassagem_rs != null) mapped.valor_demanda_ultrapassagem_rs = Number(data.valor_demanda_ultrapassagem_rs);
  
  // Geração Local
  if (data.geracao_local_total_kwh != null) mapped.geracao_local_total_kwh = Number(data.geracao_local_total_kwh);
  if (data.autoconsumo_ponta_kwh != null) mapped.autoconsumo_ponta_kwh = Number(data.autoconsumo_ponta_kwh);
  if (data.autoconsumo_fp_kwh != null) mapped.autoconsumo_fp_kwh = Number(data.autoconsumo_fp_kwh);
  if (data.autoconsumo_hr_kwh != null) mapped.autoconsumo_hr_kwh = Number(data.autoconsumo_hr_kwh);
  if (data.autoconsumo_total_kwh != null) mapped.autoconsumo_total_kwh = Number(data.autoconsumo_total_kwh);
  if (data.injecao_ponta_kwh != null) mapped.injecao_ponta_kwh = Number(data.injecao_ponta_kwh);
  if (data.injecao_fp_kwh != null) mapped.injecao_fp_kwh = Number(data.injecao_fp_kwh);
  if (data.injecao_hr_kwh != null) mapped.injecao_hr_kwh = Number(data.injecao_hr_kwh);
  if (data.injecao_total_kwh != null) mapped.injecao_total_kwh = Number(data.injecao_total_kwh);
  
  // SCEE/Saldos
  if (data.scee_credito_recebido_kwh != null) mapped.scee_credito_recebido_kwh = Number(data.scee_credito_recebido_kwh);
  if (data.scee_saldo_kwh_p != null) mapped.scee_saldo_kwh_p = Number(data.scee_saldo_kwh_p);
  if (data.scee_saldo_kwh_fp != null) mapped.scee_saldo_kwh_fp = Number(data.scee_saldo_kwh_fp);
  if (data.scee_saldo_kwh_hr != null) mapped.scee_saldo_kwh_hr = Number(data.scee_saldo_kwh_hr);
  if (data.scee_saldo_expirar_30d_kwh != null) mapped.scee_saldo_expirar_30d_kwh = Number(data.scee_saldo_expirar_30d_kwh);
  if (data.scee_saldo_expirar_60d_kwh != null) mapped.scee_saldo_expirar_60d_kwh = Number(data.scee_saldo_expirar_60d_kwh);
  
  // Itens Fatura
  if (data.bandeira_te_p_rs != null) mapped.bandeira_te_p_rs = Number(data.bandeira_te_p_rs);
  if (data.bandeira_te_fp_rs != null) mapped.bandeira_te_fp_rs = Number(data.bandeira_te_fp_rs);
  if (data.bandeira_te_hr_rs != null) mapped.bandeira_te_hr_rs = Number(data.bandeira_te_hr_rs);
  if (data.nao_compensado_tusd_p_rs != null) mapped.nao_compensado_tusd_p_rs = Number(data.nao_compensado_tusd_p_rs);
  if (data.nao_compensado_tusd_fp_rs != null) mapped.nao_compensado_tusd_fp_rs = Number(data.nao_compensado_tusd_fp_rs);
  if (data.nao_compensado_tusd_hr_rs != null) mapped.nao_compensado_tusd_hr_rs = Number(data.nao_compensado_tusd_hr_rs);
  if (data.nao_compensado_te_p_rs != null) mapped.nao_compensado_te_p_rs = Number(data.nao_compensado_te_p_rs);
  if (data.nao_compensado_te_fp_rs != null) mapped.nao_compensado_te_fp_rs = Number(data.nao_compensado_te_fp_rs);
  if (data.nao_compensado_te_hr_rs != null) mapped.nao_compensado_te_hr_rs = Number(data.nao_compensado_te_hr_rs);
  if (data.ufer_fp_kvarh != null) mapped.ufer_fp_kvarh = Number(data.ufer_fp_kvarh);
  if (data.ufer_fp_rs != null) mapped.ufer_fp_rs = Number(data.ufer_fp_rs);
  if (data.cip_rs != null) mapped.cip_rs = Number(data.cip_rs);
  
  // Tributos
  if (data.base_pis_cofins_rs != null) mapped.base_pis_cofins_rs = Number(data.base_pis_cofins_rs);
  if (data.pis_aliquota_percent != null) mapped.pis_aliquota_percent = Number(data.pis_aliquota_percent);
  if (data.pis_rs != null) mapped.pis_rs = Number(data.pis_rs);
  if (data.cofins_aliquota_percent != null) mapped.cofins_aliquota_percent = Number(data.cofins_aliquota_percent);
  if (data.cofins_rs != null) mapped.cofins_rs = Number(data.cofins_rs);
  if (data.base_icms_rs != null) mapped.base_icms_rs = Number(data.base_icms_rs);
  if (data.icms_aliquota_percent != null) mapped.icms_aliquota_percent = Number(data.icms_aliquota_percent);
  if (data.icms_rs != null) mapped.icms_rs = Number(data.icms_rs);
  
  // Detectar geração
  if (mapped.geracao_local_total_kwh && mapped.geracao_local_total_kwh > 0) {
    mapped.tem_geracao_local = true;
  }
  if (mapped.scee_credito_recebido_kwh && mapped.scee_credito_recebido_kwh > 0) {
    mapped.tem_usina_remota = true;
  }
  
  return mapped;
}

// Mapear dados do CSV para formato do wizard
function mapCsvDataToWizard(data: any): Partial<FaturaWizardData> {
  if (!data) return {};
  
  const mapped: Partial<FaturaWizardData> = {};
  
  if (data.geracao_total_kwh != null) {
    mapped.geracao_local_total_kwh = Number(data.geracao_total_kwh);
    mapped.tem_geracao_local = true;
  }
  if (data.mes_ref) mapped.mes_ref = data.mes_ref;
  
  // Distribuição por posto (se disponível)
  if (data.geracao_ponta_kwh != null) {
    // Assumir que geração = injeção para simplificar
    mapped.injecao_ponta_kwh = Number(data.geracao_ponta_kwh);
  }
  if (data.geracao_fora_ponta_kwh != null) {
    mapped.injecao_fp_kwh = Number(data.geracao_fora_ponta_kwh);
  }
  
  return mapped;
}
