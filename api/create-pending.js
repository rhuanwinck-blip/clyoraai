const SUPABASE_URL = process.env.SUPABASE_URL || "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const SITE_URL = process.env.SITE_URL || "https://clyoraai.vercel.app";

const PLAN_IDS = {
  mensal: "47cb3bbe00de45dea881d349b84fb30a",
  trimestral: "91e59597a6ee4289a4c661b434e206e3",
  semestral: "5f13c11db0fc45f384880c192410c93b"
};

const PLAN_REASONS = {
  mensal: "Clyora AI - Plano Mensal",
  trimestral: "Clyora AI - Plano Trimestral",
  semestral: "Clyora AI - Plano Semestral"
};

const ALLOWED_PLANS = new Set(Object.keys(PLAN_IDS));

const EMPTY_DETAILS = {
  instagram: "",
  nicho: "",
  tipo_atendimento: "",
  regiao_atendimento: "",
  publico_alvo: "",
  servicos: "",
  vende_produtos: "",
  produto_1_nome: "",
  produto_1_descricao: "",
  produto_1_preco_tipo: "",
  produto_1_valor: "",
  produto_2_nome: "",
  produto_2_descricao: "",
  produto_2_preco_tipo: "",
  produto_2_valor: "",
  produto_3_nome: "",
  produto_3_descricao: "",
  produto_3_preco_tipo: "",
  produto_3_valor: "",
  pode_responder: "",
  nao_pode_responder: "",
  quando_encaminhar: "",
  tom_voz: "",
  marketing_opcao: "",
  marketing_frequencia: "",
  marketing_frequencia_personalizada: ""
};

function send(res, status, body) {
  res.status(status).json(body);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createReference() {
  return `clyora_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildFullCadastro(input, externalReference) {
  const plano = cleanText(input.plano);

  return {
    external_reference: externalReference,
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
    data_cadastro: new Date().toISOString()
  };
}

function buildLeadPayload(cadastro) {
  return {
    ...EMPTY_DETAILS,
    nome_empresa: cadastro.nome_empresa,
    nome_responsavel: cadastro.nome_responsavel,
    email: cadastro.email,
    whatsapp: cadastro.whatsapp,
    plano: cadastro.plano,
    status: "pendente_pagamento",
    data_cadastro: cadastro.data_cadastro,
    mercadopago_preapproval_id: cadastro.external_reference,
    pagamento_status: "aguardando_pagamento",
    atualizado_em: new Date().toISOString()
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

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 10; page += 1) {
    const data = await supabaseRequest(`/auth/v1/admin/users?page=${page}&per_page=100`, {
      method: "GET"
    });

    const users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
    const found = users.find((user) => String(user.email || "").toLowerCase() === email);

    if (found) return found;
    if (users.length < 100) return null;
  }

  return null;
}

async function createOrUpdateAuthUser(email, password, cadastro) {
  const userMetadata = {
    nome_empresa: cadastro.nome_empresa,
    nome_responsavel: cadastro.nome_responsavel,
    plano: cadastro.plano,
    external_reference: cadastro.external_reference,
    pre_cadastro_status: "aguardando_pagamento",
    pre_cadastro: cadastro
  };

  try {
    await supabaseRequest("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata
      })
    });
  } catch (error) {
    const message = String(error.message || "").toLowerCase();
    if (!message.includes("already") && !message.includes("registered") && !message.includes("exists")) {
      throw error;
    }

    const existingUser = await findAuthUserByEmail(email);
    if (!existingUser?.id) return;

    await supabaseRequest(`/auth/v1/admin/users/${existingUser.id}`, {
      method: "PUT",
      body: JSON.stringify({
        password,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          ...userMetadata
        }
      })
    });
  }
}

async function upsertLead(lead) {
  const existing = await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(lead.email)}&select=email&limit=1`, {
    method: "GET"
  });

  if (Array.isArray(existing) && existing.length > 0) {
    await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(lead.email)}`, {
      method: "PATCH",
      body: JSON.stringify(lead)
    });
    return;
  }

  await supabaseRequest("/rest/v1/clientes", {
    method: "POST",
    body: JSON.stringify(lead)
  });
}

async function createMercadoPagoCheckout(cadastro) {
  const response = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      preapproval_plan_id: PLAN_IDS[cadastro.plano],
      reason: PLAN_REASONS[cadastro.plano],
      payer_email: cadastro.email,
      external_reference: cadastro.external_reference,
      back_url: `${SITE_URL}/pagamento-sucesso.html?ref=${encodeURIComponent(cadastro.external_reference)}`
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Erro ao criar checkout no Mercado Pago.");
  }

  return data.init_point || data.sandbox_init_point;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    send(res, 405, { error: "Metodo nao permitido." });
    return;
  }

  if (!SUPABASE_SERVICE_ROLE_KEY || !MERCADO_PAGO_ACCESS_TOKEN) {
    send(res, 500, { error: "Variaveis secretas ainda nao configuradas na Vercel." });
    return;
  }

  const body = req.body || {};
  const email = cleanText(body.email).toLowerCase();
  const password = cleanText(body.senha_acesso);
  const plano = cleanText(body.plano);
  const nome = cleanText(body.nome_responsavel) || cleanText(body.nome_empresa);
  const whatsapp = cleanText(body.whatsapp);

  if (!email || !password || password.length < 6) {
    send(res, 400, { error: "Informe email e senha com pelo menos 6 caracteres." });
    return;
  }

  if (!nome || !whatsapp) {
    send(res, 400, { error: "Informe nome e telefone para continuar." });
    return;
  }

  if (!ALLOWED_PLANS.has(plano)) {
    send(res, 400, { error: "Plano invalido." });
    return;
  }

  try {
    const externalReference = createReference();
    const cadastroCompleto = buildFullCadastro(body, externalReference);
    const lead = buildLeadPayload(cadastroCompleto);

    await createOrUpdateAuthUser(email, password, cadastroCompleto);
    await upsertLead(lead);

    const checkoutUrl = await createMercadoPagoCheckout(cadastroCompleto);

    send(res, 200, {
      ok: true,
      status: "pendente_pagamento",
      external_reference: externalReference,
      checkout_url: checkoutUrl,
      message: "Lead salvo. Continue para o pagamento."
    });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro ao preparar pagamento." });
  }
};
