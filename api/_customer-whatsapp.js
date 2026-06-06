const { buildClientWelcomeMessage } = require("./_n8n-payload");

const WHATSAPP_PROVIDER = String(process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v25.0";
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const META_WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeBrazilPhone(value) {
  const digits = onlyDigits(value);

  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
}

function safeJsonParse(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return { raw: text };
  }
}

function hasMetaConfig() {
  return Boolean(META_WHATSAPP_ACCESS_TOKEN && META_WHATSAPP_PHONE_NUMBER_ID);
}

function hasZapiConfig() {
  return Boolean(ZAPI_INSTANCE_ID && ZAPI_TOKEN && ZAPI_CLIENT_TOKEN);
}

function getWelcomeMessage(cliente, payload) {
  return (
    payload?.automacao?.mensagem_cliente_boas_vindas ||
    buildClientWelcomeMessage(cliente || {}, payload?.automacao?.resumo || {})
  );
}

function getClientPhone(cliente) {
  return normalizeBrazilPhone(cliente?.whatsapp || cliente?.telefone || cliente?.telefone_exibicao);
}

function shouldUseMeta() {
  if (WHATSAPP_PROVIDER === "meta") return true;
  if (WHATSAPP_PROVIDER === "zapi") return false;
  return hasMetaConfig();
}

async function sendViaMeta(cliente, payload) {
  if (!hasMetaConfig()) {
    return {
      sent: false,
      provider: "meta",
      reason: "META_WHATSAPP_ACCESS_TOKEN e META_WHATSAPP_PHONE_NUMBER_ID ainda nao configurados"
    };
  }

  const phone = getClientPhone(cliente);

  if (!phone) {
    return {
      sent: false,
      provider: "meta",
      reason: "Cliente sem WhatsApp valido"
    };
  }

  const message = getWelcomeMessage(cliente, payload);
  const response = await fetch(`https://graph.facebook.com/${encodeURIComponent(META_GRAPH_VERSION)}/${encodeURIComponent(META_WHATSAPP_PHONE_NUMBER_ID)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "text",
      text: {
        preview_url: false,
        body: message
      }
    })
  });

  const text = await response.text();
  const data = safeJsonParse(text);

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || data?.error || `Erro ao enviar WhatsApp pela Meta: ${response.status} ${text}`);
  }

  return {
    sent: true,
    provider: "meta",
    phone,
    messageId: data?.messages?.[0]?.id || data?.messageId || null,
    message_source: payload?.automacao?.mensagem_cliente_origem || "payload"
  };
}

async function sendViaZapi(cliente, payload) {
  if (!hasZapiConfig()) {
    return {
      sent: false,
      provider: "zapi",
      reason: "ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN ainda nao configurados"
    };
  }

  const phone = getClientPhone(cliente);

  if (!phone) {
    return {
      sent: false,
      provider: "zapi",
      reason: "Cliente sem WhatsApp valido"
    };
  }

  const message = getWelcomeMessage(cliente, payload);
  const response = await fetch(`https://api.z-api.io/instances/${encodeURIComponent(ZAPI_INSTANCE_ID)}/token/${encodeURIComponent(ZAPI_TOKEN)}/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN
    },
    body: JSON.stringify({
      phone,
      message,
      delayTyping: 3
    })
  });

  const text = await response.text();
  const data = safeJsonParse(text);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Erro ao enviar WhatsApp pela Z-API: ${response.status} ${text}`);
  }

  return {
    sent: true,
    provider: "zapi",
    phone,
    messageId: data?.messageId || data?.id || null,
    message_source: payload?.automacao?.mensagem_cliente_origem || "payload"
  };
}

async function sendCustomerWelcomeWhatsapp(cliente, payload) {
  if (shouldUseMeta()) {
    return sendViaMeta(cliente, payload);
  }

  return sendViaZapi(cliente, payload);
}

module.exports = { sendCustomerWelcomeWhatsapp };
