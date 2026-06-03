console.log("Clyora AI carregado com sucesso.");

const LINK_MENSAL = "COLE_AQUI_LINK_MENSAL";
const LINK_TRIMESTRAL = "COLE_AQUI_LINK_TRIMESTRAL";
const LINK_SEMESTRAL = "COLE_AQUI_LINK_SEMESTRAL";

const vendeProdutos = document.getElementById("vendeProdutos");
const produtosBox = document.getElementById("produtosBox");

if (vendeProdutos && produtosBox) {
  vendeProdutos.addEventListener("change", function () {
    if (this.value === "sim") {
      produtosBox.classList.remove("hidden");
    } else {
      produtosBox.classList.add("hidden");
    }
  });
}

const cadastroForm = document.getElementById("cadastroForm");

if (cadastroForm) {
  cadastroForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const senha = document.getElementById("senha_acesso")?.value;
    const confirmarSenha = document.getElementById("confirmar_senha")?.value;

    if (!senha || senha.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      alert("As senhas nao conferem.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const plano = params.get("plano");

    const dados = {
      nome_empresa: document.getElementById("nome_empresa")?.value || "",
      nome_responsavel: document.getElementById("nome_responsavel")?.value || "",
      email: document.getElementById("email")?.value || "",
      senha_acesso: senha,
      whatsapp: document.getElementById("whatsapp")?.value || "",
      instagram: document.getElementById("instagram")?.value || "",
      nicho: document.getElementById("nicho")?.value || "",
      tipo_atendimento: document.getElementById("tipo_atendimento")?.value || "",
      regiao_atendimento: document.getElementById("regiao_atendimento")?.value || "",
      publico_alvo: document.getElementById("publico_alvo")?.value || "",
      servicos: document.getElementById("servicos")?.value || "",
      vende_produtos: document.getElementById("vendeProdutos")?.value || "",

      produto_1_nome: document.getElementById("produto_1_nome")?.value || "",
      produto_1_descricao: document.getElementById("produto_1_descricao")?.value || "",
      produto_1_preco_tipo: document.getElementById("produto_1_preco_tipo")?.value || "",
      produto_1_valor: document.getElementById("produto_1_valor")?.value || "",

      produto_2_nome: document.getElementById("produto_2_nome")?.value || "",
      produto_2_descricao: document.getElementById("produto_2_descricao")?.value || "",
      produto_2_preco_tipo: document.getElementById("produto_2_preco_tipo")?.value || "",
      produto_2_valor: document.getElementById("produto_2_valor")?.value || "",

      produto_3_nome: document.getElementById("produto_3_nome")?.value || "",
      produto_3_descricao: document.getElementById("produto_3_descricao")?.value || "",
      produto_3_preco_tipo: document.getElementById("produto_3_preco_tipo")?.value || "",
      produto_3_valor: document.getElementById("produto_3_valor")?.value || "",

      pode_responder: document.getElementById("pode_responder")?.value || "",
      nao_pode_responder: document.getElementById("nao_pode_responder")?.value || "",
      quando_encaminhar: document.getElementById("quando_encaminhar")?.value || "",
      tom_voz: document.getElementById("tom_voz")?.value || "",

      marketing_opcao: document.getElementById("marketing_opcao")?.value || "",
      marketing_frequencia: document.getElementById("marketing_frequencia")?.value || "",
      marketing_frequencia_personalizada: document.getElementById("marketing_frequencia_personalizada")?.value || "",

      plano: plano,
      status: "ativo"
    };

    localStorage.setItem("clyora_dados_cliente", JSON.stringify(dados));

    if (plano === "mensal") {
      window.location.href = LINK_MENSAL;
    } else if (plano === "trimestral") {
      window.location.href = LINK_TRIMESTRAL;
    } else if (plano === "semestral") {
      window.location.href = LINK_SEMESTRAL;
    } else {
      alert("Plano nao identificado. Volte para a pagina inicial e escolha um plano.");
    }
  });
}

const openTerms = document.getElementById("openTerms");
const closeTerms = document.getElementById("closeTerms");
const termsModal = document.getElementById("termsModal");

if (openTerms && closeTerms && termsModal) {
  openTerms.addEventListener("click", () => {
    termsModal.classList.add("active");
  });

  closeTerms.addEventListener("click", () => {
    termsModal.classList.remove("active");
  });

  termsModal.addEventListener("click", (event) => {
    if (event.target === termsModal) {
      termsModal.classList.remove("active");
    }
  });
}
