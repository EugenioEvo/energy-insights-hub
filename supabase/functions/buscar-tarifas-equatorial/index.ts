import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TarifaExtraida {
  subgrupo: string;
  modalidade: string;
  te_ponta: number | null;
  te_fora_ponta: number | null;
  te_unica: number | null;
  tusd_ponta: number | null;
  tusd_fora_ponta: number | null;
  tusd_unica: number | null;
  demanda_ponta: number | null;
  demanda_fora_ponta: number | null;
  demanda_unica: number | null;
  demanda_geracao: number | null;
  demanda_ultrapassagem: number | null;
}

interface PerplexityResponse {
  tarifas: TarifaExtraida[];
  resolucao_aneel: string;
  vigencia_inicio: string;
  fonte: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Buscando tarifas da Equatorial Goiás via Perplexity...");

    const prompt = `Busque as tarifas de energia elétrica vigentes da Equatorial Goiás no site oficial https://go.equatorialenergia.com.br/valor-de-tarifas-e-servicos/

Extraia TODAS as tarifas para os seguintes subgrupos:
- Grupo A: A1, A2, A3, A3a, A4, AS (Alta Tensão)
- Grupo B: B1-Residencial, B2-Rural, B3-Comercial (Baixa Tensão)

Para cada subgrupo, extraia:
1. TE (Tarifa de Energia) em R$/kWh - Ponta e Fora Ponta (ou única para Grupo B)
2. TUSD (Tarifa de Uso do Sistema de Distribuição) em R$/kWh - Ponta e Fora Ponta (ou única para Grupo B)
3. Demanda em R$/kW - Para modalidades Verde e Azul (Grupo A)
4. Demanda de Ultrapassagem em R$/kW
5. Demanda de Geração em R$/kW (se disponível)

Também extraia:
- Número da Resolução ANEEL vigente
- Data de início de vigência

IMPORTANTE: 
- Valores devem ser numéricos em R$ (não incluir o símbolo R$)
- Para Grupo B, use te_unica e tusd_unica ao invés de ponta/fora_ponta
- Se um valor não estiver disponível, use null

Retorne em formato JSON estruturado.`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em tarifas de energia elétrica do Brasil. Extraia dados precisos e estruturados das fontes oficiais. Sempre retorne JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        search_domain_filter: ["equatorialenergia.com.br", "aneel.gov.br"],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tarifas_equatorial",
            schema: {
              type: "object",
              properties: {
                tarifas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      subgrupo: { type: "string" },
                      modalidade: { type: "string" },
                      te_ponta: { type: ["number", "null"] },
                      te_fora_ponta: { type: ["number", "null"] },
                      te_unica: { type: ["number", "null"] },
                      tusd_ponta: { type: ["number", "null"] },
                      tusd_fora_ponta: { type: ["number", "null"] },
                      tusd_unica: { type: ["number", "null"] },
                      demanda_ponta: { type: ["number", "null"] },
                      demanda_fora_ponta: { type: ["number", "null"] },
                      demanda_unica: { type: ["number", "null"] },
                      demanda_geracao: { type: ["number", "null"] },
                      demanda_ultrapassagem: { type: ["number", "null"] }
                    },
                    required: ["subgrupo", "modalidade"]
                  }
                },
                resolucao_aneel: { type: "string" },
                vigencia_inicio: { type: "string" },
                fonte: { type: "string" }
              },
              required: ["tarifas", "resolucao_aneel", "vigencia_inicio"]
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro Perplexity:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Erro na API Perplexity: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta Perplexity recebida");

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da Perplexity");
    }

    let parsedData: PerplexityResponse;
    try {
      parsedData = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      console.error("Erro ao parsear JSON:", content);
      throw new Error("Resposta não é um JSON válido");
    }

    console.log(`Encontradas ${parsedData.tarifas.length} tarifas`);

    // Desativar tarifas antigas da Equatorial Goiás
    const { error: updateError } = await supabase
      .from("tarifas_concessionaria")
      .update({ ativo: false })
      .eq("concessionaria", "Equatorial Goiás");

    if (updateError) {
      console.error("Erro ao desativar tarifas antigas:", updateError);
    }

    // Inserir novas tarifas
    const tarifasParaInserir = parsedData.tarifas.map((t) => {
      const isGrupoA = t.subgrupo.startsWith("A");
      return {
        concessionaria: "Equatorial Goiás",
        grupo_tarifario: isGrupoA ? "A" : "B",
        subgrupo: t.subgrupo,
        modalidade: t.modalidade,
        te_ponta_rs_kwh: t.te_ponta,
        te_fora_ponta_rs_kwh: t.te_fora_ponta,
        te_unica_rs_kwh: t.te_unica,
        tusd_ponta_rs_kwh: t.tusd_ponta,
        tusd_fora_ponta_rs_kwh: t.tusd_fora_ponta,
        tusd_unica_rs_kwh: t.tusd_unica,
        demanda_ponta_rs_kw: t.demanda_ponta,
        demanda_fora_ponta_rs_kw: t.demanda_fora_ponta,
        demanda_unica_rs_kw: t.demanda_unica,
        demanda_geracao_rs_kw: t.demanda_geracao,
        demanda_ultrapassagem_rs_kw: t.demanda_ultrapassagem,
        resolucao_aneel: parsedData.resolucao_aneel,
        vigencia_inicio: parsedData.vigencia_inicio || new Date().toISOString().split("T")[0],
        ativo: true,
      };
    });

    const { data: insertedData, error: insertError } = await supabase
      .from("tarifas_concessionaria")
      .insert(tarifasParaInserir)
      .select();

    if (insertError) {
      console.error("Erro ao inserir tarifas:", insertError);
      throw new Error(`Erro ao salvar tarifas: ${insertError.message}`);
    }

    console.log(`${insertedData?.length} tarifas inseridas com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${insertedData?.length} tarifas atualizadas com sucesso`,
        resolucao: parsedData.resolucao_aneel,
        vigencia: parsedData.vigencia_inicio,
        fonte: parsedData.fonte || "Equatorial Goiás - Site Oficial",
        citations: data.citations || [],
        tarifas_count: insertedData?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
