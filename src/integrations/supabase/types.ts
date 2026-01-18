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
          modalidade_economia:
            | Database["public"]["Enums"]["modalidade_economia"]
            | null
          numero_contrato: string | null
          percentual_rateio: number
          referencia_desconto:
            | Database["public"]["Enums"]["referencia_desconto"]
            | null
          tarifa_ppa_rs_kwh: number | null
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
          modalidade_economia?:
            | Database["public"]["Enums"]["modalidade_economia"]
            | null
          numero_contrato?: string | null
          percentual_rateio?: number
          referencia_desconto?:
            | Database["public"]["Enums"]["referencia_desconto"]
            | null
          tarifa_ppa_rs_kwh?: number | null
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
          modalidade_economia?:
            | Database["public"]["Enums"]["modalidade_economia"]
            | null
          numero_contrato?: string | null
          percentual_rateio?: number
          referencia_desconto?:
            | Database["public"]["Enums"]["referencia_desconto"]
            | null
          tarifa_ppa_rs_kwh?: number | null
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
          autoconsumo_fp_kwh: number | null
          autoconsumo_fp_rs: number | null
          autoconsumo_hr_kwh: number | null
          autoconsumo_hr_rs: number | null
          autoconsumo_ponta_kwh: number | null
          autoconsumo_ponta_rs: number | null
          autoconsumo_rs: number | null
          autoconsumo_total_kwh: number | null
          bandeira_te_fp_rs: number | null
          bandeira_te_hr_rs: number | null
          bandeira_te_p_rs: number | null
          bandeiras: string
          base_icms_rs: number | null
          base_pis_cofins_rs: number | null
          cip_rs: number | null
          classificacao_gd_aplicada: string | null
          cofins_aliquota_percent: number | null
          cofins_rs: number | null
          consumo_final_kwh: number | null
          consumo_reservado_kwh: number | null
          consumo_residual_kwh: number | null
          consumo_total_kwh: number
          created_at: string
          credito_assinatura_kwh: number | null
          credito_assinatura_rs: number | null
          credito_remoto_compensado_rs: number | null
          credito_remoto_fp_kwh: number | null
          credito_remoto_fp_rs: number | null
          credito_remoto_hr_kwh: number | null
          credito_remoto_hr_rs: number | null
          credito_remoto_kwh: number | null
          credito_remoto_ponta_kwh: number | null
          credito_remoto_ponta_rs: number | null
          custo_assinatura_rs: number | null
          data_apresentacao: string | null
          data_emissao: string | null
          demanda_contratada_kw: number
          demanda_contratada_rs: number
          demanda_geracao_kw: number
          demanda_geracao_rs: number
          demanda_medida_kw: number
          demanda_ultrapassagem_kw: number | null
          desconto_assinatura_percent: number | null
          dias_faturados: number | null
          economia_compensacao_rs: number | null
          economia_liquida_rs: number | null
          economia_simultaneidade_rs: number | null
          energia_fora_ponta_rs: number
          energia_ponta_rs: number
          energia_simultanea_kwh: number | null
          energia_simultanea_rs: number | null
          fora_ponta_kwh: number
          geracao_local_total_kwh: number | null
          grupo_tarifario: string | null
          icms_aliquota_percent: number | null
          icms_rs: number | null
          id: string
          iluminacao_publica: number
          injecao_fp_kwh: number | null
          injecao_hr_kwh: number | null
          injecao_ponta_kwh: number | null
          injecao_total_kwh: number | null
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
          percentual_fio_b_aplicado: number | null
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
          tusd_encargos_rs: number | null
          tusd_fio_a_rs: number | null
          tusd_fio_b_rs: number | null
          uc_id: string
          ufer_fp_kvarh: number | null
          ufer_fp_rs: number | null
          updated_at: string
          valor_demanda_rs: number | null
          valor_demanda_ultrapassagem_rs: number | null
          valor_nao_compensavel_rs: number | null
          valor_te: number
          valor_total: number
          valor_tusd: number
          vencimento: string | null
        }
        Insert: {
          alertas?: Json | null
          autoconsumo_fp_kwh?: number | null
          autoconsumo_fp_rs?: number | null
          autoconsumo_hr_kwh?: number | null
          autoconsumo_hr_rs?: number | null
          autoconsumo_ponta_kwh?: number | null
          autoconsumo_ponta_rs?: number | null
          autoconsumo_rs?: number | null
          autoconsumo_total_kwh?: number | null
          bandeira_te_fp_rs?: number | null
          bandeira_te_hr_rs?: number | null
          bandeira_te_p_rs?: number | null
          bandeiras: string
          base_icms_rs?: number | null
          base_pis_cofins_rs?: number | null
          cip_rs?: number | null
          classificacao_gd_aplicada?: string | null
          cofins_aliquota_percent?: number | null
          cofins_rs?: number | null
          consumo_final_kwh?: number | null
          consumo_reservado_kwh?: number | null
          consumo_residual_kwh?: number | null
          consumo_total_kwh?: number
          created_at?: string
          credito_assinatura_kwh?: number | null
          credito_assinatura_rs?: number | null
          credito_remoto_compensado_rs?: number | null
          credito_remoto_fp_kwh?: number | null
          credito_remoto_fp_rs?: number | null
          credito_remoto_hr_kwh?: number | null
          credito_remoto_hr_rs?: number | null
          credito_remoto_kwh?: number | null
          credito_remoto_ponta_kwh?: number | null
          credito_remoto_ponta_rs?: number | null
          custo_assinatura_rs?: number | null
          data_apresentacao?: string | null
          data_emissao?: string | null
          demanda_contratada_kw?: number
          demanda_contratada_rs?: number
          demanda_geracao_kw?: number
          demanda_geracao_rs?: number
          demanda_medida_kw?: number
          demanda_ultrapassagem_kw?: number | null
          desconto_assinatura_percent?: number | null
          dias_faturados?: number | null
          economia_compensacao_rs?: number | null
          economia_liquida_rs?: number | null
          economia_simultaneidade_rs?: number | null
          energia_fora_ponta_rs?: number
          energia_ponta_rs?: number
          energia_simultanea_kwh?: number | null
          energia_simultanea_rs?: number | null
          fora_ponta_kwh?: number
          geracao_local_total_kwh?: number | null
          grupo_tarifario?: string | null
          icms_aliquota_percent?: number | null
          icms_rs?: number | null
          id?: string
          iluminacao_publica?: number
          injecao_fp_kwh?: number | null
          injecao_hr_kwh?: number | null
          injecao_ponta_kwh?: number | null
          injecao_total_kwh?: number | null
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
          percentual_fio_b_aplicado?: number | null
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
          tusd_encargos_rs?: number | null
          tusd_fio_a_rs?: number | null
          tusd_fio_b_rs?: number | null
          uc_id: string
          ufer_fp_kvarh?: number | null
          ufer_fp_rs?: number | null
          updated_at?: string
          valor_demanda_rs?: number | null
          valor_demanda_ultrapassagem_rs?: number | null
          valor_nao_compensavel_rs?: number | null
          valor_te?: number
          valor_total?: number
          valor_tusd?: number
          vencimento?: string | null
        }
        Update: {
          alertas?: Json | null
          autoconsumo_fp_kwh?: number | null
          autoconsumo_fp_rs?: number | null
          autoconsumo_hr_kwh?: number | null
          autoconsumo_hr_rs?: number | null
          autoconsumo_ponta_kwh?: number | null
          autoconsumo_ponta_rs?: number | null
          autoconsumo_rs?: number | null
          autoconsumo_total_kwh?: number | null
          bandeira_te_fp_rs?: number | null
          bandeira_te_hr_rs?: number | null
          bandeira_te_p_rs?: number | null
          bandeiras?: string
          base_icms_rs?: number | null
          base_pis_cofins_rs?: number | null
          cip_rs?: number | null
          classificacao_gd_aplicada?: string | null
          cofins_aliquota_percent?: number | null
          cofins_rs?: number | null
          consumo_final_kwh?: number | null
          consumo_reservado_kwh?: number | null
          consumo_residual_kwh?: number | null
          consumo_total_kwh?: number
          created_at?: string
          credito_assinatura_kwh?: number | null
          credito_assinatura_rs?: number | null
          credito_remoto_compensado_rs?: number | null
          credito_remoto_fp_kwh?: number | null
          credito_remoto_fp_rs?: number | null
          credito_remoto_hr_kwh?: number | null
          credito_remoto_hr_rs?: number | null
          credito_remoto_kwh?: number | null
          credito_remoto_ponta_kwh?: number | null
          credito_remoto_ponta_rs?: number | null
          custo_assinatura_rs?: number | null
          data_apresentacao?: string | null
          data_emissao?: string | null
          demanda_contratada_kw?: number
          demanda_contratada_rs?: number
          demanda_geracao_kw?: number
          demanda_geracao_rs?: number
          demanda_medida_kw?: number
          demanda_ultrapassagem_kw?: number | null
          desconto_assinatura_percent?: number | null
          dias_faturados?: number | null
          economia_compensacao_rs?: number | null
          economia_liquida_rs?: number | null
          economia_simultaneidade_rs?: number | null
          energia_fora_ponta_rs?: number
          energia_ponta_rs?: number
          energia_simultanea_kwh?: number | null
          energia_simultanea_rs?: number | null
          fora_ponta_kwh?: number
          geracao_local_total_kwh?: number | null
          grupo_tarifario?: string | null
          icms_aliquota_percent?: number | null
          icms_rs?: number | null
          id?: string
          iluminacao_publica?: number
          injecao_fp_kwh?: number | null
          injecao_hr_kwh?: number | null
          injecao_ponta_kwh?: number | null
          injecao_total_kwh?: number | null
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
          percentual_fio_b_aplicado?: number | null
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
          tusd_encargos_rs?: number | null
          tusd_fio_a_rs?: number | null
          tusd_fio_b_rs?: number | null
          uc_id?: string
          ufer_fp_kvarh?: number | null
          ufer_fp_rs?: number | null
          updated_at?: string
          valor_demanda_rs?: number | null
          valor_demanda_ultrapassagem_rs?: number | null
          valor_nao_compensavel_rs?: number | null
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
      lei_14300_transicao: {
        Row: {
          ano: number
          created_at: string | null
          descricao: string | null
          id: string
          percentual_encargos: number | null
          percentual_fio_b: number
          updated_at: string | null
          vigente: boolean | null
        }
        Insert: {
          ano: number
          created_at?: string | null
          descricao?: string | null
          id?: string
          percentual_encargos?: number | null
          percentual_fio_b: number
          updated_at?: string | null
          vigente?: boolean | null
        }
        Update: {
          ano?: number
          created_at?: string | null
          descricao?: string | null
          id?: string
          percentual_encargos?: number | null
          percentual_fio_b?: number
          updated_at?: string | null
          vigente?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tarifas_concessionaria: {
        Row: {
          ativo: boolean | null
          bandeira_amarela_rs_kwh: number | null
          bandeira_verde_rs_kwh: number | null
          bandeira_vermelha1_rs_kwh: number | null
          bandeira_vermelha2_rs_kwh: number | null
          cofins_percent: number | null
          concessionaria: string
          created_at: string
          demanda_fora_ponta_rs_kw: number | null
          demanda_geracao_rs_kw: number | null
          demanda_ponta_rs_kw: number | null
          demanda_ultrapassagem_rs_kw: number | null
          demanda_unica_rs_kw: number | null
          grupo_tarifario: string
          icms_percent: number | null
          id: string
          modalidade: string | null
          pis_percent: number | null
          resolucao_aneel: string | null
          subgrupo: string | null
          te_fora_ponta_rs_kwh: number | null
          te_ponta_rs_kwh: number | null
          te_reservado_rs_kwh: number | null
          te_unica_rs_kwh: number | null
          tusd_encargos_rs_kwh: number | null
          tusd_fio_a_rs_kwh: number | null
          tusd_fio_b_rs_kwh: number | null
          tusd_fora_ponta_rs_kwh: number | null
          tusd_ponta_rs_kwh: number | null
          tusd_reservado_rs_kwh: number | null
          tusd_unica_rs_kwh: number | null
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          ativo?: boolean | null
          bandeira_amarela_rs_kwh?: number | null
          bandeira_verde_rs_kwh?: number | null
          bandeira_vermelha1_rs_kwh?: number | null
          bandeira_vermelha2_rs_kwh?: number | null
          cofins_percent?: number | null
          concessionaria: string
          created_at?: string
          demanda_fora_ponta_rs_kw?: number | null
          demanda_geracao_rs_kw?: number | null
          demanda_ponta_rs_kw?: number | null
          demanda_ultrapassagem_rs_kw?: number | null
          demanda_unica_rs_kw?: number | null
          grupo_tarifario: string
          icms_percent?: number | null
          id?: string
          modalidade?: string | null
          pis_percent?: number | null
          resolucao_aneel?: string | null
          subgrupo?: string | null
          te_fora_ponta_rs_kwh?: number | null
          te_ponta_rs_kwh?: number | null
          te_reservado_rs_kwh?: number | null
          te_unica_rs_kwh?: number | null
          tusd_encargos_rs_kwh?: number | null
          tusd_fio_a_rs_kwh?: number | null
          tusd_fio_b_rs_kwh?: number | null
          tusd_fora_ponta_rs_kwh?: number | null
          tusd_ponta_rs_kwh?: number | null
          tusd_reservado_rs_kwh?: number | null
          tusd_unica_rs_kwh?: number | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          ativo?: boolean | null
          bandeira_amarela_rs_kwh?: number | null
          bandeira_verde_rs_kwh?: number | null
          bandeira_vermelha1_rs_kwh?: number | null
          bandeira_vermelha2_rs_kwh?: number | null
          cofins_percent?: number | null
          concessionaria?: string
          created_at?: string
          demanda_fora_ponta_rs_kw?: number | null
          demanda_geracao_rs_kw?: number | null
          demanda_ponta_rs_kw?: number | null
          demanda_ultrapassagem_rs_kw?: number | null
          demanda_unica_rs_kw?: number | null
          grupo_tarifario?: string
          icms_percent?: number | null
          id?: string
          modalidade?: string | null
          pis_percent?: number | null
          resolucao_aneel?: string | null
          subgrupo?: string | null
          te_fora_ponta_rs_kwh?: number | null
          te_ponta_rs_kwh?: number | null
          te_reservado_rs_kwh?: number | null
          te_unica_rs_kwh?: number | null
          tusd_encargos_rs_kwh?: number | null
          tusd_fio_a_rs_kwh?: number | null
          tusd_fio_b_rs_kwh?: number | null
          tusd_fora_ponta_rs_kwh?: number | null
          tusd_ponta_rs_kwh?: number | null
          tusd_reservado_rs_kwh?: number | null
          tusd_unica_rs_kwh?: number | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      unidades_consumidoras: {
        Row: {
          classe_tarifaria: string | null
          cliente_id: string
          concessionaria: string
          created_at: string
          custo_disponibilidade_kwh: number | null
          data_protocolo_gd: string | null
          demanda_contratada: number
          demanda_geracao_kw: number | null
          distribuidora: string
          endereco: string
          grupo_tarifario: string | null
          id: string
          modalidade_tarifaria: string
          numero: string
          subgrupo: string | null
          tem_geracao_propria: boolean | null
          tensao_kv: number | null
          tipo_fornecimento: string | null
          updated_at: string
        }
        Insert: {
          classe_tarifaria?: string | null
          cliente_id: string
          concessionaria?: string
          created_at?: string
          custo_disponibilidade_kwh?: number | null
          data_protocolo_gd?: string | null
          demanda_contratada?: number
          demanda_geracao_kw?: number | null
          distribuidora: string
          endereco: string
          grupo_tarifario?: string | null
          id?: string
          modalidade_tarifaria: string
          numero: string
          subgrupo?: string | null
          tem_geracao_propria?: boolean | null
          tensao_kv?: number | null
          tipo_fornecimento?: string | null
          updated_at?: string
        }
        Update: {
          classe_tarifaria?: string | null
          cliente_id?: string
          concessionaria?: string
          created_at?: string
          custo_disponibilidade_kwh?: number | null
          data_protocolo_gd?: string | null
          demanda_contratada?: number
          demanda_geracao_kw?: number | null
          distribuidora?: string
          endereco?: string
          grupo_tarifario?: string | null
          id?: string
          modalidade_tarifaria?: string
          numero?: string
          subgrupo?: string | null
          tem_geracao_propria?: boolean | null
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
      user_cliente_vinculo: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cliente_vinculo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usina_geracao_mensal: {
        Row: {
          created_at: string | null
          disponibilidade_percent: number | null
          fator_capacidade_percent: number | null
          geracao_fora_ponta_kwh: number | null
          geracao_ponta_kwh: number | null
          geracao_reservado_kwh: number | null
          geracao_total_kwh: number
          id: string
          mes_ref: string
          observacoes: string | null
          updated_at: string | null
          usina_id: string
        }
        Insert: {
          created_at?: string | null
          disponibilidade_percent?: number | null
          fator_capacidade_percent?: number | null
          geracao_fora_ponta_kwh?: number | null
          geracao_ponta_kwh?: number | null
          geracao_reservado_kwh?: number | null
          geracao_total_kwh?: number
          id?: string
          mes_ref: string
          observacoes?: string | null
          updated_at?: string | null
          usina_id: string
        }
        Update: {
          created_at?: string | null
          disponibilidade_percent?: number | null
          fator_capacidade_percent?: number | null
          geracao_fora_ponta_kwh?: number | null
          geracao_ponta_kwh?: number | null
          geracao_reservado_kwh?: number | null
          geracao_total_kwh?: number
          id?: string
          mes_ref?: string
          observacoes?: string | null
          updated_at?: string | null
          usina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usina_geracao_mensal_usina_id_fkey"
            columns: ["usina_id"]
            isOneToOne: false
            referencedRelation: "usinas_remotas"
            referencedColumns: ["id"]
          },
        ]
      }
      usina_rateio_mensal: {
        Row: {
          created_at: string | null
          energia_alocada_kwh: number
          energia_fora_ponta_kwh: number | null
          energia_ponta_kwh: number | null
          energia_reservado_kwh: number | null
          geracao_id: string
          id: string
          percentual_aplicado: number
          status: string | null
          uc_beneficiaria_id: string
          updated_at: string | null
          valor_compensado_estimado_rs: number | null
          valor_fatura_usina_rs: number | null
          vinculo_id: string
        }
        Insert: {
          created_at?: string | null
          energia_alocada_kwh?: number
          energia_fora_ponta_kwh?: number | null
          energia_ponta_kwh?: number | null
          energia_reservado_kwh?: number | null
          geracao_id: string
          id?: string
          percentual_aplicado?: number
          status?: string | null
          uc_beneficiaria_id: string
          updated_at?: string | null
          valor_compensado_estimado_rs?: number | null
          valor_fatura_usina_rs?: number | null
          vinculo_id: string
        }
        Update: {
          created_at?: string | null
          energia_alocada_kwh?: number
          energia_fora_ponta_kwh?: number | null
          energia_ponta_kwh?: number | null
          energia_reservado_kwh?: number | null
          geracao_id?: string
          id?: string
          percentual_aplicado?: number
          status?: string | null
          uc_beneficiaria_id?: string
          updated_at?: string | null
          valor_compensado_estimado_rs?: number | null
          valor_fatura_usina_rs?: number | null
          vinculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usina_rateio_mensal_geracao_id_fkey"
            columns: ["geracao_id"]
            isOneToOne: false
            referencedRelation: "usina_geracao_mensal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usina_rateio_mensal_uc_beneficiaria_id_fkey"
            columns: ["uc_beneficiaria_id"]
            isOneToOne: false
            referencedRelation: "unidades_consumidoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usina_rateio_mensal_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "cliente_usina_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      usinas_remotas: {
        Row: {
          ativo: boolean
          classificacao_gd: string | null
          cnpj_titular: string
          created_at: string
          data_conexao: string | null
          data_protocolo_aneel: string | null
          distribuidora: string
          endereco: string | null
          fonte: Database["public"]["Enums"]["fonte_energia"]
          id: string
          modalidade_gd: Database["public"]["Enums"]["modalidade_gd"]
          nome: string
          numero_processo_aneel: string | null
          potencia_instalada_kw: number
          uc_geradora: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          classificacao_gd?: string | null
          cnpj_titular: string
          created_at?: string
          data_conexao?: string | null
          data_protocolo_aneel?: string | null
          distribuidora: string
          endereco?: string | null
          fonte?: Database["public"]["Enums"]["fonte_energia"]
          id?: string
          modalidade_gd?: Database["public"]["Enums"]["modalidade_gd"]
          nome: string
          numero_processo_aneel?: string | null
          potencia_instalada_kw?: number
          uc_geradora: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          classificacao_gd?: string | null
          cnpj_titular?: string
          created_at?: string
          data_conexao?: string | null
          data_protocolo_aneel?: string | null
          distribuidora?: string
          endereco?: string | null
          fonte?: Database["public"]["Enums"]["fonte_energia"]
          id?: string
          modalidade_gd?: Database["public"]["Enums"]["modalidade_gd"]
          nome?: string
          numero_processo_aneel?: string | null
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
      classificar_gd: { Args: { data_protocolo: string }; Returns: string }
      get_user_clientes: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      obter_percentual_fio_b: {
        Args: { ano_referencia: number }
        Returns: number
      }
      obter_tarifa_vigente: {
        Args: {
          p_concessionaria: string
          p_data_referencia?: string
          p_grupo_tarifario: string
          p_modalidade?: string
        }
        Returns: {
          ativo: boolean | null
          bandeira_amarela_rs_kwh: number | null
          bandeira_verde_rs_kwh: number | null
          bandeira_vermelha1_rs_kwh: number | null
          bandeira_vermelha2_rs_kwh: number | null
          cofins_percent: number | null
          concessionaria: string
          created_at: string
          demanda_fora_ponta_rs_kw: number | null
          demanda_geracao_rs_kw: number | null
          demanda_ponta_rs_kw: number | null
          demanda_ultrapassagem_rs_kw: number | null
          demanda_unica_rs_kw: number | null
          grupo_tarifario: string
          icms_percent: number | null
          id: string
          modalidade: string | null
          pis_percent: number | null
          resolucao_aneel: string | null
          subgrupo: string | null
          te_fora_ponta_rs_kwh: number | null
          te_ponta_rs_kwh: number | null
          te_reservado_rs_kwh: number | null
          te_unica_rs_kwh: number | null
          tusd_encargos_rs_kwh: number | null
          tusd_fio_a_rs_kwh: number | null
          tusd_fio_b_rs_kwh: number | null
          tusd_fora_ponta_rs_kwh: number | null
          tusd_ponta_rs_kwh: number | null
          tusd_reservado_rs_kwh: number | null
          tusd_unica_rs_kwh: number | null
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        SetofOptions: {
          from: "*"
          to: "tarifas_concessionaria"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "cliente"
      classificacao_gd: "gd1" | "gd2"
      fonte_energia: "solar" | "eolica" | "hidraulica" | "biomassa" | "outros"
      grupo_tarifario: "A" | "B"
      modalidade_economia: "ppa_tarifa" | "desconto_fatura_global"
      modalidade_gd:
        | "autoconsumo_remoto"
        | "geracao_compartilhada"
        | "consorcio"
        | "cooperativa"
      referencia_desconto: "valor_total" | "te_tusd" | "apenas_te"
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
      app_role: ["admin", "cliente"],
      classificacao_gd: ["gd1", "gd2"],
      fonte_energia: ["solar", "eolica", "hidraulica", "biomassa", "outros"],
      grupo_tarifario: ["A", "B"],
      modalidade_economia: ["ppa_tarifa", "desconto_fatura_global"],
      modalidade_gd: [
        "autoconsumo_remoto",
        "geracao_compartilhada",
        "consorcio",
        "cooperativa",
      ],
      referencia_desconto: ["valor_total", "te_tusd", "apenas_te"],
    },
  },
} as const
