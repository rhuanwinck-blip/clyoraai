const SUPABASE_URL = "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_KEY = "sb_publishable_u9jyER7w06nT317cOKYgOQ_08ScqMIF";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "-";
}

function formatDate(dateValue) {
  if (!dateValue) return "Não configurado";
  const date = new Date(dateValue);
  return date.toLocaleDateString("pt-BR");
}

async function carregarDashboard() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    window.location.href = "cliente.html";
    return;
  }

  const emailLogado = userData.user.email;

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("email", emailLogado)
    .single();

  if (error || !cliente) {
    document.getElementById("empresaTitulo").textContent = "Cadastro não encontrado";
    document.getElementById("dashboardSubtitulo").textContent =
      "Não encontramos os dados da sua empresa. Entre em contato com o suporte.";
    document.getElementById("dashboardConteudo").classList.add("hidden");
    return;
  }

  const status = cliente.status || "pendente";
  const statusEl = document.getElementById("statusCliente");

  statusEl.textContent = status;
  statusEl.className = status === "ativo" ? "status active" : "status inactive";

  if (status !== "ativo") {
    document.getElementById("bloqueioBox").classList.remove("hidden");
  }

  setText("empresaTitulo", cliente.nome_empresa || "Painel da empresa");
  setText("dashboardSubtitulo", "Gerencie sua IA, marketing e dados da empresa.");

  setText("planoCliente", cliente.plano);
  setText("dataInicio", formatDate(cliente.data_inicio));
  setText("dataFim", formatDate(cliente.data_fim));

  setText("nomeEmpresa", cliente.nome_empresa);
  setText("nomeResponsavel", cliente.nome_responsavel);
  setText("emailCliente", cliente.email);
  setText("whatsappCliente", cliente.whatsapp);
  setText("instagramCliente", cliente.instagram);

  setText("nichoCliente", cliente.nicho);
  setText("tipoAtendimento", cliente.tipo_atendimento);
  setText("regiaoAtendimento", cliente.regiao_atendimento);
  setText("publicoAlvo", cliente.publico_alvo);

  setText("servicosCliente", cliente.servicos);

  setText("podeResponder", cliente.pode_responder);
  setText("naoPodeResponder", cliente.nao_pode_responder);
  setText("quandoEncaminhar", cliente.quando_encaminhar);
  setText("tomVoz", cliente.tom_voz);

  setText("produto1", cliente.produto_1_nome);
  setText("produto2", cliente.produto_2_nome);
  setText("produto3", cliente.produto_3_nome);

  setText("marketingOpcao", cliente.marketing_opcao);
  setText("marketingFrequencia", cliente.marketing_frequencia);
  setText("marketingFreq2", cliente.marketing_frequencia);
  setText("marketingPersonalizado", cliente.marketing_frequencia_personalizada);
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "cliente.html";
  });
}

carregarDashboard();