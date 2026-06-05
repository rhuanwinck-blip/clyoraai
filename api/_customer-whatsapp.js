const { buildClientWelcomeMessage } = require("./_n8n-payload");

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

function hasZapiConfig() {
  return Boolean(ZAPI_INSTANCE_ID && ZAPI_TOKEN && ZAPI_CLIENT_TOKEN);
}

async function sendCustomerWelcomeWhatsapp(cliente, payload) {
  if (!hasZapiConfig()) {
    return {
      sent: false,
      reason: "ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN ainda nao configurados"
    };
  }

  const phone = normalizeBrazilPhone(cliente?.whatsapp || cliente?.telefone || cliente?.telefone_exibicao);

  if (!phone) {
    return {
      sent: false,
      reason: "Cliente sem WhatsApp valido"
    };
  }

  const message = payload?.automacao?.mensagem_cliente_boas_vindas || buildClientWelcomeMessage(cliente || {}, payload?.automacao?.resumo || {});
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
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Erro ao enviar WhatsApp para cliente: ${response.status} ${text}`);
  }

  return {
    sent: true,
    provider: "zapi",
    phone,
    messageId: data?.messageId || data?.id || null
  };
}

module.exports = { sendCustomerWelcomeWhatsapp };
