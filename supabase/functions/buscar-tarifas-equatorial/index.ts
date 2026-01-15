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

    const prompt = `Preciso das tarifas de energia elétrica da Equatorial Goiás (CELG-D) homologadas pela ANEEL, vigentes a partir de outubro/2025.

Busque os valores EXATOS em R$/kWh e R$/kW das seguintes tarifas:

GRUPO A (subgrupo A4, modalidade Verde):
- TE Ponta: valor em R$/kWh
- TE Fora Ponta: valor em R$/kWh  
- TUSD Ponta: valor em R$/kWh
- TUSD Fora Ponta: valor em R$/kWh
- Demanda: valor em R$/kW

GRUPO A (subgrupo A4, modalidade Azul):
- TE Ponta: valor em R$/kWh
- TE Fora Ponta: valor em R$/kWh
- TUSD Ponta: valor em R$/kWh
- TUSD Fora Ponta: valor em R$/kWh
- Demanda Ponta: valor em R$/kW
- Demanda Fora Ponta: valor em R$/kW

GRUPO B3 Comercial:
- TE: valor em R$/kWh
- TUSD: valor em R$/kWh

Informe a Resolução Homologatória ANEEL e data de vigência.
Os valores devem ser numéricos (ex: 0.45678), SEM impostos.`;

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
            content: "Você é um especialista em tarifas de energia elétrica do Brasil. Busque as tarifas mais recentes homologadas pela ANEEL. Retorne os dados em formato JSON estruturado."
          },
          {
            role: "user",
            content: prompt
          }
        ],
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

    // Parsear data brasileira para ISO
    const parseDate = (dateStr: string): string => {
      if (!dateStr) return new Date().toISOString().split("T")[0];
      
      // Tenta DD/MM/YYYY
      const brMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (brMatch) {
        const [, day, month, year] = brMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Tenta YYYY-MM-DD (já está no formato correto)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      
      return new Date().toISOString().split("T")[0];
    };

    const vigenciaISO = parseDate(parsedData.vigencia_inicio);
    console.log(`Vigência parseada: ${parsedData.vigencia_inicio} -> ${vigenciaISO}`);

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
        vigencia_inicio: vigenciaISO,
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
