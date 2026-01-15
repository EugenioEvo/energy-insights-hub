import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt para extração de dados de faturas de energia
const PROMPT_FATURA = `Você é um especialista em faturas de energia elétrica brasileiras.
Analise o PDF da fatura e extraia TODOS os campos disponíveis em formato JSON.

IMPORTANTE:
- Extraia os valores numéricos SEM símbolos (R$, kWh, kW, %)
- Datas no formato YYYY-MM-DD
- Mês de referência no formato YYYY-MM
- Se um campo não estiver presente, use null
- Identifique se é Grupo A (alta tensão) ou Grupo B (baixa tensão)

CAMPOS A EXTRAIR:

1. IDENTIFICAÇÃO:
- uc_numero: número da unidade consumidora
- mes_ref: mês de referência (YYYY-MM)
- grupo_tarifario: "A" ou "B"
- modalidade: "THS_VERDE", "THS_AZUL", "CONVENCIONAL", "BRANCA"
- classe_tarifaria: ex "A4", "B3"
- concessionaria: nome da distribuidora

2. CABEÇALHO:
- data_emissao, data_apresentacao, vencimento (YYYY-MM-DD)
- leitura_anterior, leitura_atual (YYYY-MM-DD)
- dias_faturados
- proxima_leitura (YYYY-MM-DD)
- valor_total_pagar

3. CONSUMO (kWh):
- consumo_ponta_kwh (horário de pico, geralmente 18h-21h)
- consumo_fora_ponta_kwh (fora do horário de pico)
- consumo_reservado_kwh (horário reservado, madrugada)
- consumo_total_kwh

4. DEMANDA (apenas Grupo A, em kW):
- demanda_contratada_kw
- demanda_medida_kw
- demanda_ultrapassagem_kw
- valor_demanda_rs
- valor_demanda_ultrapassagem_rs

5. GERAÇÃO DISTRIBUÍDA / SCEE (se aplicável):
- geracao_local_total_kwh
- autoconsumo_ponta_kwh, autoconsumo_fp_kwh, autoconsumo_hr_kwh, autoconsumo_total_kwh
- injecao_ponta_kwh, injecao_fp_kwh, injecao_hr_kwh, injecao_total_kwh
- scee_credito_recebido_kwh
- scee_saldo_kwh_p, scee_saldo_kwh_fp, scee_saldo_kwh_hr
- scee_saldo_expirar_30d_kwh, scee_saldo_expirar_60d_kwh

6. COMPONENTES DA FATURA (em R$):
- bandeira: "verde", "amarela", "vermelha1", "vermelha2"
- bandeira_te_p_rs, bandeira_te_fp_rs, bandeira_te_hr_rs
- nao_compensado_tusd_p_rs, nao_compensado_tusd_fp_rs, nao_compensado_tusd_hr_rs
- nao_compensado_te_p_rs, nao_compensado_te_fp_rs, nao_compensado_te_hr_rs
- ufer_fp_kvarh, ufer_fp_rs
- cip_rs (contribuição iluminação pública)

7. TRIBUTOS:
- base_pis_cofins_rs
- pis_aliquota_percent, pis_rs
- cofins_aliquota_percent, cofins_rs
- base_icms_rs
- icms_aliquota_percent, icms_rs

Retorne APENAS o JSON, sem explicações adicionais.`;

// Prompt para extração de dados de CSV de geração
const PROMPT_CSV_GERACAO = `Você é um especialista em dados de geração de energia solar.
Analise o CSV de geração do inversor e extraia os dados agregados.

Formatos comuns: Fronius, Growatt, Sungrow, Huawei, Canadian Solar, Deye.

CAMPOS A EXTRAIR:
- geracao_total_kwh: soma total de geração no período
- data_inicio: primeira data do período (YYYY-MM-DD)
- data_fim: última data do período (YYYY-MM-DD)
- mes_ref: mês de referência se identificável (YYYY-MM)

Se o CSV tiver dados por hora, calcule a distribuição por posto horário (dias úteis):
- geracao_ponta_kwh: 18h-21h em dias úteis
- geracao_fora_ponta_kwh: demais horários

Se não for possível separar, retorne apenas geracao_total_kwh.

Retorne APENAS o JSON, sem explicações adicionais.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, fileName } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Conteúdo não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ success: false, error: 'Chave de API não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let messages: any[];
    
    if (type === 'pdf') {
      // Para PDF, enviar como documento multimodal para o Gemini
      console.log('Processando PDF com Gemini (multimodal)...');
      
      messages = [
        { role: 'system', content: PROMPT_FATURA },
        { 
          role: 'user', 
          content: [
            {
              type: 'text',
              text: `Analise este PDF de fatura de energia (arquivo: ${fileName || 'fatura.pdf'}) e extraia os dados conforme solicitado.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${content}`
              }
            }
          ]
        }
      ];
    } else {
      // Para CSV, enviar como texto
      console.log('Processando CSV...');
      
      messages = [
        { role: 'system', content: PROMPT_CSV_GERACAO },
        { 
          role: 'user', 
          content: `Analise este CSV de geração solar (arquivo: ${fileName || 'geração.csv'}):\n\n${content}`
        }
      ];
    }

    console.log('Enviando para Lovable AI...');

    // Usar Lovable AI (Gemini) para interpretar o conteúdo
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Flash para melhor suporte multimodal
        messages,
        temperature: 0.1, // Baixa temperatura para respostas mais precisas
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro AI:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes. Adicione créditos em Settings.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar com IA', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      console.error('IA não retornou conteúdo');
      return new Response(
        JSON.stringify({ success: false, error: 'IA não retornou dados' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resposta da IA recebida:', aiContent.substring(0, 300));

    // Tentar parsear JSON da resposta
    let parsedData;
    try {
      // Remover possíveis marcadores de código
      let jsonStr = aiContent.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();
      
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      console.error('Conteúdo recebido:', aiContent);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao interpretar resposta da IA. Tente novamente.',
          rawContent: aiContent 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Dados extraídos com sucesso');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: parsedData,
        type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
