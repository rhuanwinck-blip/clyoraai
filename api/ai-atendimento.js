const { buildWorkspaceSeed, clean, valueOrFallback } = require("./_workspace-defaults");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_AGENT_MODEL = process.env.OPENAI_AGENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const CLYORA_AGENT_SECRET = process.env.CLYORA_AGENT_SECRET || process.env.N8N_AGENT_SECRET;

function send(res, status, body) {
  res.status(status).json(body);
}

function getBearerToken(req) {
  const value = req.headers.authorization || req.headers.Authorization || "";
  if (!value.startsWith("Bearer ")) return "";
  return value.slice(7).trim();
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

function limitText(value, max = 4000) {
  return clean(value).slice(0, max);
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || "Erro no Supabase.";
    throw new Error(message);
  }

  return data;
}

async function findCliente(body) {
  const email = clean(body.cliente_email || body.email).toLowerCase();
  const clienteId = clean(body.cliente_id);
  const phoneNumberId = clean(body.phone_number_id || body.meta_phone_number_id);

  let path = "";

  if (email) {
    path = `/rest/v1/clientes?email=eq.${encodeURIComponent(email)}&select=*&limit=1`;
  } else if (clienteId) {
    path = `/rest/v1/clientes?id=eq.${encodeURIComponent(clienteId)}&select=*&limit=1`;
  } else if (phoneNumberId) {
    path = `/rest/v1/clientes?select=*&or=(meta_whatsapp_phone_number_id.eq.${encodeURIComponent(phoneNumberId)},whatsapp_phone_number_id.eq.${encodeURIComponent(phoneNumberId)})&limit=1`;
  }

  if (!path) return null;

  const clientes = await supabaseRequest(path, { method: "GET" });
  return Array.isArray(clientes) ? clientes[0] : null;
}

async function getContactMemory(clienteEmail, contatoTelefone) {
  if (!clienteEmail || !contatoTelefone) return { data: null, error: null };

  try {
    const rows = await supabaseRequest(`/rest/v1/cliente_contatos_memoria?cliente_email=eq.${encodeURIComponent(clienteEmail)}&contato_telefone=eq.${encodeURIComponent(contatoTelefone)}&select=*&limit=1`, {
      method: "GET"
    });

    return { data: Array.isArray(rows) ? rows[0] : null, error: null };
  } catch (error) {
    return { data: null, error: error.message || "Memoria ainda nao configurada." };
  }
}

function shouldRouteHuman(message, cliente = {}) {
  const text = clean(message).toLowerCase();
  const humanWords = ["humano", "atendente", "reclamacao", "reclamação", "processo", "cancelar", "cancelamento", "problema", "urgente"];

  if (humanWords.some((word) => text.includes(word))) return true;

  const customRules = clean(cliente.quando_encaminhar).toLowerCase();
  if (!customRules) return false;

  return ["preco fora", "desconto", "juridico", "financeiro", "contrato"].some((word) => text.includes(word) && customRules.includes(word));
}

function buildFallbackReply(cliente = {}) {
  return `Recebemos sua mensagem. Vou confirmar as informacoes com a equipe da ${valueOrFallback(cliente.nome_empresa, "empresa")} e ja retorno com seguranca.`;
}

function buildInstructions(cliente, workspace, memoriaContato) {
  const handoff = workspace.handoff || {};

  return [
    `Voce atende clientes finais da empresa ${workspace.empresa}.`,
    "Atue como atendimento oficial da empresa, com linguagem humana, clara e profissional.",
    "Nao afirme ser o dono, fundador ou uma pessoa especifica. Fale em nome da empresa/equipe.",
    "Se perguntarem diretamente se voce e IA, responda com transparencia curta e siga ajudando.",
    "Use somente as informacoes da memoria da empresa, cadastro, produtos e historico abaixo. Nao invente preco, prazo, garantia, agenda ou politica.",
    "Se a pergunta estiver fora da memoria, peca um detalhe ou encaminhe para humano.",
    `Tom de voz: ${valueOrFallback(cliente.tom_voz, "profissional, prestativo e natural")}.`,
    `Encaminhar para humano quando: ${valueOrFallback(handoff.regras || cliente.quando_encaminhar)}.`,
    "Responda em portugues do Brasil. Nao use markdown. Nao use emojis. Seja direto e util."
  ].join("\n");
}

function buildInput(cliente, workspace, memoriaContato, body) {
  const contatoNome = valueOrFallback(body.contato_nome || body.nome_contato, "Cliente final");

  return [
    "Cadastro da empresa:",
    JSON.stringify({
      empresa: workspace.empresa,
      nicho: cliente.nicho,
      servicos: cliente.servicos,
      publico_alvo: cliente.publico_alvo,
      regiao: cliente.regiao_atendimento,
      produtos: [
        [cliente.produto_1_nome, cliente.produto_1_descricao, cliente.produto_1_valor].filter(Boolean).join(" - "),
        [cliente.produto_2_nome, cliente.produto_2_descricao, cliente.produto_2_valor].filter(Boolean).join(" - "),
        [cliente.produto_3_nome, cliente.produto_3_descricao, cliente.produto_3_valor].filter(Boolean).join(" - ")
      ].filter(Boolean)
    }, null, 2),
    "",
    "Memoria da empresa:",
    workspace.memory_empresa || "Nao informada.",
    "",
    "Memoria deste cliente final:",
    JSON.stringify({
      nome: contatoNome,
      telefone: body.contato_telefone || body.telefone,
      resumo: memoriaContato?.resumo || "Sem memoria anterior.",
      preferencias: memoriaContato?.preferencias || {},
      estagio: memoriaContato?.estagio || "novo"
    }, null, 2),
    "",
    "Mensagem recebida agora:",
    clean(body.mensagem || body.message || body.text)
  ].join("\n");
}

