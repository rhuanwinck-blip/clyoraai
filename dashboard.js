const DEFAULT_AGENTS = [
  {
    id: "atendimento_llm",
    nome: "Agente de atendimento",
    papel: "Responde WhatsApp com base na memória da empresa e no histórico do cliente final.",
    status: "pronto_para_treino"
  },
  {
    id: "vendas_followup",
    nome: "Agente de vendas",
    papel: "Organiza oportunidades, objeções e próximos contatos.",
    status: "pronto_para_treino"
  },
  {
    id: "memoria_aprendizado",
    nome: "Agente de memória",
    papel: "Atualiza aprendizados da empresa e de cada cliente final separadamente.",
    status: "pronto_para_treino"
  },
  {
    id: "marketing_instagram",
    nome: "Agente de marketing",
    papel: "Cria ideias, campanhas e legendas para aprovação.",
    status: "aguardando_instagram"
  },
  {
    id: "qualidade_humano",
    nome: "Agente de qualidade",
    papel: "Detecta risco, limite da IA e necessidade de atendimento humano.",
    status: "pronto_para_treino"
  }
];

const DEFAULT_WORKFLOWS = [
  {
    id: "whatsapp_entrada",
    nome: "Entrada WhatsApp",
    ferramenta: "Meta WhatsApp + n8n",
    status: "aguardando_conexao",
    descricao: "Recebe mensagens e envia para o agente certo da Clyora."
  },
  {
    id: "memoria_contexto",
    nome: "Busca de memória",
    ferramenta: "Supabase",
    status: "pronto_para_configurar",
    descricao: "Carrega contexto da empresa e do cliente final."
  },
  {
    id: "resposta_ia",
    nome: "Resposta com IA",
    ferramenta: "OpenAI",
    status: "pronto_para_configurar",
    descricao: "Gera respostas com tom profissional e regras da empresa."
  },
  {
    id: "aprendizado_continuo",
    nome: "Aprendizado supervisionado",
    ferramenta: "Supabase + n8n",
    status: "pronto_para_configurar",
    descricao: "Salva histórico, memória e itens para aprovação."
  }
];

let currentCliente = null;
let currentWorkspace = null;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "-";
}

function showMessage(text, type = "info") {
  const el = document.getElementById("workspaceMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = text ? `auth-message ${type}` : "auth-message";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseMaybeJson(value, fallback) {
  if (Array.isArray(value)) return value.length ? value : fallback;
  if (value && typeof value === "object") return Object.keys(value).length ? value : fallback;
  if (!value || typeof value !== "string") return fallback;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.length ? parsed : fallback;
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length ? parsed : fallback;
  } catch {
    return fallback;
  }

  return fallback;
}

