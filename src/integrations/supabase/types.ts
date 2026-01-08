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
          valor_assinatura: number
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
          valor_assinatura?: number
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
          valor_assinatura?: number
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_mensais_uc_id_fkey"
            columns: ["uc_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
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
          bandeiras: string
          consumo_total_kwh: number
          created_at: string
          demanda_contratada_kw: number
          demanda_contratada_rs: number
          demanda_geracao_kw: number
          demanda_geracao_rs: number
          demanda_medida_kw: number
          energia_fora_ponta_rs: number
          energia_ponta_rs: number
          fora_ponta_kwh: number
          id: string
          iluminacao_publica: number
          mes_ref: string
          multa_demanda: number
          multa_demanda_ultrapassagem: number
          multa_reativo: number
          multa_ufer_fora_ponta: number
          multa_ufer_ponta: number
          outros_encargos: number
          ponta_kwh: number
          uc_id: string
          updated_at: string
          valor_te: number
          valor_total: number
          valor_tusd: number
        }
        Insert: {
          bandeiras: string
          consumo_total_kwh?: number
          created_at?: string
          demanda_contratada_kw?: number
          demanda_contratada_rs?: number
          demanda_geracao_kw?: number
          demanda_geracao_rs?: number
          demanda_medida_kw?: number
          energia_fora_ponta_rs?: number
          energia_ponta_rs?: number
          fora_ponta_kwh?: number
          id?: string
          iluminacao_publica?: number
          mes_ref: string
          multa_demanda?: number
          multa_demanda_ultrapassagem?: number
          multa_reativo?: number
          multa_ufer_fora_ponta?: number
          multa_ufer_ponta?: number
          outros_encargos?: number
          ponta_kwh?: number
          uc_id: string
          updated_at?: string
          valor_te?: number
          valor_total?: number
          valor_tusd?: number
        }
        Update: {
          bandeiras?: string
          consumo_total_kwh?: number
          created_at?: string
          demanda_contratada_kw?: number
          demanda_contratada_rs?: number
          demanda_geracao_kw?: number
          demanda_geracao_rs?: number
          demanda_medida_kw?: number
          energia_fora_ponta_rs?: number
          energia_ponta_rs?: number
          fora_ponta_kwh?: number
          id?: string
          iluminacao_publica?: number
          mes_ref?: string
          multa_demanda?: number
          multa_demanda_ultrapassagem?: number
          multa_reativo?: number
          multa_ufer_fora_ponta?: number
          multa_ufer_ponta?: number
          outros_encargos?: number
          ponta_kwh?: number
          uc_id?: string
          updated_at?: string
          valor_te?: number
          valor_total?: number
          valor_tusd?: number
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
          cliente_id: string
          created_at: string
          demanda_contratada: number
          distribuidora: string
          endereco: string
          id: string
          modalidade_tarifaria: string
          numero: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          demanda_contratada?: number
          distribuidora: string
          endereco: string
          id?: string
          modalidade_tarifaria: string
          numero: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          demanda_contratada?: number
          distribuidora?: string
          endereco?: string
          id?: string
          modalidade_tarifaria?: string
          numero?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
