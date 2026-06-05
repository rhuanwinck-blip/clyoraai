const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE || process.env.ADMIN_WHATSAPP_PHONE;
const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY || process.env.CALLMEBOT_API_KEY;

function getAdminMessage(payload) {
  return payload?.automacao?.mensagem_admin_whatsapp || "Novo cliente ativo na Clyora AI. Acesse o CRM para revisar os dados.";
}

async function sendAdminWhatsapp(payload) {
  if (!CALLMEBOT_PHONE || !CALLMEBOT_APIKEY) {
    return {
      sent: false,
      reason: "CALLMEBOT_PHONE e CALLMEBOT_APIKEY ainda nao configurados"
    };
  }

  const params = new URLSearchParams({
    phone: CALLMEBOT_PHONE,
    text: getAdminMessage(payload),
    apikey: CALLMEBOT_APIKEY
  });

  const response = await fetch(`https://api.callmebot.com/whatsapp.php?${params.toString()}`, {
    method: "GET"
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Erro ao enviar WhatsApp: ${response.status} ${text}`);
  }

  return {
    sent: true,
    provider: "callmebot",
    response: text.slice(0, 180)
  };
}

module.exports = { sendAdminWhatsapp };
