const { buildN8nPayload } = require("./_n8n-payload");

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

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
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
  const clientes = await supabaseRequest(`/rest/v1/clientes?select=*&email=eq.${encodeURIComponent(email)}&limit=1`, {
    method: "GET"
  });

  return Array.isArray(clientes) ? clientes[0] : null;
}

async function notifyN8n(cliente, event = "admin_reenvio_cliente") {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildN8nPayload(cliente, event))
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Erro ao enviar para n8n: ${response.status} ${text}`);
  }

  return { sent: true };
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

  if (!N8N_WEBHOOK_URL) {
    send(res, 500, { error: "N8N_WEBHOOK_URL ainda nao foi configurada na Vercel." });
    return;
  }

  if (getAdminCode(req) !== ADMIN_ACCESS_CODE) {
    send(res, 401, { error: "Codigo de admin invalido." });
    return;
  }

  try {
    const email = safeText(req.body?.email).toLowerCase();

    if (!email) {
      send(res, 400, { error: "Informe o e-mail do cliente." });
      return;
    }

    const cliente = await findClienteByEmail(email);

    if (!cliente) {
      send(res, 404, { error: "Cliente nao encontrado." });
      return;
    }

    const n8n = await notifyN8n(cliente);
    send(res, 200, { ok: true, email, n8n });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro ao enviar cliente para n8n." });
  }
};
