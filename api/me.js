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

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
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
    const email = String(user.email || "").trim().toLowerCase();

    const clientes = await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(email)}&select=*&limit=1`, {
      method: "GET"
    });

    if (!Array.isArray(clientes) || clientes.length === 0) {
      send(res, 404, { error: "Cadastro nao encontrado." });
      return;
    }

    send(res, 200, {
      ok: true,
      user: { email },
      cliente: clientes[0]
    });
  } catch (error) {
    send(res, 401, { error: error.message || "Erro ao carregar cliente." });
  }
};
