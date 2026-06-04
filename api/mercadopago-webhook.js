const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const MERCADO_PAGO_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

const PLAN_BY_ID = {
  "47cb3bbe00de45dea881d349b84fb30a": "mensal",
  "91e59597a6ee4289a4c661b434e206e3": "trimestral",
  "5f13c11db0fc45f384880c192410c93b": "semestral"
};

const ACTIVE_STATUSES = new Set(["authorized", "active"]);
const INACTIVE_STATUSES = new Set(["paused", "cancelled", "cancelled_process", "expired"]);

function send(res, status, body) {
  res.status(status).json(body);
}

function getHeader(req, name) {
  const value = req.headers[name] || req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function verifyMercadoPagoSignature(req, dataId) {
  if (!MERCADO_PAGO_WEBHOOK_SECRET) return true;

  const xSignature = getHeader(req, "x-signature");
  const xRequestId = getHeader(req, "x-request-id");

  if (!xSignature || !xRequestId || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    })
  );

  const ts = parts.ts;
  const receivedHash = parts.v1;

  if (!ts || !receivedHash) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = crypto
    .createHmac("sha256", MERCADO_PAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(receivedHash));
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

async function fetchSubscription(preapprovalId) {
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Erro ao consultar assinatura no Mercado Pago.");
  }

  return data;
}

async function findAuthUserByEmail(email) {
  if (!email) return null;

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

async function findAuthUserByReference(externalReference) {
  if (!externalReference) return null;

  for (let page = 1; page <= 10; page += 1) {
    const data = await supabaseRequest(`/auth/v1/admin/users?page=${page}&per_page=100`, {
      method: "GET"
    });

    const users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
    const found = users.find((user) => user.user_metadata?.external_reference === externalReference);

    if (found) return found;
    if (users.length < 100) return null;
  }

  return null;
}

async function markPreCadastroPaid(user, plano) {
  if (!user?.id) return;

  await supabaseRequest(`/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    body: JSON.stringify({
      user_metadata: {
        ...(user.user_metadata || {}),
        plano,
        pre_cadastro_status: "pago"
      }
    })
  });
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getEndDate(plano, startDate) {
  if (plano === "trimestral") return addMonths(startDate, 3);
  if (plano === "semestral") return addMonths(startDate, 6);
  return addMonths(startDate, 1);
}

async function updateClientByEmail(email, update) {
  await supabaseRequest(`/rest/v1/clientes?email=eq.${encodeURIComponent(email)}`, {
    method: "PATCH",
    body: JSON.stringify(update)
  });
}

async function updateClientByReference(externalReference, update) {
  await supabaseRequest(`/rest/v1/clientes?mercadopago_preapproval_id=eq.${encodeURIComponent(externalReference)}`, {
    method: "PATCH",
    body: JSON.stringify(update)
  });
}

function getEventDataId(req) {
  return req.query?.["data.id"] || req.query?.id || req.body?.data?.id || req.body?.id;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    send(res, 405, { error: "Metodo nao permitido." });
    return;
  }

  if (!SUPABASE_SERVICE_ROLE_KEY || !MERCADO_PAGO_ACCESS_TOKEN) {
    send(res, 500, { error: "Variaveis secretas ainda nao configuradas." });
    return;
  }

  const dataId = getEventDataId(req);
  const eventType = req.body?.type || req.body?.topic || req.query?.type || req.query?.topic;

  if (!verifyMercadoPagoSignature(req, dataId)) {
    send(res, 401, { error: "Assinatura do webhook invalida." });
    return;
  }

  if (!dataId || (eventType && eventType !== "subscription_preapproval")) {
    send(res, 200, { ok: true, ignored: true });
    return;
  }

  try {
    const subscription = await fetchSubscription(dataId);
    const payerEmail = String(subscription.payer_email || "").trim().toLowerCase();
    const externalReference = String(subscription.external_reference || "").trim();
    const planId = subscription.preapproval_plan_id;
    const plano = PLAN_BY_ID[planId] || null;
    const status = subscription.status;

    if (ACTIVE_STATUSES.has(status)) {
      const start = subscription.date_created ? new Date(subscription.date_created) : new Date();
      const end = getEndDate(plano, start);
      const authUser = (await findAuthUserByReference(externalReference)) || (await findAuthUserByEmail(payerEmail));
      const preCadastro = authUser?.user_metadata?.pre_cadastro || {};
      const cadastroEmail = String(preCadastro.email || payerEmail || "").trim().toLowerCase();
      const update = {
        ...preCadastro,
        email: cadastroEmail,
        status: "ativo",
        plano: plano || preCadastro.plano,
        mercadopago_preapproval_id: subscription.id,
        mercadopago_plan_id: planId,
        data_inicio: start.toISOString(),
        data_fim: end.toISOString(),
        pagamento_status: status,
        atualizado_em: new Date().toISOString()
      };

      if (externalReference) {
        await updateClientByReference(externalReference, update);
      } else if (cadastroEmail) {
        await updateClientByEmail(cadastroEmail, update);
      }

      await markPreCadastroPaid(authUser, plano || preCadastro.plano);

      send(res, 200, { ok: true, activated: true, email: cadastroEmail, payer_email: payerEmail, external_reference: externalReference, plano });
      return;
    }

    if (INACTIVE_STATUSES.has(status)) {
      const update = {
        status: "vencido",
        pagamento_status: status,
        atualizado_em: new Date().toISOString()
      };

      if (externalReference) {
        await updateClientByReference(externalReference, update);
      } else if (payerEmail) {
        await updateClientByEmail(payerEmail, update);
      }

      send(res, 200, { ok: true, deactivated: true, email: payerEmail, external_reference: externalReference });
      return;
    }

    const update = {
      pagamento_status: status,
      atualizado_em: new Date().toISOString()
    };

    if (externalReference) {
      await updateClientByReference(externalReference, update);
    } else if (payerEmail) {
      await updateClientByEmail(payerEmail, update);
    }

    send(res, 200, { ok: true, status, external_reference: externalReference });
  } catch (error) {
    send(res, 500, { error: error.message || "Erro ao processar webhook." });
  }
};
