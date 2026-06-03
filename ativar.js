const mensagem = document.getElementById("ativarMensagem");
const dadosSalvos = localStorage.getItem("clyora_dados_cliente");

if (mensagem && dadosSalvos) {
  const dados = JSON.parse(dadosSalvos);
  mensagem.textContent = `Recebemos seu cadastro (${dados.email || "e-mail informado"}). Assim que o Mercado Pago confirmar a assinatura, seu acesso sera liberado automaticamente.`;
}
