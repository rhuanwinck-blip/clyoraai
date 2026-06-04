const SUPABASE_URL = process.env.SUPABASE_URL || "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function send(res, status, body) {
  res.status(status).json(body);
}

function cleanText(value) {
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

async function getClienteStatus(email) {
  const data = await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(email)}&select=status&limit=1`, {
    method: "GET"
  });

  return Array.isArray(data) && data.length > 0 ? data[0].status : null;
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

  const email = cleanText(req.body?.email).toLowerCase();
  const password = cleanText(req.body?.senha || req.body?.password);

  if (!email || !password) {
    send(res, 400, { error: "Informe email e senha." });
    return;
  }

  try {
    const status = await getClienteStatus(email);

    if (status !== "ativo") {
      send(res, 403, { error: "Seu acesso ainda nao foi liberado. Confirme o pagamento primeiro." });
      return;
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      send(res, 401, { error: "E-mail ou senha invalidos." });
      return;
    }

    send(res, 200, {
      ok: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user: {
        email: data.user?.email || email
      }
    });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro ao entrar." });
  }
};
