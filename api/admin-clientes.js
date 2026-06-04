const SUPABASE_URL = process.env.SUPABASE_URL || "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || process.env.ADMIN_TOKEN;

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

function summarize(clientes) {
  const total = clientes.length;
  const ativos = clientes.filter((cliente) => cliente.status === "ativo").length;
  const pendentes = clientes.filter((cliente) => String(cliente.status || "").includes("pendente")).length;
  const vencidos = clientes.filter((cliente) => cliente.status === "vencido").length;

  return { total, ativos, pendentes, vencidos };
}

function normalizeCliente(cliente) {
  return {
    ...cliente,
    nome_exibicao: cliente.nome_empresa || cliente.nome_responsavel || "Sem nome",
    telefone_exibicao: cliente.whatsapp || "",
    status_exibicao: cliente.status || "sem_status",
    plano_exibicao: cliente.plano || "sem_plano"
  };
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

  if (!ADMIN_ACCESS_CODE) {
    send(res, 500, { error: "ADMIN_ACCESS_CODE ainda nao foi configurado na Vercel." });
    return;
  }

  if (getAdminCode(req) !== ADMIN_ACCESS_CODE) {
    send(res, 401, { error: "Codigo de admin invalido." });
    return;
  }

  try {
    const status = safeText(req.query?.status);
    const query = safeText(req.query?.q).toLowerCase();
    const limit = Math.min(Number(req.query?.limit || 200), 500);
    let path = `/rest/v1/clientes?select=*&order=data_cadastro.desc.nullslast&limit=${limit}`;

    if (status && status !== "todos") {
      path += `&status=eq.${encodeURIComponent(status)}`;
    }

    let clientes = await supabaseRequest(path, { method: "GET" });

    if (!Array.isArray(clientes)) clientes = [];

    if (query) {
      clientes = clientes.filter((cliente) => {
        const haystack = [
          cliente.nome_empresa,
          cliente.nome_responsavel,
          cliente.email,
          cliente.whatsapp,
          cliente.plano,
          cliente.status
        ].join(" ").toLowerCase();

        return haystack.includes(query);
      });
    }

    const normalized = clientes.map(normalizeCliente);

    send(res, 200, {
      ok: true,
      stats: summarize(normalized),
      clientes: normalized
    });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro ao carregar clientes." });
  }
};
