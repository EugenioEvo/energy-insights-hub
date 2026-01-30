import { z } from 'zod';

// CNPJ validation function (Brazilian company tax ID)
function validarCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/[^\d]/g, '');
  if (numbers.length !== 14) return false;
  
  // Check if all digits are the same (invalid)
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validate check digits
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(numbers[12]) !== digit1) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(numbers[13]) === digit2;
}

// Format CNPJ for display
export function formatCNPJ(value: string): string {
  const numbers = value.replace(/[^\d]/g, '').slice(0, 14);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
}

// Format phone for display
export function formatPhone(value: string): string {
  const numbers = value.replace(/[^\d]/g, '').slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

// Cliente (Customer) validation schema
export const clienteSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  cnpj: z.string()
    .transform((val) => val.replace(/[^\d]/g, ''))
    .refine((val) => val.length === 14, 'CNPJ deve ter 14 dígitos')
    .refine(validarCNPJ, 'CNPJ inválido'),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  telefone: z.string()
    .transform((val) => val?.replace(/[^\d]/g, '') || '')
    .refine((val) => val === '' || (val.length >= 10 && val.length <= 11), 'Telefone deve ter 10 ou 11 dígitos')
    .nullable()
    .optional(),
});

// Unidade Consumidora (Consumer Unit) validation schema
export const unidadeConsumidoraSchema = z.object({
  numero: z.string()
    .min(5, 'Número da UC deve ter pelo menos 5 caracteres')
    .max(50, 'Número da UC muito longo'),
  endereco: z.string()
    .min(10, 'Endereço deve ter pelo menos 10 caracteres')
    .max(200, 'Endereço muito longo'),
  distribuidora: z.string()
    .min(3, 'Distribuidora deve ter pelo menos 3 caracteres'),
  concessionaria: z.string()
    .min(3, 'Concessionária deve ter pelo menos 3 caracteres'),
  modalidade_tarifaria: z.enum(['convencional', 'branca', 'verde', 'azul']),
  grupo_tarifario: z.enum(['A', 'B']).optional(),
  demanda_contratada: z.number()
    .min(0, 'Demanda não pode ser negativa')
    .max(100000, 'Demanda muito alta'),
  demanda_geracao_kw: z.number()
    .min(0, 'Demanda de geração não pode ser negativa')
    .max(100000, 'Demanda de geração muito alta')
    .optional(),
});

// Usina Remota (Remote Power Plant) validation schema
export const usinaRemotaSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome muito longo'),
  uc_geradora: z.string()
    .min(5, 'UC geradora deve ter pelo menos 5 caracteres')
    .max(50, 'UC geradora muito longa'),
  cnpj_titular: z.string()
    .transform((val) => val.replace(/[^\d]/g, ''))
    .refine((val) => val.length === 14, 'CNPJ deve ter 14 dígitos')
    .refine(validarCNPJ, 'CNPJ inválido'),
  potencia_instalada_kw: z.number()
    .min(0.1, 'Potência deve ser maior que 0')
    .max(1000000, 'Potência muito alta'),
  fonte: z.enum(['solar', 'eolica', 'hidraulica', 'biomassa', 'outros']),
  modalidade_gd: z.enum(['autoconsumo_remoto', 'geracao_compartilhada', 'consorcio', 'cooperativa']),
  distribuidora: z.string()
    .min(3, 'Distribuidora deve ter pelo menos 3 caracteres'),
  endereco: z.string()
    .max(200, 'Endereço muito longo')
    .nullable()
    .optional(),
  data_conexao: z.string().nullable().optional(),
  data_protocolo_aneel: z.string().nullable().optional(),
  numero_processo_aneel: z.string().max(50, 'Número do processo muito longo').nullable().optional(),
  ativo: z.boolean().default(true),
});

// Cliente-Usina Vínculo (Contract) validation schema
export const clienteUsinaVinculoSchema = z.object({
  percentual_rateio: z.number()
    .min(0, 'Percentual não pode ser negativo')
    .max(100, 'Percentual não pode exceder 100%'),
  energia_contratada_kwh: z.number()
    .min(0, 'Energia contratada não pode ser negativa')
    .max(100000000, 'Energia contratada muito alta'),
  desconto_garantido_percent: z.number()
    .min(0, 'Desconto não pode ser negativo')
    .max(100, 'Desconto não pode exceder 100%'),
  tarifa_ppa_rs_kwh: z.number()
    .min(0, 'Tarifa não pode ser negativa')
    .max(10, 'Tarifa muito alta')
    .optional(),
  data_inicio_contrato: z.string().nullable().optional(),
  data_fim_contrato: z.string().nullable().optional(),
  numero_contrato: z.string().max(50, 'Número do contrato muito longo').nullable().optional(),
  ativo: z.boolean().default(true),
});

// Type exports for use in components
export type ClienteFormData = z.infer<typeof clienteSchema>;
export type UnidadeConsumidoraFormData = z.infer<typeof unidadeConsumidoraSchema>;
export type UsinaRemotaFormData = z.infer<typeof usinaRemotaSchema>;
export type ClienteUsinaVinculoFormData = z.infer<typeof clienteUsinaVinculoSchema>;
