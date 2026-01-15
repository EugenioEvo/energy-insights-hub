import React, { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FaturaWizardData } from './WizardContext';
import { ImportPreviewModal } from './ImportPreviewModal';

interface FaturaImportCardProps {
  onImport: (data: Partial<FaturaWizardData>) => void;
}

interface UploadedFile {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  data?: any;
  error?: string;
}

export function FaturaImportCard({ onImport }: FaturaImportCardProps) {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
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
    
    if (extension !== 'pdf') {
      toast({
        title: 'Formato inválido',
        description: 'Apenas arquivos PDF são aceitos para importação de fatura',
        variant: 'destructive',
      });
      return;
    }
    
    setUploadedFile({ file, status: 'pending' });
  };

  const removeFile = () => {
    setUploadedFile(null);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processUploadedFile = async () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    setUploadedFile(prev => prev ? { ...prev, status: 'processing' } : null);
    
    try {
      setProgress(30);
      const content = await readFileAsBase64(uploadedFile.file);
      
      setProgress(50);
      const { data, error } = await supabase.functions.invoke('parsear-fatura', {
        body: {
          type: 'pdf',
          content,
          fileName: uploadedFile.file.name,
        },
      });
      
      setProgress(80);
      
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Erro ao processar arquivo');
      
      const mappedData = mapPdfDataToWizard(data.data);
      
      setUploadedFile(prev => prev ? { ...prev, status: 'success', data: data.data } : null);
      setPreviewData(mappedData);
      setShowPreview(true);
      setProgress(100);
      
    } catch (err) {
      console.error('Erro ao processar fatura:', err);
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
      onImport(previewData);
      setShowPreview(false);
      setUploadedFile(null);
      setPreviewData(null);
      toast({
        title: 'Fatura importada!',
        description: 'Os campos foram preenchidos automaticamente',
      });
    }
  };

  return (
    <>
      <Card className="border-dashed border-2 border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-500" />
            Importar Fatura (PDF)
          </CardTitle>
          <CardDescription className="text-xs">
            Arraste o PDF da fatura ou clique para selecionar. A IA extrairá os dados automaticamente.
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
              ${dragOver ? 'border-red-500 bg-red-500/5' : 'border-red-200 dark:border-red-900/50 hover:border-red-400'}
            `}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-10 w-10 text-red-400" />
              <p className="text-sm text-muted-foreground">
                Arraste o PDF da fatura aqui
              </p>
              <Badge variant="outline" className="text-xs">
                Equatorial, CELG, Enel...
              </Badge>
            </div>
          </div>

          {/* Arquivo selecionado */}
          {uploadedFile && (
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                <span className="text-sm truncate max-w-[200px]">{uploadedFile.file.name}</span>
                <Badge variant="outline" className="text-xs">PDF</Badge>
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
                Processando com IA... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Botão de processar */}
          {uploadedFile && !isProcessing && uploadedFile.status === 'pending' && (
            <Button onClick={processUploadedFile} className="w-full" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Processar Fatura
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

// Achatar estrutura aninhada da IA para estrutura plana
function flattenAiResponse(data: any): Record<string, any> {
  if (!data || typeof data !== 'object') return {};
  
  const flat: Record<string, any> = {};
  
  const knownCategories = [
    'IDENTIFICAÇÃO', 'IDENTIFICACAO',
    'CABEÇALHO', 'CABECALHO',
    'CONSUMO',
    'DEMANDA',
    'GERAÇÃO_DISTRIBUÍDA_SCEE', 'GERACAO_DISTRIBUIDA_SCEE', 'SCEE', 'GERACAO_LOCAL',
    'COMPONENTES_DA_FATURA', 'ITENS_FATURA',
    'TRIBUTOS'
  ];
  
  const hasCategories = Object.keys(data).some(key => 
    knownCategories.includes(key.toUpperCase().replace(/[ÇÃ]/g, match => match === 'Ç' ? 'C' : 'A'))
  );
  
  if (hasCategories) {
    for (const [category, fields] of Object.entries(data)) {
      if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
        for (const [field, value] of Object.entries(fields as Record<string, any>)) {
          if (value !== null && value !== undefined) {
            flat[field] = value;
          }
        }
      }
    }
  } else {
    Object.assign(flat, data);
  }
  
  return flat;
}

// Mapear dados do PDF para formato do wizard
function mapPdfDataToWizard(data: any): Partial<FaturaWizardData> {
  if (!data) return {};
  
  const flatData = flattenAiResponse(data);
  const mapped: Partial<FaturaWizardData> = {};
  
  // Identificação
  if (flatData.uc_numero) mapped.uc_numero = String(flatData.uc_numero);
  if (flatData.mes_ref) mapped.mes_ref = flatData.mes_ref;
  if (flatData.grupo_tarifario === 'A' || flatData.grupo_tarifario === 'B') {
    mapped.grupo_tarifario = flatData.grupo_tarifario;
  }
  if (flatData.modalidade) mapped.modalidade = flatData.modalidade;
  if (flatData.classe_tarifaria) mapped.classe_tarifaria = flatData.classe_tarifaria;
  if (flatData.concessionaria) mapped.concessionaria = flatData.concessionaria;
  
  // Cabeçalho
  if (flatData.data_emissao) mapped.data_emissao = flatData.data_emissao;
  if (flatData.data_apresentacao) mapped.data_apresentacao = flatData.data_apresentacao;
  if (flatData.vencimento) mapped.vencimento = flatData.vencimento;
  if (flatData.leitura_anterior) mapped.leitura_anterior = flatData.leitura_anterior;
  if (flatData.leitura_atual) mapped.leitura_atual = flatData.leitura_atual;
  if (flatData.dias_faturados != null) mapped.dias_faturados = Number(flatData.dias_faturados);
  if (flatData.proxima_leitura) mapped.proxima_leitura = flatData.proxima_leitura;
  if (flatData.valor_total_pagar != null) mapped.valor_total_pagar = Number(flatData.valor_total_pagar);
  
  // Consumo
  if (flatData.consumo_ponta_kwh != null) mapped.consumo_ponta_kwh = Number(flatData.consumo_ponta_kwh);
  if (flatData.consumo_fora_ponta_kwh != null) mapped.consumo_fora_ponta_kwh = Number(flatData.consumo_fora_ponta_kwh);
  if (flatData.consumo_reservado_kwh != null) mapped.consumo_reservado_kwh = Number(flatData.consumo_reservado_kwh);
  if (flatData.consumo_total_kwh != null) mapped.consumo_total_kwh = Number(flatData.consumo_total_kwh);
  
  // Demanda
  if (flatData.demanda_contratada_kw != null) mapped.demanda_contratada_kw = Number(flatData.demanda_contratada_kw);
  if (flatData.demanda_medida_kw != null) mapped.demanda_medida_kw = Number(flatData.demanda_medida_kw);
  if (flatData.demanda_ultrapassagem_kw != null) mapped.demanda_ultrapassagem_kw = Number(flatData.demanda_ultrapassagem_kw);
  if (flatData.valor_demanda_rs != null) mapped.valor_demanda_rs = Number(flatData.valor_demanda_rs);
  if (flatData.valor_demanda_ultrapassagem_rs != null) mapped.valor_demanda_ultrapassagem_rs = Number(flatData.valor_demanda_ultrapassagem_rs);
  
  // Geração Local
  if (flatData.geracao_local_total_kwh != null) mapped.geracao_local_total_kwh = Number(flatData.geracao_local_total_kwh);
  if (flatData.autoconsumo_ponta_kwh != null) mapped.autoconsumo_ponta_kwh = Number(flatData.autoconsumo_ponta_kwh);
  if (flatData.autoconsumo_fp_kwh != null) mapped.autoconsumo_fp_kwh = Number(flatData.autoconsumo_fp_kwh);
  if (flatData.autoconsumo_hr_kwh != null) mapped.autoconsumo_hr_kwh = Number(flatData.autoconsumo_hr_kwh);
  if (flatData.autoconsumo_total_kwh != null) mapped.autoconsumo_total_kwh = Number(flatData.autoconsumo_total_kwh);
  if (flatData.injecao_ponta_kwh != null) mapped.injecao_ponta_kwh = Number(flatData.injecao_ponta_kwh);
  if (flatData.injecao_fp_kwh != null) mapped.injecao_fp_kwh = Number(flatData.injecao_fp_kwh);
  if (flatData.injecao_hr_kwh != null) mapped.injecao_hr_kwh = Number(flatData.injecao_hr_kwh);
  if (flatData.injecao_total_kwh != null) mapped.injecao_total_kwh = Number(flatData.injecao_total_kwh);
  
  // SCEE/Saldos
  if (flatData.scee_credito_recebido_kwh != null) mapped.scee_credito_recebido_kwh = Number(flatData.scee_credito_recebido_kwh);
  if (flatData.scee_saldo_kwh_p != null) mapped.scee_saldo_kwh_p = Number(flatData.scee_saldo_kwh_p);
  if (flatData.scee_saldo_kwh_fp != null) mapped.scee_saldo_kwh_fp = Number(flatData.scee_saldo_kwh_fp);
  if (flatData.scee_saldo_kwh_hr != null) mapped.scee_saldo_kwh_hr = Number(flatData.scee_saldo_kwh_hr);
  if (flatData.scee_saldo_expirar_30d_kwh != null) mapped.scee_saldo_expirar_30d_kwh = Number(flatData.scee_saldo_expirar_30d_kwh);
  if (flatData.scee_saldo_expirar_60d_kwh != null) mapped.scee_saldo_expirar_60d_kwh = Number(flatData.scee_saldo_expirar_60d_kwh);
  
  // Itens Fatura
  if (flatData.bandeira_te_p_rs != null) mapped.bandeira_te_p_rs = Number(flatData.bandeira_te_p_rs);
  if (flatData.bandeira_te_fp_rs != null) mapped.bandeira_te_fp_rs = Number(flatData.bandeira_te_fp_rs);
  if (flatData.bandeira_te_hr_rs != null) mapped.bandeira_te_hr_rs = Number(flatData.bandeira_te_hr_rs);
  if (flatData.nao_compensado_tusd_p_rs != null) mapped.nao_compensado_tusd_p_rs = Number(flatData.nao_compensado_tusd_p_rs);
  if (flatData.nao_compensado_tusd_fp_rs != null) mapped.nao_compensado_tusd_fp_rs = Number(flatData.nao_compensado_tusd_fp_rs);
  if (flatData.nao_compensado_tusd_hr_rs != null) mapped.nao_compensado_tusd_hr_rs = Number(flatData.nao_compensado_tusd_hr_rs);
  if (flatData.nao_compensado_te_p_rs != null) mapped.nao_compensado_te_p_rs = Number(flatData.nao_compensado_te_p_rs);
  if (flatData.nao_compensado_te_fp_rs != null) mapped.nao_compensado_te_fp_rs = Number(flatData.nao_compensado_te_fp_rs);
  if (flatData.nao_compensado_te_hr_rs != null) mapped.nao_compensado_te_hr_rs = Number(flatData.nao_compensado_te_hr_rs);
  if (flatData.ufer_fp_kvarh != null) mapped.ufer_fp_kvarh = Number(flatData.ufer_fp_kvarh);
  if (flatData.ufer_fp_rs != null) mapped.ufer_fp_rs = Number(flatData.ufer_fp_rs);
  if (flatData.cip_rs != null) mapped.cip_rs = Number(flatData.cip_rs);
  
  // Tributos
  if (flatData.base_pis_cofins_rs != null) mapped.base_pis_cofins_rs = Number(flatData.base_pis_cofins_rs);
  if (flatData.pis_aliquota_percent != null) mapped.pis_aliquota_percent = Number(flatData.pis_aliquota_percent);
  if (flatData.pis_rs != null) mapped.pis_rs = Number(flatData.pis_rs);
  if (flatData.cofins_aliquota_percent != null) mapped.cofins_aliquota_percent = Number(flatData.cofins_aliquota_percent);
  if (flatData.cofins_rs != null) mapped.cofins_rs = Number(flatData.cofins_rs);
  if (flatData.base_icms_rs != null) mapped.base_icms_rs = Number(flatData.base_icms_rs);
  if (flatData.icms_aliquota_percent != null) mapped.icms_aliquota_percent = Number(flatData.icms_aliquota_percent);
  if (flatData.icms_rs != null) mapped.icms_rs = Number(flatData.icms_rs);
  
  // Detectar geração
  if (mapped.geracao_local_total_kwh && mapped.geracao_local_total_kwh > 0) {
    mapped.tem_geracao_local = true;
  }
  if (mapped.scee_credito_recebido_kwh && mapped.scee_credito_recebido_kwh > 0) {
    mapped.tem_usina_remota = true;
  }
  
  return mapped;
}