async function generateReply(cliente, workspace, memoriaContato, body) {
  const fallback = buildFallbackReply(cliente);

  if (!OPENAI_API_KEY) {
    return { resposta: fallback, source: "fallback", reason: "OPENAI_API_KEY nao configurada" };
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_AGENT_MODEL,
        instructions: buildInstructions(cliente, workspace, memoriaContato),
        input: buildInput(cliente, workspace, memoriaContato, body),
        max_output_tokens: 520
      })
    });

    const text = await response.text();
    const data = safeJsonParse(text);

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || `Erro OpenAI: ${response.status}`);
    }

    const resposta = limitText(extractResponseText(data), 1800);

    return {
      resposta: resposta || fallback,
      source: resposta ? "openai" : "fallback",
      model: OPENAI_AGENT_MODEL
    };
  } catch (error) {
    return { resposta: fallback, source: "fallback", error: error.message || "Erro ao gerar resposta." };
  }
}

async function saveContactMemory(cliente, body, resposta, needsHuman) {
  const clienteEmail = clean(cliente.email).toLowerCase();
  const contatoTelefone = clean(body.contato_telefone || body.telefone || body.from);

  if (!clienteEmail || !contatoTelefone) {
    return { saved: false, reason: "Telefone do cliente final nao informado." };
  }

  const now = new Date().toISOString();
  const existing = await getContactMemory(clienteEmail, contatoTelefone);
  const previous = clean(existing.data?.resumo);
  const mensagem = limitText(body.mensagem || body.message || body.text, 1200);
  const respostaCurta = limitText(resposta, 1200);
  const resumo = limitText([
    previous,
    `Ultima interacao em ${now}: cliente disse "${mensagem}". Atendimento respondeu "${respostaCurta}".`
  ].filter(Boolean).join("\n"), 5000);

  try {
    await supabaseRequest("/rest/v1/cliente_contatos_memoria", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        cliente_email: clienteEmail,
        contato_telefone: contatoTelefone,
        contato_nome: limitText(body.contato_nome || body.nome_contato, 180) || null,
        resumo,
        ultima_mensagem: mensagem,
        ultima_resposta: respostaCurta,
        ultimo_agente: needsHuman ? "qualidade_humano" : "atendimento_llm",
        ultima_interacao: now,
        atualizado_em: now
      })
    });

    return { saved: true, memory_error: existing.error || null };
  } catch (error) {
    return { saved: false, error: error.message || "Erro ao salvar memoria." };
  }
}

async function saveConversation(cliente, body, resposta, needsHuman) {
  const clienteEmail = clean(cliente.email).toLowerCase();
  const contatoTelefone = clean(body.contato_telefone || body.telefone || body.from);

  if (!clienteEmail || !contatoTelefone) return { saved: false };

  try {
    await supabaseRequest("/rest/v1/cliente_conversas", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        cliente_email: clienteEmail,
        contato_telefone: contatoTelefone,
        canal: clean(body.canal || "whatsapp"),
        direcao: "entrada_saida",
        mensagem: limitText(body.mensagem || body.message || body.text, 4000),
        resposta: limitText(resposta, 4000),
        agente: needsHuman ? "qualidade_humano" : "atendimento_llm",
        metadata: {
          precisa_humano: needsHuman,
          origem: body.origem || body.source || "n8n"
        }
      })
    });

    return { saved: true };
  } catch (error) {
    return { saved: false, error: error.message || "Erro ao salvar conversa." };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    send(res, 405, { error: "Metodo nao permitido." });
    return;
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    send(res, 500, { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada na Vercel." });
    return;
  }

  if (!CLYORA_AGENT_SECRET) {
    send(res, 500, { error: "CLYORA_AGENT_SECRET precisa ser configurado na Vercel antes de liberar o agente." });
    return;
  }

  if (getBearerToken(req) !== CLYORA_AGENT_SECRET) {
    send(res, 401, { error: "Acesso nao autorizado." });
    return;
  }

  try {
    const body = req.body || {};
    const mensagem = clean(body.mensagem || body.message || body.text);

    if (!mensagem) {
      send(res, 400, { error: "Mensagem nao informada." });
      return;
    }

    const cliente = await findCliente(body);

    if (!cliente) {
      send(res, 404, { error: "Empresa da Clyora nao encontrada para este atendimento." });
      return;
    }

    if (cliente.status !== "ativo") {
      send(res, 403, { error: "Empresa sem assinatura ativa." });
      return;
    }

    const workspace = buildWorkspaceSeed(cliente);
    const contatoTelefone = clean(body.contato_telefone || body.telefone || body.from);
    const memoriaContato = await getContactMemory(clean(cliente.email).toLowerCase(), contatoTelefone);
    const needsHuman = shouldRouteHuman(mensagem, cliente);
    const generated = await generateReply(cliente, workspace, memoriaContato.data, body);
    const memory = await saveContactMemory(cliente, body, generated.resposta, needsHuman);
    const conversation = await saveConversation(cliente, body, generated.resposta, needsHuman);

    send(res, 200, {
      ok: true,
      resposta: generated.resposta,
      precisa_humano: needsHuman,
      agente: needsHuman ? "qualidade_humano" : "atendimento_llm",
      source: generated.source,
      model: generated.model || null,
      cliente: {
        email: cliente.email,
        empresa: workspace.empresa,
        workspace: workspace.slug
      },
      memoria: memory,
      conversa: conversation,
      proxima_acao: needsHuman ? "encaminhar_para_humano" : "enviar_resposta_whatsapp"
    });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro no agente de atendimento." });
  }
};
