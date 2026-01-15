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
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("=== INICIANDO BUSCA DE TARIFAS ===");
    console.log(`Firecrawl disponível: ${!!FIRECRAWL_API_KEY}`);

    let extractedContent = "";
    let pdfLinks: string[] = [];
    let fontes = {
      firecrawl_usado: false,
      equatorial_page: false,
      pdfs_encontrados: 0,
      aneel_content: false,
    };

    // PASSO 1: Usar Firecrawl para extrair dados (se disponível)
    if (FIRECRAWL_API_KEY) {
      fontes.firecrawl_usado = true;
      
      // 1a. Scrape da página principal de tarifas da Equatorial
      console.log("Firecrawl: Fazendo scrape da página de tarifas Equatorial...");
      try {
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: "https://go.equatorialenergia.com.br/valor-de-tarifas-e-servicos/",
            formats: ["markdown", "links"],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        const scrapeData = await scrapeResponse.json();
        
        if (scrapeData.success && scrapeData.data?.markdown) {
          extractedContent += `\n\n=== PÁGINA EQUATORIAL GOIÁS ===\n${scrapeData.data.markdown}`;
          fontes.equatorial_page = true;
          console.log(`Conteúdo Equatorial extraído: ${scrapeData.data.markdown.length} chars`);
          
          // Buscar links de PDFs
          const allLinks = scrapeData.data?.links || [];
          pdfLinks = allLinks.filter((link: string) => 
            link.toLowerCase().includes(".pdf") && 
            (link.toLowerCase().includes("tarif") || 
             link.toLowerCase().includes("resoluc") ||
             link.toLowerCase().includes("energia"))
          );
          fontes.pdfs_encontrados = pdfLinks.length;
          console.log(`PDFs encontrados: ${pdfLinks.length}`);
        }
      } catch (e) {
        console.error("Erro ao fazer scrape Equatorial:", e);
      }

      // 1b. Tentar extrair conteúdo dos PDFs encontrados
      for (const pdfUrl of pdfLinks.slice(0, 2)) {
        console.log(`Firecrawl: Extraindo PDF: ${pdfUrl.substring(0, 60)}...`);
        try {
          const pdfScrape = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: pdfUrl,
              formats: ["markdown"],
            }),
          });
          
          const pdfData = await pdfScrape.json();
          if (pdfData.success && pdfData.data?.markdown) {
            extractedContent += `\n\n=== PDF: ${pdfUrl.split('/').pop()} ===\n${pdfData.data.markdown}`;
            console.log(`PDF extraído: ${pdfData.data.markdown.length} chars`);
          }
        } catch (e) {
          console.log(`Erro ao extrair PDF: ${e}`);
        }
      }

      // 1c. Buscar dados abertos da ANEEL
      console.log("Firecrawl: Buscando dados ANEEL...");
      try {
        const aneelResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: "https://portalrelatorios.aneel.gov.br/luznatarifa/tarifas",
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: 5000,
          }),
        });

        const aneelData = await aneelResponse.json();
        if (aneelData.success && aneelData.data?.markdown) {
          extractedContent += `\n\n=== ANEEL - LUZ NA TARIFA ===\n${aneelData.data.markdown}`;
          fontes.aneel_content = true;
          console.log(`Conteúdo ANEEL extraído: ${aneelData.data.markdown.length} chars`);
        }
      } catch (e) {
        console.error("Erro ao buscar ANEEL:", e);
      }
    }

    // PASSO 2: Usar Perplexity para analisar o conteúdo e/ou buscar informações
    console.log("Analisando dados com Perplexity...");
    
    const basePrompt = `Preciso das tarifas de energia elétrica da Equatorial Goiás (CELG-D) homologadas pela ANEEL.

${extractedContent ? `CONTEÚDO EXTRAÍDO DAS FONTES OFICIAIS:\n${extractedContent.substring(0, 20000)}\n\n` : ""}

Com base no conteúdo acima E em sua pesquisa na web, extraia os valores EXATOS das tarifas vigentes:

GRUPO A (Alta Tensão) - subgrupos A1, A2, A3, A3a, A4, AS:
- Para modalidade Verde: TE Ponta, TE Fora Ponta, TUSD Ponta, TUSD Fora Ponta, Demanda única
- Para modalidade Azul: TE Ponta, TE Fora Ponta, TUSD Ponta, TUSD Fora Ponta, Demanda Ponta, Demanda Fora Ponta

GRUPO B (Baixa Tensão) - subgrupos B1-Residencial, B2-Rural, B3-Comercial:
- TE única e TUSD única

Valores em R$/kWh e R$/kW (formato numérico: 0.xxxxx), SEM impostos.
Informe a Resolução Homologatória ANEEL e data de início de vigência.`;

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
            content: "Você é um especialista em tarifas de energia elétrica do Brasil. Analise o conteúdo fornecido e complemente com pesquisa web para obter os valores mais recentes. Retorne JSON estruturado."
          },
          {
            role: "user",
            content: basePrompt
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
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos.", success: false }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Desativar tarifas antigas
    const { error: updateError } = await supabase
      .from("tarifas_concessionaria")
      .update({ ativo: false })
      .eq("concessionaria", "Equatorial GO");

    if (updateError) {
      console.error("Erro ao desativar tarifas antigas:", updateError);
    }

    // Parsear data
    const parseDate = (dateStr: string): string => {
      if (!dateStr) return new Date().toISOString().split("T")[0];
      const brMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (brMatch) {
        const [, day, month, year] = brMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
      return new Date().toISOString().split("T")[0];
    };

    const vigenciaISO = parseDate(parsedData.vigencia_inicio);
    console.log(`Vigência: ${parsedData.vigencia_inicio} -> ${vigenciaISO}`);

    // Inserir novas tarifas
    const tarifasParaInserir = parsedData.tarifas.map((t) => {
      const isGrupoA = t.subgrupo.startsWith("A");
      return {
        concessionaria: "Equatorial GO",
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
        fonte: parsedData.fonte || "Equatorial GO - ANEEL",
        citations: data.citations || [],
        tarifas_count: insertedData?.length || 0,
        fontes_utilizadas: fontes,
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
