const { buildWorkspaceSeed, buildWorkspaceColumns, clean } = require("./_workspace-defaults");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function send(res, status, body) {
  res.status(status).json(body);
}

function getBearerToken(req) {
  const value = req.headers.authorization || req.headers.Authorization || "";
  if (!value.startsWith("Bearer ")) return "";
  return value.slice(7).trim();
}

function limitText(value, max = 8000) {
  return clean(value).slice(0, max);
}

function safeObject(value, fallback) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value;
  return fallback;
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

async function getUserFromToken(accessToken) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${accessToken}`
    }
  });

  const data = await response.json();

  if (!response.ok || !data?.email) {
    throw new Error("Sessao invalida ou expirada.");
  }

  return data;
}

async function findClienteByEmail(email) {
  const clientes = await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(email)}&select=*&limit=1`, {
    method: "GET"
  });

  return Array.isArray(clientes) ? clientes[0] : null;
}

async function updateClienteWorkspace(email, updates) {
  const rows = await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(email)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(updates)
  });

  return Array.isArray(rows) ? rows[0] : null;
}

function buildUpdatesFromBody(cliente, body = {}) {
  const current = buildWorkspaceSeed(cliente);
  const workspaceStatus = limitText(body.workspace_status || body.status || current.status, 80) || current.status;
  const agents = safeObject(body.agents, current.agents);
  const workflows = safeObject(body.workflows, current.workflows);
  const marketing = safeObject(body.marketing, current.marketing);
  const handoff = safeObject(body.handoff, current.handoff);

  return buildWorkspaceColumns(cliente, {
    status: workspaceStatus,
    n8n_url: limitText(body.n8n_url ?? current.n8n_url, 700),
    notes: limitText(body.notes ?? current.notes, 6000),
    memory_empresa: limitText(body.memory_empresa ?? current.memory_empresa, 14000),
    agents,
    workflows,
    marketing,
    handoff,
    whatsapp_status: limitText(body.whatsapp_status ?? current.whatsapp_status, 80),
    whatsapp_phone_number_id: limitText(body.whatsapp_phone_number_id ?? current.whatsapp_phone_number_id, 140),
    instagram_status: limitText(body.instagram_status ?? current.instagram_status, 80),
    instagram_business_id: limitText(body.instagram_business_id ?? current.instagram_business_id, 140)
  });
}

module.exports = async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method)) {
    send(res, 405, { error: "Metodo nao permitido." });
    return;
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    send(res, 500, { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada na Vercel." });
    return;
  }

  const accessToken = getBearerToken(req);

  if (!accessToken) {
    send(res, 401, { error: "Login necessario." });
    return;
  }

  try {
    const user = await getUserFromToken(accessToken);
    const email = clean(user.email).toLowerCase();
    const cliente = await findClienteByEmail(email);

    if (!cliente) {
      send(res, 404, { error: "Cadastro nao encontrado." });
      return;
    }

    if (req.method === "GET") {
      send(res, 200, {
        ok: true,
        user: { email },
        cliente,
        workspace: buildWorkspaceSeed(cliente)
      });
      return;
    }

    if (cliente.status !== "ativo") {
      send(res, 403, { error: "A central de IA so pode ser alterada com assinatura ativa." });
      return;
    }

    const updated = await updateClienteWorkspace(email, buildUpdatesFromBody(cliente, req.body || {}));

    send(res, 200, {
      ok: true,
      user: { email },
      cliente: updated,
      workspace: buildWorkspaceSeed(updated || cliente)
    });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro ao carregar central de IA." });
  }
};
