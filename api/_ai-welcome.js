const { buildClientWelcomeMessage } = require("./_n8n-payload");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_WELCOME_MODEL = process.env.OPENAI_WELCOME_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_MESSAGE_LENGTH = 900;

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function safeJsonParse(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return { raw: text };
  }
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();

  const parts = [];
  const output = Array.isArray(data?.output) ? data.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const part of content) {
      if (typeof part?.text === "string") parts.push(part.text);
      if (typeof part?.output_text === "string") parts.push(part.output_text);
    }
  }

  return parts.join("\n").trim();
}

function trimGeneratedMessage(text) {
  const message = clean(text)
    .replace(/^["'`]+/, "")
    .replace(/["'`]+$/, "")
    .trim();

  if (message.length <= MAX_MESSAGE_LENGTH) return message;
  return `${message.slice(0, MAX_MESSAGE_LENGTH - 3).trim()}...`;
}

function getFallbackMessage(cliente, payload) {
  return (
    clean(payload?.automacao?.mensagem_cliente_boas_vindas) ||
    buildClientWelcomeMessage(cliente || {}, payload?.automacao?.resumo || {})
  );
}

function buildContext(cliente, payload) {
  const resumo = payload?.automacao?.resumo || {};

  return {
    nome_responsavel: clean(cliente?.nome_responsavel || resumo.responsavel),
    empresa: clean(cliente?.nome_empresa || resumo.empresa),
    plano: clean(cliente?.plano || resumo.plano),
    nicho: clean(cliente?.nicho || resumo.nicho),
    tipo_atendimento: clean(cliente?.tipo_atendimento || resumo.atendimento),
    regiao_atendimento: clean(cliente?.regiao_atendimento || resumo.regiao),
    servicos: clean(cliente?.servicos || resumo.servicos),
    publico_alvo: clean(cliente?.publico_alvo || resumo.publico_alvo),
    tom_voz: clean(cliente?.tom_voz),
    pode_responder: clean(cliente?.pode_responder),
    nao_pode_responder: clean(cliente?.nao_pode_responder),
    quando_encaminhar: clean(cliente?.quando_encaminhar)
  };
}

function buildPrompt(cliente, payload) {
  const context = buildContext(cliente, payload);

  return [
    "Crie uma mensagem unica de boas-vindas para WhatsApp para um cliente que acabou de pagar e ativar a Clyora AI.",
    "A mensagem deve ser em portugues do Brasil, curta, humana, profissional e elegante.",
    "Use o nome do responsavel se existir. Use tambem a empresa, plano ou nicho quando fizer sentido.",
    "Nao use emojis. Nao use markdown. Nao prometa prazo exato. Nao invente beneficios, valores, links ou informacoes que nao estao nos dados.",
    "Deixe claro que o pagamento foi confirmado e que a implantacao da IA vai comecar.",
    "Finalize dizendo que, se precisar de algum detalhe, a equipe chama por esse WhatsApp.",
    "Responda somente com a mensagem final, sem explicacoes.",
    "",
    "Dados do cliente:",
    JSON.stringify(context, null, 2)
  ].join("\n");
}

async function generateClientWelcomeMessage(cliente, payload) {
  const fallback = getFallbackMessage(cliente, payload);

  if (!OPENAI_API_KEY) {
    return {
      message: fallback,
      source: "fallback",
      reason: "OPENAI_API_KEY nao configurada"
    };
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_WELCOME_MODEL,
        instructions: "Voce escreve mensagens comerciais de WhatsApp para clientes da Clyora AI. Seja natural, claro e confiavel.",
        input: buildPrompt(cliente, payload),
        max_output_tokens: 220
      })
    });

    const text = await response.text();
    const data = safeJsonParse(text);

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || `Erro OpenAI: ${response.status}`);
    }

    const generated = trimGeneratedMessage(extractResponseText(data));

    if (!generated) {
      return {
        message: fallback,
        source: "fallback",
        reason: "OpenAI retornou mensagem vazia"
      };
    }

    return {
      message: generated,
      source: "openai",
      model: OPENAI_WELCOME_MODEL
    };
  } catch (error) {
    return {
      message: fallback,
      source: "fallback",
      error: error.message || "Erro ao gerar mensagem com IA"
    };
  }
}

module.exports = { generateClientWelcomeMessage };
