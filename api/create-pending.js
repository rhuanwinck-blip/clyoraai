const SUPABASE_URL = process.env.SUPABASE_URL || "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_PLANS = new Set(["mensal", "trimestral", "semestral"]);

function send(res, status, body) {
  res.status(status).json(body);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildLeadPayload(input) {
  return {
    nome_empresa: cleanText(input.nome_empresa),
    nome_responsavel: cleanText(input.nome_responsavel),
    email: cleanText(input.email).toLowerCase(),
    whatsapp: cleanText(input.whatsapp),
    plano: cleanText(input.plano),
    status: "pendente_pagamento",
    data_cadastro: new Date().toISOString(),
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
    const lead = buildLeadPayload(body);

    await createAuthUser(email, password, {
      nome_empresa: lead.nome_empresa,
      nome_responsavel: lead.nome_responsavel,
      plano: lead.plano
    });

    await upsertLead(lead);

    send(res, 200, {
      ok: true,
      status: "pendente_pagamento",
      message: "Lead salvo. Continue para o pagamento."
    });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro ao preparar pagamento." });
  }
};
