function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "-";
}

function formatDate(dateValue) {
  if (!dateValue) return "Nao configurado";
  const date = new Date(dateValue);
  return date.toLocaleDateString("pt-BR");
}

function showDashboardError(title, message) {
  setText("empresaTitulo", title);
  setText("dashboardSubtitulo", message);
  document.getElementById("dashboardConteudo")?.classList.add("hidden");
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem("clyora_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchCliente(accessToken) {
  const response = await fetch("/api/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Nao foi possivel carregar seus dados.");
  }

  return payload.cliente;
}

async function carregarDashboard() {
  const session = getStoredSession();

  if (!session?.access_token) {
    window.location.href = "cliente.html";
    return;
  }

  let cliente;

  try {
    cliente = await fetchCliente(session.access_token);
  } catch (error) {
    localStorage.removeItem("clyora_session");
    showDashboardError(
      "Sessao expirada",
      "Entre novamente para carregar os dados da sua empresa."
    );
    setTimeout(() => {
      window.location.href = "cliente.html";
    }, 1200);
    return;
  }

  const status = cliente.status || "pendente";
  const statusEl = document.getElementById("statusCliente");
  const bloqueioBox = document.getElementById("bloqueioBox");
  const dashboardConteudo = document.getElementById("dashboardConteudo");

  setText("empresaTitulo", cliente.nome_empresa || "Painel da empresa");

  if (statusEl) {
    statusEl.textContent = status;
    statusEl.className = status === "ativo" ? "status active" : "status inactive";
  }

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

  if (status !== "ativo") {
    setText("dashboardSubtitulo", "Seu cadastro foi recebido. O painel sera liberado apos a confirmacao do pagamento.");
    bloqueioBox?.classList.remove("hidden");
    dashboardConteudo?.classList.remove("hidden");
    return;
  }

  bloqueioBox?.classList.add("hidden");
  dashboardConteudo?.classList.remove("hidden");
  setText("dashboardSubtitulo", "Gerencie sua IA, marketing e dados da empresa.");
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("clyora_session");
    window.location.href = "cliente.html";
  });
}

carregarDashboard();
