export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assinaturas_mensais: {
        Row: {
          created_at: string
          economia_prometida_percent: number
          energia_alocada_kwh: number
          energia_contratada_kwh: number
          id: string
          mes_ref: string
          uc_id: string
          uc_remota: string
          updated_at: string
          usina_id: string | null
          valor_assinatura: number
          vinculo_id: string | null
        }
        Insert: {
          created_at?: string
          economia_prometida_percent?: number
          energia_alocada_kwh?: number
          energia_contratada_kwh?: number
          id?: string
          mes_ref: string
          uc_id: string
          uc_remota: string
          updated_at?: string
          usina_id?: string | null
          valor_assinatura?: number
          vinculo_id?: string | null
        }
        Update: {
          created_at?: string
          economia_prometida_percent?: number
          energia_alocada_kwh?: number
          energia_contratada_kwh?: number
          id?: string
          mes_ref?: string
          uc_id?: string
          uc_remota?: string
          updated_at?: string
          usina_id?: string | null
          valor_assinatura?: number
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_mensais_uc_id_fkey"
            columns: ["uc_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_mensais_usina_id_fkey"
            columns: ["usina_id"]
            isOneToOne: false
            referencedRelation: "usinas_remotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_mensais_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "cliente_usina_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_usina_vinculo: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          data_fim_contrato: string | null
          data_inicio_contrato: string | null
          desconto_garantido_percent: number
          energia_contratada_kwh: number
          id: string
          numero_contrato: string | null
          percentual_rateio: number
          uc_beneficiaria_id: string
          updated_at: string
          usina_id: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          data_fim_contrato?: string | null
          data_inicio_contrato?: string | null
          desconto_garantido_percent?: number
          energia_contratada_kwh?: number
          id?: string
          numero_contrato?: string | null
          percentual_rateio?: number
          uc_beneficiaria_id: string
          updated_at?: string
          usina_id: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          data_fim_contrato?: string | null
          data_inicio_contrato?: string | null
          desconto_garantido_percent?: number
          energia_contratada_kwh?: number
          id?: string
          numero_contrato?: string | null
          percentual_rateio?: number
          uc_beneficiaria_id?: string
          updated_at?: string
          usina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_usina_vinculo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_usina_vinculo_uc_beneficiaria_id_fkey"
            columns: ["uc_beneficiaria_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_usina_vinculo_usina_id_fkey"
            columns: ["usina_id"]
            isOneToOne: false
            referencedRelation: "usinas_remotas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cnpj: string
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          email: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      faturas_mensais: {
        Row: {
          alertas: Json | null
          bandeira_te_fp_rs: number | null
          bandeira_te_hr_rs: number | null
          bandeira_te_p_rs: number | null
          bandeiras: string
          base_icms_rs: number | null
          base_pis_cofins_rs: number | null
          cip_rs: number | null
          cofins_aliquota_percent: number | null
          cofins_rs: number | null
          consumo_reservado_kwh: number | null
          consumo_total_kwh: number
          created_at: string
          data_apresentacao: string | null
          data_emissao: string | null
          demanda_contratada_kw: number
          demanda_contratada_rs: number
          demanda_geracao_kw: number
          demanda_geracao_rs: number
          demanda_medida_kw: number
          demanda_ultrapassagem_kw: number | null
          dias_faturados: number | null
          energia_fora_ponta_rs: number
          energia_ponta_rs: number
          fora_ponta_kwh: number
          icms_aliquota_percent: number | null
          icms_rs: number | null
          id: string
          iluminacao_publica: number
          leitura_anterior: string | null
          leitura_atual: string | null
          mes_ref: string
          multa_demanda: number
          multa_demanda_ultrapassagem: number
          multa_reativo: number
          multa_ufer_fora_ponta: number
          multa_ufer_ponta: number
          nao_compensado_te_fp_rs: number | null
          nao_compensado_te_hr_rs: number | null
          nao_compensado_te_p_rs: number | null
          nao_compensado_tusd_fp_rs: number | null
          nao_compensado_tusd_hr_rs: number | null
          nao_compensado_tusd_p_rs: number | null
          outros_encargos: number
          pis_aliquota_percent: number | null
          pis_rs: number | null
          ponta_kwh: number
          proxima_leitura: string | null
          recomendacoes: Json | null
          scee_consumo_fp_tusd_rs: number | null
          scee_credito_recebido_kwh: number | null
          scee_excedente_recebido_kwh: number | null
          scee_geracao_ciclo_fp_kwh: number | null
          scee_geracao_ciclo_hr_kwh: number | null
          scee_geracao_ciclo_ponta_kwh: number | null
          scee_injecao_fp_te_rs: number | null
          scee_injecao_fp_tusd_rs: number | null
          scee_parcela_te_fp_rs: number | null
          scee_rateio_percent: number | null
          scee_saldo_expirar_30d_kwh: number | null
          scee_saldo_expirar_60d_kwh: number | null
          scee_saldo_kwh_fp: number | null
          scee_saldo_kwh_hr: number | null
          scee_saldo_kwh_p: number | null
          status: string
          uc_id: string
          ufer_fp_kvarh: number | null
          ufer_fp_rs: number | null
          updated_at: string
          valor_demanda_rs: number | null
          valor_demanda_ultrapassagem_rs: number | null
          valor_te: number
          valor_total: number
          valor_tusd: number
          vencimento: string | null
        }
        Insert: {
          alertas?: Json | null
          bandeira_te_fp_rs?: number | null
          bandeira_te_hr_rs?: number | null
          bandeira_te_p_rs?: number | null
          bandeiras: string
          base_icms_rs?: number | null
          base_pis_cofins_rs?: number | null
          cip_rs?: number | null
          cofins_aliquota_percent?: number | null
          cofins_rs?: number | null
          consumo_reservado_kwh?: number | null
          consumo_total_kwh?: number
          created_at?: string
          data_apresentacao?: string | null
          data_emissao?: string | null
          demanda_contratada_kw?: number
          demanda_contratada_rs?: number
          demanda_geracao_kw?: number
          demanda_geracao_rs?: number
          demanda_medida_kw?: number
          demanda_ultrapassagem_kw?: number | null
          dias_faturados?: number | null
          energia_fora_ponta_rs?: number
          energia_ponta_rs?: number
          fora_ponta_kwh?: number
          icms_aliquota_percent?: number | null
          icms_rs?: number | null
          id?: string
          iluminacao_publica?: number
          leitura_anterior?: string | null
          leitura_atual?: string | null
          mes_ref: string
          multa_demanda?: number
          multa_demanda_ultrapassagem?: number
          multa_reativo?: number
          multa_ufer_fora_ponta?: number
          multa_ufer_ponta?: number
          nao_compensado_te_fp_rs?: number | null
          nao_compensado_te_hr_rs?: number | null
          nao_compensado_te_p_rs?: number | null
          nao_compensado_tusd_fp_rs?: number | null
          nao_compensado_tusd_hr_rs?: number | null
          nao_compensado_tusd_p_rs?: number | null
          outros_encargos?: number
          pis_aliquota_percent?: number | null
          pis_rs?: number | null
          ponta_kwh?: number
          proxima_leitura?: string | null
          recomendacoes?: Json | null
          scee_consumo_fp_tusd_rs?: number | null
          scee_credito_recebido_kwh?: number | null
          scee_excedente_recebido_kwh?: number | null
          scee_geracao_ciclo_fp_kwh?: number | null
          scee_geracao_ciclo_hr_kwh?: number | null
          scee_geracao_ciclo_ponta_kwh?: number | null
          scee_injecao_fp_te_rs?: number | null
          scee_injecao_fp_tusd_rs?: number | null
          scee_parcela_te_fp_rs?: number | null
          scee_rateio_percent?: number | null
          scee_saldo_expirar_30d_kwh?: number | null
          scee_saldo_expirar_60d_kwh?: number | null
          scee_saldo_kwh_fp?: number | null
          scee_saldo_kwh_hr?: number | null
          scee_saldo_kwh_p?: number | null
          status?: string
          uc_id: string
          ufer_fp_kvarh?: number | null
          ufer_fp_rs?: number | null
          updated_at?: string
          valor_demanda_rs?: number | null
          valor_demanda_ultrapassagem_rs?: number | null
          valor_te?: number
          valor_total?: number
          valor_tusd?: number
          vencimento?: string | null
        }
        Update: {
          alertas?: Json | null
          bandeira_te_fp_rs?: number | null
          bandeira_te_hr_rs?: number | null
          bandeira_te_p_rs?: number | null
          bandeiras?: string
          base_icms_rs?: number | null
          base_pis_cofins_rs?: number | null
          cip_rs?: number | null
          cofins_aliquota_percent?: number | null
          cofins_rs?: number | null
          consumo_reservado_kwh?: number | null
          consumo_total_kwh?: number
          created_at?: string
          data_apresentacao?: string | null
          data_emissao?: string | null
          demanda_contratada_kw?: number
          demanda_contratada_rs?: number
          demanda_geracao_kw?: number
          demanda_geracao_rs?: number
          demanda_medida_kw?: number
          demanda_ultrapassagem_kw?: number | null
          dias_faturados?: number | null
          energia_fora_ponta_rs?: number
          energia_ponta_rs?: number
          fora_ponta_kwh?: number
          icms_aliquota_percent?: number | null
          icms_rs?: number | null
          id?: string
          iluminacao_publica?: number
          leitura_anterior?: string | null
          leitura_atual?: string | null
          mes_ref?: string
          multa_demanda?: number
          multa_demanda_ultrapassagem?: number
          multa_reativo?: number
          multa_ufer_fora_ponta?: number
          multa_ufer_ponta?: number
          nao_compensado_te_fp_rs?: number | null
          nao_compensado_te_hr_rs?: number | null
          nao_compensado_te_p_rs?: number | null
          nao_compensado_tusd_fp_rs?: number | null
          nao_compensado_tusd_hr_rs?: number | null
          nao_compensado_tusd_p_rs?: number | null
          outros_encargos?: number
          pis_aliquota_percent?: number | null
          pis_rs?: number | null
          ponta_kwh?: number
          proxima_leitura?: string | null
          recomendacoes?: Json | null
          scee_consumo_fp_tusd_rs?: number | null
          scee_credito_recebido_kwh?: number | null
          scee_excedente_recebido_kwh?: number | null
          scee_geracao_ciclo_fp_kwh?: number | null
          scee_geracao_ciclo_hr_kwh?: number | null
          scee_geracao_ciclo_ponta_kwh?: number | null
          scee_injecao_fp_te_rs?: number | null
          scee_injecao_fp_tusd_rs?: number | null
          scee_parcela_te_fp_rs?: number | null
          scee_rateio_percent?: number | null
          scee_saldo_expirar_30d_kwh?: number | null
          scee_saldo_expirar_60d_kwh?: number | null
          scee_saldo_kwh_fp?: number | null
          scee_saldo_kwh_hr?: number | null
          scee_saldo_kwh_p?: number | null
          status?: string
          uc_id?: string
          ufer_fp_kvarh?: number | null
          ufer_fp_rs?: number | null
          updated_at?: string
          valor_demanda_rs?: number | null
          valor_demanda_ultrapassagem_rs?: number | null
          valor_te?: number
          valor_total?: number
          valor_tusd?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faturas_mensais_uc_id_fkey"
            columns: ["uc_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
        ]
      }
      geracoes_mensais: {
        Row: {
          autoconsumo_kwh: number
          compensacao_kwh: number
          created_at: string
          disponibilidade_percent: number
          geracao_total_kwh: number
          id: string
          injecao_kwh: number
          mes_ref: string
          perdas_estimadas_kwh: number
          uc_id: string
          updated_at: string
        }
        Insert: {
          autoconsumo_kwh?: number
          compensacao_kwh?: number
          created_at?: string
          disponibilidade_percent?: number
          geracao_total_kwh?: number
          id?: string
          injecao_kwh?: number
          mes_ref: string
          perdas_estimadas_kwh?: number
          uc_id: string
          updated_at?: string
        }
        Update: {
          autoconsumo_kwh?: number
          compensacao_kwh?: number
          created_at?: string
          disponibilidade_percent?: number
          geracao_total_kwh?: number
          id?: string
          injecao_kwh?: number
          mes_ref?: string
          perdas_estimadas_kwh?: number
          uc_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geracoes_mensais_uc_id_fkey"
            columns: ["uc_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_consumidoras: {
        Row: {
          classe_tarifaria: string | null
          cliente_id: string
          concessionaria: string
          created_at: string
          demanda_contratada: number
          demanda_geracao_kw: number | null
          distribuidora: string
          endereco: string
          id: string
          modalidade_tarifaria: string
          numero: string
          tensao_kv: number | null
          tipo_fornecimento: string | null
          updated_at: string
        }
        Insert: {
          classe_tarifaria?: string | null
          cliente_id: string
          concessionaria?: string
          created_at?: string
          demanda_contratada?: number
          demanda_geracao_kw?: number | null
          distribuidora: string
          endereco: string
          id?: string
          modalidade_tarifaria: string
          numero: string
          tensao_kv?: number | null
          tipo_fornecimento?: string | null
          updated_at?: string
        }
        Update: {
          classe_tarifaria?: string | null
          cliente_id?: string
          concessionaria?: string
          created_at?: string
          demanda_contratada?: number
          demanda_geracao_kw?: number | null
          distribuidora?: string
          endereco?: string
          id?: string
          modalidade_tarifaria?: string
          numero?: string
          tensao_kv?: number | null
          tipo_fornecimento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_consumidoras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      usinas_remotas: {
        Row: {
          ativo: boolean
          cnpj_titular: string
          created_at: string
          data_conexao: string | null
          distribuidora: string
          endereco: string | null
          fonte: Database["public"]["Enums"]["fonte_energia"]
          id: string
          modalidade_gd: Database["public"]["Enums"]["modalidade_gd"]
          nome: string
          potencia_instalada_kw: number
          uc_geradora: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj_titular: string
          created_at?: string
          data_conexao?: string | null
          distribuidora: string
          endereco?: string | null
          fonte?: Database["public"]["Enums"]["fonte_energia"]
          id?: string
          modalidade_gd?: Database["public"]["Enums"]["modalidade_gd"]
          nome: string
          potencia_instalada_kw?: number
          uc_geradora: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj_titular?: string
          created_at?: string
          data_conexao?: string | null
          distribuidora?: string
          endereco?: string | null
          fonte?: Database["public"]["Enums"]["fonte_energia"]
          id?: string
          modalidade_gd?: Database["public"]["Enums"]["modalidade_gd"]
          nome?: string
          potencia_instalada_kw?: number
          uc_geradora?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      fonte_energia: "solar" | "eolica" | "hidraulica" | "biomassa" | "outros"
      modalidade_gd:
        | "autoconsumo_remoto"
        | "geracao_compartilhada"
        | "consorcio"
        | "cooperativa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      fonte_energia: ["solar", "eolica", "hidraulica", "biomassa", "outros"],
      modalidade_gd: [
        "autoconsumo_remoto",
        "geracao_compartilhada",
        "consorcio",
        "cooperativa",
      ],
    },
  },
} as const
