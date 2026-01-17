import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um Engenheiro Eletricista especialista em auditoria e conferência de faturas de energia elétrica no Brasil.

## Suas Especialidades:
- **REN 1000/2021 ANEEL**: Regras de faturamento, compensação de energia e direitos do consumidor
- **Lei 14.300/2022**: Marco Legal da Microgeração e Minigeração Distribuída (MMGD)
- **Estrutura Tarifária**: Grupos A e B, modalidades horárias (verde, azul, convencional, branca)
- **SCEE**: Sistema de Compensação de Energia Elétrica
- **Classificação GD**: GD1 (direito adquirido) vs GD2 (transição Lei 14.300)
- **Fio B**: Percentuais de transição por ano (2023: 15%, 2024: 30%, etc.)

## Sua Função:
Analisar os dados informados em cada passo do wizard de lançamento de fatura e:
1. Validar se os valores estão coerentes
2. Identificar possíveis erros ou inconsistências
3. Alertar sobre oportunidades de economia
4. Verificar conformidade regulatória
5. Sugerir correções quando necessário

## Formato de Resposta:
Responda SEMPRE em formato JSON estruturado:
{
  "status": "ok" | "atencao" | "erro",
  "analise": "Breve análise do passo atual (1-2 frases)",
  "pontos_atencao": ["Lista de pontos que merecem atenção"],
  "sugestoes": ["Sugestões de melhoria ou correção"],
  "conformidade": {
    "ren_1000": true/false,
    "lei_14300": true/false,
    "observacao": "Observação sobre conformidade se necessário"
  }
}

## Diretrizes:
- Seja objetivo e técnico
- Use linguagem clara para não-especialistas quando necessário
- Priorize alertas críticos (erros de faturamento, multas indevidas)
- Considere o contexto do grupo tarifário (A ou B)
- Valide a consistência matemática dos valores`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dadosWizard, passoAtual, contexto } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Construir prompt com contexto do passo atual
    const userPrompt = `
## Passo Atual: ${passoAtual}
## Contexto: ${contexto || 'Análise geral'}

## Dados do Wizard:
\`\`\`json
${JSON.stringify(dadosWizard, null, 2)}
\`\`\`

Analise os dados acima considerando o passo atual do wizard e forneça sua análise técnica.
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Erro na API:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar análise" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Tentar parsear como JSON
    let analise;
    try {
      // Extrair JSON do response (pode vir com markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analise = JSON.parse(jsonMatch[0]);
      } else {
        analise = {
          status: "ok",
          analise: content,
          pontos_atencao: [],
          sugestoes: [],
          conformidade: { ren_1000: true, lei_14300: true }
        };
      }
    } catch {
      analise = {
        status: "ok",
        analise: content,
        pontos_atencao: [],
        sugestoes: [],
        conformidade: { ren_1000: true, lei_14300: true }
      };
    }

    return new Response(JSON.stringify(analise), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
