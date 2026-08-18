const { buildN8nPayload } = require("./_n8n-payload");
const { buildWorkspaceSeed, buildWorkspaceColumns, clean } = require("./_workspace-defaults");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || process.env.ADMIN_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK;

function send(res, status, body) {
  res.status(status).json(body);
}

function getAdminCode(req) {
  const value = req.headers.authorization || req.headers.Authorization || "";
  if (!value.startsWith("Bearer ")) return "";
  return value.slice(7).trim();
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

async function findClienteByEmail(email) {
  const clientes = await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(email)}&select=*&limit=1`, {
    method: "GET"
  });

  return Array.isArray(clientes) ? clientes[0] : null;
}

async function updateCliente(email, updates) {
  const rows = await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(email)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(updates)
  });

  return Array.isArray(rows) ? rows[0] : null;
}

async function notifyN8n(payload) {
  if (!N8N_WEBHOOK_URL) return { sent: false, reason: "N8N_WEBHOOK_URL nao configurada" };

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    if (!response.ok) {
      return { sent: false, error: `Erro n8n ${response.status}: ${text}` };
    }

    return { sent: true };
  } catch (error) {
    return { sent: false, error: error.message || "Erro ao enviar para n8n." };
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

  if (!ADMIN_ACCESS_CODE) {
    send(res, 500, { error: "ADMIN_ACCESS_CODE ainda nao foi configurado na Vercel." });
    return;
  }

  if (getAdminCode(req) !== ADMIN_ACCESS_CODE) {
    send(res, 401, { error: "Codigo de admin invalido." });
    return;
  }

  try {
    const email = clean(req.body?.email).toLowerCase();

    if (!email) {
      send(res, 400, { error: "Informe o e-mail do cliente." });
      return;
    }

    const cliente = await findClienteByEmail(email);

    if (!cliente) {
      send(res, 404, { error: "Cliente nao encontrado." });
      return;
    }

    const seed = buildWorkspaceSeed({
      ...cliente,
      ai_workspace_status: req.body?.status || cliente.ai_workspace_status || "em_implantacao"
    });

    const updated = await updateCliente(email, buildWorkspaceColumns(cliente, seed));
    const payload = buildN8nPayload(updated || cliente, "workspace_cliente_criado");
    const n8n = await notifyN8n(payload);

    send(res, 200, {
      ok: true,
      cliente: updated,
      workspace: buildWorkspaceSeed(updated || cliente),
      n8n
    });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro ao criar central de IA." });
  }
};
