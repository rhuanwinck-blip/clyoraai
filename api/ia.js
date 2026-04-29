export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { mensagem } = req.body;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é um atendente profissional de empresas. Responda de forma clara, objetiva e segura."
        },
        {
          role: "user",
          content: mensagem
        }
      ]
    })
  });

  const data = await response.json();

  res.status(200).json({
    resposta: data.choices[0].message.content
  });
}