function formatDate(dateValue) {
  if (!dateValue) return "Não configurado";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Não configurado";
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(dateValue) {
  if (!dateValue) return "Inicial";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Inicial";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function statusLabel(value) {
  const labels = {
    ativo: "Ativo",
    em_implantacao: "Implantação",
    treinamento: "Treinamento",
    pausado: "Pausado",
    pendente: "Pendente",
    pendente_pagamento: "Pendente",
    vencido: "Vencido",
    nao_conectado: "Não conectado",
    aguardando_conexao: "Aguardando",
    pronto_para_configurar: "Configurar",
    pronto_para_treino: "Treinar",
    aguardando_instagram: "Instagram"
  };

  return labels[value] || value || "-";
}

function statusClass(value) {
  return ["ativo", "pronto_para_treino", "pronto_para_configurar"].includes(value) ? "active" : "inactive";
}

function buildFallbackMemory(cliente = {}) {
  return [
    `Empresa: ${cliente.nome_empresa || "Não informado"}`,
    `Responsável: ${cliente.nome_responsavel || "Não informado"}`,
    `Nicho: ${cliente.nicho || "Não informado"}`,
    `Serviços: ${cliente.servicos || "Não informado"}`,
    `Tom de voz: ${cliente.tom_voz || "Não informado"}`,
    `Pode responder: ${cliente.pode_responder || "Não informado"}`,
    `Encaminhar para humano: ${cliente.quando_encaminhar || "Não informado"}`
  ].join("\n");
}

function normalizeWorkspace(cliente = {}, workspace = null) {
  const source = workspace || {};

  return {
    status: source.status || cliente.ai_workspace_status || "em_implantacao",
    slug: source.slug || cliente.ai_workspace_slug || `clyora-${(cliente.email || cliente.nome_empresa || "cliente").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    n8n_url: source.n8n_url || cliente.ai_workspace_n8n_url || "",
    notes: source.notes || cliente.ai_workspace_notes || "",
    whatsapp_status: source.whatsapp_status || cliente.whatsapp_provider_status || "nao_conectado",
    instagram_status: source.instagram_status || cliente.instagram_status || "nao_conectado",
    memory_empresa: source.memory_empresa || cliente.memory_empresa || buildFallbackMemory(cliente),
    memory_clientes: source.memory_clientes || parseMaybeJson(cliente.memory_clientes, {
      isolamento: "cliente_email + telefone_cliente_final",
      regra: "Cada cliente final tem histórico e preferências próprias dentro desta empresa."
    }),
    agents: source.agents || parseMaybeJson(cliente.ai_agents_config, DEFAULT_AGENTS),
    workflows: source.workflows || parseMaybeJson(cliente.n8n_workflows_config, DEFAULT_WORKFLOWS),
    marketing: source.marketing || parseMaybeJson(cliente.marketing_config, {
      status: cliente.instagram_status || "aguardando_conexao",
      frequencia: cliente.marketing_frequencia || "A definir",
      opcao: cliente.marketing_opcao || "A definir",
      diretrizes: cliente.marketing_frequencia_personalizada || "Gerar conteúdos alinhados ao nicho e público-alvo."
    }),
    handoff: source.handoff || parseMaybeJson(cliente.human_handoff_config, {
      regras: cliente.quando_encaminhar || "Quando houver dúvida sensível, reclamação ou informação fora da memória.",
      mensagem_padrao: "Vou confirmar isso com a equipe e já te retorno com segurança."
    }),
    last_memory_update: source.last_memory_update || cliente.last_memory_update || null
  };
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem("clyora_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchWorkspace(accessToken) {
  const response = await fetch("/api/client-workspace", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Não foi possível carregar sua central de IA.");
  }

  return payload;
}

function renderAgents(agents = []) {
  const grid = document.getElementById("agentGrid");
  if (!grid) return;

  grid.innerHTML = agents.map((agent) => `
    <article class="agent-card">
      <div class="agent-topline">
        <span class="agent-dot"></span>
        <strong>${escapeHtml(agent.nome || "Agente")}</strong>
      </div>
      <p>${escapeHtml(agent.papel || agent.descricao || "Agente configurado para esta empresa.")}</p>
      <span class="agent-status ${statusClass(agent.status)}">${escapeHtml(statusLabel(agent.status))}</span>
    </article>
  `).join("");
}

function renderWorkflows(workflows = []) {
  const grid = document.getElementById("workflowGrid");
  if (!grid) return;

  grid.innerHTML = workflows.map((workflow) => `
    <article class="workflow-card">
      <span>${escapeHtml(workflow.ferramenta || "Fluxo")}</span>
      <h3>${escapeHtml(workflow.nome || "Workflow")}</h3>
      <p>${escapeHtml(workflow.descricao || "Fluxo da operação individual do cliente.")}</p>
      <strong class="workflow-status">${escapeHtml(statusLabel(workflow.status))}</strong>
    </article>
  `).join("");
}

function fillWorkspaceForm(workspace) {
  const status = document.getElementById("workspaceStatus");
  const n8nUrl = document.getElementById("workspaceN8nUrl");
  const notes = document.getElementById("workspaceNotes");
  const memory = document.getElementById("memoryEmpresa");
  const handoff = document.getElementById("handoffRules");
  const marketing = document.getElementById("marketingGuidelines");

  if (status) status.value = workspace.status || "em_implantacao";
  if (n8nUrl) n8nUrl.value = workspace.n8n_url || "";
  if (notes) notes.value = workspace.notes || "";
  if (memory) memory.value = workspace.memory_empresa || "";
  if (handoff) handoff.value = workspace.handoff?.regras || "";
  if (marketing) marketing.value = workspace.marketing?.diretrizes || "";
}

function renderDashboard(cliente, workspace) {
  currentCliente = cliente;
  currentWorkspace = workspace;

  const status = cliente.status || "pendente";
  const bloqueioBox = document.getElementById("bloqueioBox");
  const dashboardConteudo = document.getElementById("dashboardConteudo");

  setText("empresaTitulo", cliente.nome_empresa || "Central da empresa");
  setText("dashboardSubtitulo", status === "ativo" ? "Sua operação individual de IA, atendimento, memória e marketing." : "Seu cadastro foi recebido. A central será liberada após a confirmação do pagamento.");
  setText("statusCliente", statusLabel(status));
  setText("planoCliente", cliente.plano || "-");
  setText("workspaceStatusPill", statusLabel(workspace.status));
  setText("lastMemoryUpdate", formatDateTime(workspace.last_memory_update));
  setText("workspaceSlug", workspace.slug);
  setText("dataInicio", formatDate(cliente.data_inicio));
  setText("dataFim", formatDate(cliente.data_fim));
  setText("n8nEndpoint", workspace.n8n_url || "Aguardando URL");

  const whatsappStatus = document.getElementById("whatsappStatus");
  const instagramStatus = document.getElementById("instagramStatus");

  if (whatsappStatus) {
    whatsappStatus.textContent = statusLabel(workspace.whatsapp_status);
    whatsappStatus.className = `status ${statusClass(workspace.whatsapp_status)}`;
  }

  if (instagramStatus) {
    instagramStatus.textContent = statusLabel(workspace.instagram_status);
    instagramStatus.className = `status ${statusClass(workspace.instagram_status)}`;
  }

  setText("memorySummary", workspace.memory_empresa);
  setText("customerMemorySummary", `${workspace.memory_clientes?.regra || "Memória por cliente final"} Isolamento: ${workspace.memory_clientes?.isolamento || "cliente + telefone"}.`);
  setText("marketingOpcao", workspace.marketing?.opcao || cliente.marketing_opcao);
  setText("marketingFrequencia", workspace.marketing?.frequencia || cliente.marketing_frequencia);
  setText("marketingStatus", statusLabel(workspace.marketing?.status || workspace.instagram_status));
  setText("marketingGuidelinesView", workspace.marketing?.diretrizes);
  setText("handoffSummary", workspace.handoff?.regras || cliente.quando_encaminhar);

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

  renderAgents(workspace.agents);
  renderWorkflows(workspace.workflows);
  fillWorkspaceForm(workspace);

  if (status !== "ativo") {
    bloqueioBox?.classList.remove("hidden");
  } else {
    bloqueioBox?.classList.add("hidden");
  }

  dashboardConteudo?.classList.remove("hidden");
}

async function carregarDashboard() {
  const session = getStoredSession();

  if (!session?.access_token) {
    window.location.href = "cliente.html";
    return;
  }

  try {
    const payload = await fetchWorkspace(session.access_token);
    const cliente = payload.cliente;
    const workspace = normalizeWorkspace(cliente, payload.workspace);
    renderDashboard(cliente, workspace);
  } catch (error) {
    localStorage.removeItem("clyora_session");
    setText("empresaTitulo", "Sessão expirada");
    setText("dashboardSubtitulo", error.message || "Entre novamente para carregar a central da sua empresa.");
    setTimeout(() => {
      window.location.href = "cliente.html";
    }, 1400);
  }
}

async function saveWorkspace(event) {
  event.preventDefault();

  const session = getStoredSession();
  if (!session?.access_token || !currentWorkspace) return;

  const saveBtn = document.getElementById("saveWorkspaceBtn");
  const originalText = saveBtn?.textContent || "Salvar treinamento";

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";
  }

  showMessage("Salvando treinamento da central...", "info");

  const marketing = {
    ...(currentWorkspace.marketing || {}),
    diretrizes: document.getElementById("marketingGuidelines")?.value.trim() || ""
  };

  const handoff = {
    ...(currentWorkspace.handoff || {}),
    regras: document.getElementById("handoffRules")?.value.trim() || ""
  };

  try {
    const response = await fetch("/api/client-workspace", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        workspace_status: document.getElementById("workspaceStatus")?.value || currentWorkspace.status,
        n8n_url: document.getElementById("workspaceN8nUrl")?.value.trim() || "",
        notes: document.getElementById("workspaceNotes")?.value.trim() || "",
        memory_empresa: document.getElementById("memoryEmpresa")?.value.trim() || "",
        agents: currentWorkspace.agents,
        workflows: currentWorkspace.workflows,
        marketing,
        handoff
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Erro ao salvar central de IA.");
    }

    const workspace = normalizeWorkspace(payload.cliente, payload.workspace);
    renderDashboard(payload.cliente, workspace);
    showMessage("Treinamento salvo com sucesso.", "success");
  } catch (error) {
    showMessage(error.message || "Erro ao salvar treinamento.", "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }
}

const logoutBtn = document.getElementById("logoutBtn");
const workspaceForm = document.getElementById("workspaceForm");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("clyora_session");
    window.location.href = "cliente.html";
  });
}

workspaceForm?.addEventListener("submit", saveWorkspace);

carregarDashboard();
