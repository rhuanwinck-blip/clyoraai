const SUPABASE_URL = process.env.SUPABASE_URL || "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_PLANS = new Set(["mensal", "trimestral", "semestral"]);

function send(res, status, body) {
  res.status(status).json(body);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildClientPayload(input) {
  const plano = cleanText(input.plano);

  return {
    nome_empresa: cleanText(input.nome_empresa),
    nome_responsavel: cleanText(input.nome_responsavel),
    email: cleanText(input.email).toLowerCase(),
    whatsapp: cleanText(input.whatsapp),
    instagram: cleanText(input.instagram),
    nicho: cleanText(input.nicho),
    tipo_atendimento: cleanText(input.tipo_atendimento),
    regiao_atendimento: cleanText(input.regiao_atendimento),
    publico_alvo: cleanText(input.publico_alvo),
    servicos: cleanText(input.servicos),
    vende_produtos: cleanText(input.vende_produtos),
    produto_1_nome: cleanText(input.produto_1_nome),
    produto_1_descricao: cleanText(input.produto_1_descricao),
    produto_1_preco_tipo: cleanText(input.produto_1_preco_tipo),
    produto_1_valor: cleanText(input.produto_1_valor),
    produto_2_nome: cleanText(input.produto_2_nome),
    produto_2_descricao: cleanText(input.produto_2_descricao),
    produto_2_preco_tipo: cleanText(input.produto_2_preco_tipo),
    produto_2_valor: cleanText(input.produto_2_valor),
    produto_3_nome: cleanText(input.produto_3_nome),
    produto_3_descricao: cleanText(input.produto_3_descricao),
    produto_3_preco_tipo: cleanText(input.produto_3_preco_tipo),
    produto_3_valor: cleanText(input.produto_3_valor),
    pode_responder: cleanText(input.pode_responder),
    nao_pode_responder: cleanText(input.nao_pode_responder),
    quando_encaminhar: cleanText(input.quando_encaminhar),
    tom_voz: cleanText(input.tom_voz),
    marketing_opcao: cleanText(input.marketing_opcao),
    marketing_frequencia: cleanText(input.marketing_frequencia),
    marketing_frequencia_personalizada: cleanText(input.marketing_frequencia_personalizada),
    plano,
    status: "pendente",
    data_cadastro: new Date().toISOString()
  };
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

async function createAuthUser(email, password, metadata) {
  try {
    await supabaseRequest("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
      })
    });
  } catch (error) {
    const message = String(error.message || "").toLowerCase();
    if (!message.includes("already") && !message.includes("registered") && !message.includes("exists")) {
      throw error;
    }
  }
}

async function upsertClient(cliente) {
  const existing = await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(cliente.email)}&select=email&limit=1`, {
    method: "GET"
  });

  if (Array.isArray(existing) && existing.length > 0) {
    await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(cliente.email)}`, {
      method: "PATCH",
      body: JSON.stringify(cliente)
    });
    return;
  }

  await supabaseRequest("/rest/v1/clientes", {
    method: "POST",
    body: JSON.stringify(cliente)
  });
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

  const body = req.body || {};
  const email = cleanText(body.email).toLowerCase();
  const password = cleanText(body.senha_acesso);
  const plano = cleanText(body.plano);

  if (!email || !password || password.length < 6) {
    send(res, 400, { error: "Informe email e senha com pelo menos 6 caracteres." });
    return;
  }

  if (!ALLOWED_PLANS.has(plano)) {
    send(res, 400, { error: "Plano invalido." });
    return;
  }

  try {
    const cliente = buildClientPayload(body);

    await createAuthUser(email, password, {
      nome_empresa: cliente.nome_empresa,
      plano: cliente.plano
    });

    await upsertClient(cliente);

    send(res, 200, {
      ok: true,
      status: "pendente",
      message: "Cadastro pendente criado. Continue para o pagamento."
    });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro ao criar cadastro pendente." });
  }
};
