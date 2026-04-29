export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const event = req.body;

  if (event.type === "checkout.session.completed") {
    const clienteEmail = event.data.object.customer_email;

    console.log("Pagamento confirmado:", clienteEmail);

    // Aqui depois vamos liberar automaticamente:
    // - acesso ao dashboard
    // - status da assinatura
    // - IA ativa
    // - conexão com WhatsApp/Instagram
  }

  return res.status(200).json({ received: true });
}