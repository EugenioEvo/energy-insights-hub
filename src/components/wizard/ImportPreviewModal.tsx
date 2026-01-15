import React from 'react';
import { CheckCircle2, FileCheck, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FaturaWizardData } from './WizardContext';

interface ImportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Partial<FaturaWizardData> | null;
  onConfirm: () => void;
}

// Categorias de campos para exibição organizada
const FIELD_CATEGORIES = {
  identificacao: {
    label: 'Identificação',
    fields: ['uc_numero', 'mes_ref', 'grupo_tarifario', 'modalidade', 'classe_tarifaria', 'concessionaria'],
  },
  cabecalho: {
    label: 'Cabeçalho',
    fields: ['data_emissao', 'data_apresentacao', 'vencimento', 'leitura_anterior', 'leitura_atual', 'dias_faturados', 'proxima_leitura', 'valor_total_pagar'],
  },
  consumo: {
    label: 'Consumo',
    fields: ['consumo_ponta_kwh', 'consumo_fora_ponta_kwh', 'consumo_reservado_kwh', 'consumo_total_kwh'],
  },
  demanda: {
    label: 'Demanda',
    fields: ['demanda_contratada_kw', 'demanda_medida_kw', 'demanda_ultrapassagem_kw', 'valor_demanda_rs', 'valor_demanda_ultrapassagem_rs'],
  },
  geracao: {
    label: 'Geração / SCEE',
    fields: ['geracao_local_total_kwh', 'autoconsumo_total_kwh', 'injecao_total_kwh', 'scee_credito_recebido_kwh', 'scee_saldo_kwh_fp'],
  },
  tributos: {
    label: 'Tributos',
    fields: ['pis_aliquota_percent', 'pis_rs', 'cofins_aliquota_percent', 'cofins_rs', 'icms_aliquota_percent', 'icms_rs', 'cip_rs'],
  },
};

// Labels amigáveis para campos
const FIELD_LABELS: Record<string, string> = {
  uc_numero: 'Número UC',
  mes_ref: 'Mês Referência',
  grupo_tarifario: 'Grupo Tarifário',
  modalidade: 'Modalidade',
  classe_tarifaria: 'Classe Tarifária',
  concessionaria: 'Concessionária',
  data_emissao: 'Data Emissão',
  data_apresentacao: 'Data Apresentação',
  vencimento: 'Vencimento',
  leitura_anterior: 'Leitura Anterior',
  leitura_atual: 'Leitura Atual',
  dias_faturados: 'Dias Faturados',
  proxima_leitura: 'Próxima Leitura',
  valor_total_pagar: 'Valor Total (R$)',
  consumo_ponta_kwh: 'Consumo Ponta (kWh)',
  consumo_fora_ponta_kwh: 'Consumo Fora Ponta (kWh)',
  consumo_reservado_kwh: 'Consumo Reservado (kWh)',
  consumo_total_kwh: 'Consumo Total (kWh)',
  demanda_contratada_kw: 'Demanda Contratada (kW)',
  demanda_medida_kw: 'Demanda Medida (kW)',
  demanda_ultrapassagem_kw: 'Ultrapassagem (kW)',
  valor_demanda_rs: 'Valor Demanda (R$)',
  valor_demanda_ultrapassagem_rs: 'Valor Ultrapassagem (R$)',
  geracao_local_total_kwh: 'Geração Total (kWh)',
  autoconsumo_total_kwh: 'Autoconsumo (kWh)',
  injecao_total_kwh: 'Injeção (kWh)',
  scee_credito_recebido_kwh: 'Créditos Recebidos (kWh)',
  scee_saldo_kwh_fp: 'Saldo FP (kWh)',
  pis_aliquota_percent: 'PIS (%)',
  pis_rs: 'PIS (R$)',
  cofins_aliquota_percent: 'COFINS (%)',
  cofins_rs: 'COFINS (R$)',
  icms_aliquota_percent: 'ICMS (%)',
  icms_rs: 'ICMS (R$)',
  cip_rs: 'CIP (R$)',
};

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return '-';
  
  if (key.includes('_rs') || key.includes('valor_')) {
    return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }
  if (key.includes('_kwh') || key.includes('_kw')) {
    return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }
  if (key.includes('_percent')) {
    return `${Number(value).toFixed(2)}%`;
  }
  
  return String(value);
}

export function ImportPreviewModal({ open, onOpenChange, data, onConfirm }: ImportPreviewModalProps) {
  if (!data) return null;
  
  // Contar campos extraídos por categoria
  const extractedByCategory = Object.entries(FIELD_CATEGORIES).map(([key, category]) => {
    const extracted = category.fields.filter(field => {
      const value = data[field as keyof FaturaWizardData];
      return value !== undefined && value !== null && value !== '' && value !== 0;
    });
    return { key, ...category, extracted };
  }).filter(cat => cat.extracted.length > 0);
  
  const totalExtracted = extractedByCategory.reduce((sum, cat) => sum + cat.extracted.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-green-500" />
            Dados Extraídos
          </DialogTitle>
          <DialogDescription>
            Revise os dados extraídos antes de importar para o formulário.
            <Badge variant="secondary" className="ml-2">
              {totalExtracted} campos encontrados
            </Badge>
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {extractedByCategory.map((category, idx) => (
              <div key={category.key}>
                {idx > 0 && <Separator className="my-4" />}
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {category.label}
                  <Badge variant="outline" className="text-xs">
                    {category.extracted.length}
                  </Badge>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {category.extracted.map(field => (
                    <div
                      key={field}
                      className="flex justify-between items-center text-sm py-1 px-2 bg-muted/50 rounded"
                    >
                      <span className="text-muted-foreground">
                        {FIELD_LABELS[field] || field}
                      </span>
                      <span className="font-medium">
                        {formatValue(field, data[field as keyof FaturaWizardData])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Verifique os valores extraídos. Você poderá editar manualmente após a importação.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirmar Importação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
