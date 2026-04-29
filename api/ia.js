export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { mensagem } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é uma IA de atendimento que ajuda empresas a vender mais."
          },
          {
            role: "user",
            content: mensagem
          }
        ]
      })
    });

    // 🔥 AQUI É O DIFERENCIAL (EVITA ERRO 500)
    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "Resposta não é JSON",
        detalhe: text
      });
    }

    if (!data.choices) {
      return res.status(500).json({
        error: "Erro na OpenAI",
        detalhe: data
      });
    }

    return res.status(200).json({
      resposta: data.choices[0].message.content
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erro interno",
      detalhe: error.message
    });
  }
}