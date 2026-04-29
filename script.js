console.log("Clyora AI carregado com sucesso.");

const SUPABASE_URL = "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_KEY = "COLE_AQUI_SUA_PUBLISHABLE_KEY";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

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
  cadastroForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!supabaseClient) {
      alert("Erro: Supabase não carregou.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const plano = params.get("plano") || "não informado";

    const inputs = cadastroForm.querySelectorAll("input");
    const selects = cadastroForm.querySelectorAll("select");
    const textareas = cadastroForm.querySelectorAll("textarea");

    const dadosCliente = {
      nome_empresa: inputs[0]?.value || "",
      nome_responsavel: inputs[1]?.value || "",
      email: inputs[2]?.value || "",
      whatsapp: inputs[3]?.value || "",
      instagram: inputs[4]?.value || "",
      nicho: inputs[5]?.value || "",
      tipo_atendimento: selects[0]?.value || "",
      regiao_atendimento: inputs[6]?.value || "",
      publico_alvo: textareas[0]?.value || "",
      logo_url: "",
      servicos: textareas[1]?.value || "",
      vende_produtos: selects[1]?.value || "",

      produto_1_nome: inputs[8]?.value || "",
      produto_1_descricao: textareas[2]?.value || "",
      produto_1_preco_tipo: selects[2]?.value || "",
      produto_1_valor: inputs[9]?.value || "",

      produto_2_nome: inputs[10]?.value || "",
      produto_2_descricao: textareas[3]?.value || "",
      produto_2_preco_tipo: selects[3]?.value || "",
      produto_2_valor: inputs[11]?.value || "",

      produto_3_nome: inputs[12]?.value || "",
      produto_3_descricao: textareas[4]?.value || "",
      produto_3_preco_tipo: selects[4]?.value || "",
      produto_3_valor: inputs[13]?.value || "",

      pode_responder: textareas[5]?.value || "",
      nao_pode_responder: textareas[6]?.value || "",
      quando_encaminhar: textareas[7]?.value || "",
      tom_voz: selects[5]?.value || "",

      marketing_opcao: selects[6]?.value || "",
      marketing_frequencia: selects[7]?.value || "",
      marketing_frequencia_personalizada: inputs[14]?.value || "",

      plano: plano,
      status: "pendente"
    };

    const { error } = await supabaseClient
      .from("clientes")
      .insert([dadosCliente]);

    if (error) {
      console.error("Erro ao salvar no Supabase:", error);
      alert("Erro ao salvar cadastro. Verifique as colunas no Supabase.");
      return;
    }

    if (plano === "mensal") {
      window.location.href = "https://link-mensal.com";
    } else if (plano === "6meses") {
      window.location.href = "https://link-6meses.com";
    } else if (plano === "anual") {
      window.location.href = "https://link-anual.com";
    } else {
      alert("Cadastro salvo. Volte para a página inicial e escolha um plano.");
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