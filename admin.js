const STORAGE_KEY = "clyora_admin_code";

const adminLogin = document.getElementById("adminLogin");
const adminApp = document.getElementById("adminApp");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminCodeInput = document.getElementById("adminCode");
const adminMessage = document.getElementById("adminMessage");
const adminError = document.getElementById("adminError");
const clientesTableBody = document.getElementById("clientesTableBody");
const adminSearch = document.getElementById("adminSearch");
const adminStatus = document.getElementById("adminStatus");
const refreshAdmin = document.getElementById("refreshAdmin");
const logoutAdmin = document.getElementById("logoutAdmin");
const clientDrawer = document.getElementById("clientDrawer");
const closeDrawer = document.getElementById("closeDrawer");
const drawerStatus = document.getElementById("drawerStatus");
const drawerName = document.getElementById("drawerName");
const drawerMeta = document.getElementById("drawerMeta");
const drawerContent = document.getElementById("drawerContent");
const sendN8n = document.getElementById("sendN8n");
const createWorkspace = document.getElementById("createWorkspace");

let clientes = [];
let selectedCliente = null;

function getCode() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

function setCode(code) {
  localStorage.setItem(STORAGE_KEY, code);
}

function clearCode() {
  localStorage.removeItem(STORAGE_KEY);
}

function showMessage(el, text, type = "info") {
  if (!el) return;
  el.textContent = text || "";
  el.className = text ? `auth-message ${type}` : "auth-message";
}

function showApp() {
  adminLogin?.classList.add("hidden");
  adminApp?.classList.remove("hidden");
}

function showLogin() {
  adminApp?.classList.add("hidden");
  adminLogin?.classList.remove("hidden");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function moneyStatus(status) {
  if (status === "ativo") return "Ativo";
  if (status === "pendente_pagamento") return "Pendente";
  if (status === "vencido") return "Vencido";
  return status || "Sem status";
}

function workspaceStatus(status) {
  const labels = {
    em_implantacao: "Em implantação",
    treinamento: "Em treinamento",
    ativo: "Ativo",
    pausado: "Pausado",
    nao_conectado: "Não conectado",
    aguardando_conexao: "Aguardando conexão"
  };

  return labels[status] || status || "Não criada";
}

function parseMaybeJson(value, fallback = null) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value;
  if (!value || typeof value !== "string") return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function countItems(value, singular, plural) {
  const parsed = parseMaybeJson(value, []);
  if (!Array.isArray(parsed) || !parsed.length) return "-";
  return `${parsed.length} ${parsed.length === 1 ? singular : plural}`;
}

function setStats(stats = {}) {
  document.getElementById("statTotal").textContent = stats.total || 0;
  document.getElementById("statAtivos").textContent = stats.ativos || 0;
  document.getElementById("statPendentes").textContent = stats.pendentes || 0;
  document.getElementById("statVencidos").textContent = stats.vencidos || 0;
}

function visibleValue(value) {
  return value || "-";
}

function makeRow(cliente, index) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="client-cell">
      <strong>${visibleValue(cliente.nome_exibicao)}</strong>
      <span>${visibleValue(cliente.email)}</span>
    </td>
    <td>${visibleValue(cliente.telefone_exibicao)}</td>
    <td>${visibleValue(cliente.plano_exibicao)}</td>
    <td><span class="status-pill ${cliente.status_exibicao}">${moneyStatus(cliente.status_exibicao)}</span></td>
    <td>${formatDate(cliente.data_cadastro)}</td>
    <td><button class="row-action" data-index="${index}">Detalhes</button></td>
  `;
  return tr;
}

function renderTable() {
  clientesTableBody.innerHTML = "";

  if (!clientes.length) {
    clientesTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhum cliente encontrado.</td></tr>`;
    return;
  }

  clientes.forEach((cliente, index) => {
    clientesTableBody.appendChild(makeRow(cliente, index));
  });
}

function section(title, rows) {
  const cleanRows = rows.filter((row) => row[1]);
  if (!cleanRows.length) return "";

  return `
    <div class="drawer-section">
      <h3>${title}</h3>
      ${cleanRows.map(([label, value]) => `<p><strong>${label}:</strong> ${visibleValue(value)}</p>`).join("")}
    </div>
  `;
}

function updateSelectedCliente(updatedCliente) {
  if (!updatedCliente?.email) return;

  const index = clientes.findIndex((cliente) => cliente.email === updatedCliente.email);
  const normalized = {
    ...updatedCliente,
    nome_exibicao: updatedCliente.nome_empresa || updatedCliente.nome_responsavel || "Sem nome",
    telefone_exibicao: updatedCliente.whatsapp || "",
    status_exibicao: updatedCliente.status || "sem_status",
    plano_exibicao: updatedCliente.plano || "sem_plano"
  };

  if (index >= 0) clientes[index] = normalized;
  selectedCliente = normalized;
  renderTable();
}

function openDetails(cliente) {
  selectedCliente = cliente;
  drawerStatus.textContent = moneyStatus(cliente.status_exibicao);
  drawerStatus.className = cliente.status_exibicao === "ativo" ? "status active" : "status inactive";
  drawerName.textContent = cliente.nome_exibicao;
  drawerMeta.textContent = `${visibleValue(cliente.plano_exibicao)} • ${visibleValue(cliente.email)} • ${visibleValue(cliente.telefone_exibicao)}`;

  if (sendN8n) {
    sendN8n.disabled = !cliente.email;
    sendN8n.textContent = "Enviar para n8n";
  }

  if (createWorkspace) {
    createWorkspace.disabled = !cliente.email || cliente.status_exibicao !== "ativo";
    createWorkspace.textContent = cliente.ai_workspace_status ? "Atualizar central IA" : "Criar central IA";
  }

  drawerContent.innerHTML = [
    section("Cadastro", [
      ["Empresa", cliente.nome_empresa],
      ["Responsável", cliente.nome_responsavel],
      ["E-mail", cliente.email],
      ["WhatsApp", cliente.whatsapp],
      ["Instagram", cliente.instagram]
    ]),
    section("Central de IA", [
      ["Status", workspaceStatus(cliente.ai_workspace_status)],
      ["Workspace", cliente.ai_workspace_slug],
      ["n8n", cliente.ai_workspace_n8n_url],
      ["WhatsApp", workspaceStatus(cliente.whatsapp_provider_status)],
      ["Instagram", workspaceStatus(cliente.instagram_status)],
      ["Agentes", countItems(cliente.ai_agents_config, "agente", "agentes")],
      ["Fluxos", countItems(cliente.n8n_workflows_config, "fluxo", "fluxos")],
      ["Última memória", formatDate(cliente.last_memory_update)]
    ]),
    section("Assinatura", [
      ["Status", cliente.status],
      ["Plano", cliente.plano],
      ["Pagamento", cliente.pagamento_status],
      ["Início", formatDate(cliente.data_inicio)],
      ["Fim", formatDate(cliente.data_fim)],
      ["Mercado Pago", cliente.mercadopago_preapproval_id]
    ]),
    section("Perfil", [
      ["Nicho", cliente.nicho],
      ["Atendimento", cliente.tipo_atendimento],
      ["Região", cliente.regiao_atendimento],
      ["Público-alvo", cliente.publico_alvo],
      ["Serviços", cliente.servicos]
    ]),
    section("IA", [
      ["Pode responder", cliente.pode_responder],
      ["Não pode responder", cliente.nao_pode_responder],
      ["Encaminhar para humano", cliente.quando_encaminhar],
      ["Tom de voz", cliente.tom_voz],
      ["Memória da empresa", cliente.memory_empresa]
    ]),
    section("Produtos", [
      ["Produto 1", [cliente.produto_1_nome, cliente.produto_1_descricao, cliente.produto_1_valor].filter(Boolean).join(" - ")],
      ["Produto 2", [cliente.produto_2_nome, cliente.produto_2_descricao, cliente.produto_2_valor].filter(Boolean).join(" - ")],
      ["Produto 3", [cliente.produto_3_nome, cliente.produto_3_descricao, cliente.produto_3_valor].filter(Boolean).join(" - ")]
    ]),
    section("Marketing", [
      ["Opção", cliente.marketing_opcao],
      ["Frequência", cliente.marketing_frequencia],
      ["Personalizado", cliente.marketing_frequencia_personalizada]
    ])
  ].join("");

  clientDrawer.classList.add("active");
  clientDrawer.setAttribute("aria-hidden", "false");
}

async function loadClientes() {
  const code = getCode();
  const params = new URLSearchParams();
  const q = adminSearch?.value.trim() || "";
  const status = adminStatus?.value || "todos";

  if (q) params.set("q", q);
  if (status) params.set("status", status);

  showMessage(adminError, "Carregando CRM...", "info");

  const response = await fetch(`/api/admin-clientes?${params.toString()}`, {
    headers: { Authorization: `Bearer ${code}` }
  });

  const payload = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      clearCode();
      showLogin();
      showMessage(adminMessage, payload.error || "Código inválido.", "error");
      return;
    }

    showMessage(adminError, payload.error || "Erro ao carregar CRM.", "error");
    return;
  }

  clientes = payload.clientes || [];
  setStats(payload.stats || {});
  renderTable();
  showMessage(adminError, "", "info");
  showApp();
}

async function sendSelectedToN8n() {
  if (!selectedCliente?.email) {
    showMessage(adminError, "Esse cliente ainda não tem e-mail para envio.", "error");
    return;
  }

  const code = getCode();
  const originalText = sendN8n.textContent;
  sendN8n.disabled = true;
  sendN8n.textContent = "Enviando...";
  showMessage(adminError, "Enviando cliente para o n8n...", "info");

  try {
    const response = await fetch("/api/admin-enviar-n8n", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${code}`
      },
      body: JSON.stringify({ email: selectedCliente.email })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Erro ao enviar cliente para o n8n.");
    }

    showMessage(adminError, "Cliente enviado para o n8n com sucesso.", "success");
    sendN8n.textContent = "Enviado";
  } catch (error) {
    showMessage(adminError, error.message || "Erro ao enviar cliente para o n8n.", "error");
    sendN8n.textContent = originalText;
  } finally {
    sendN8n.disabled = false;
  }
}

async function bootstrapSelectedWorkspace() {
  if (!selectedCliente?.email) {
    showMessage(adminError, "Selecione um cliente com e-mail para criar a central.", "error");
    return;
  }

  const code = getCode();
  const originalText = createWorkspace.textContent;
  createWorkspace.disabled = true;
  createWorkspace.textContent = "Criando...";
  showMessage(adminError, "Criando central de IA do cliente...", "info");

  try {
    const response = await fetch("/api/admin-workspace", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${code}`
      },
      body: JSON.stringify({ email: selectedCliente.email })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Erro ao criar central de IA.");
    }

    updateSelectedCliente(payload.cliente);
    openDetails(selectedCliente);
    showMessage(adminError, payload.n8n?.sent ? "Central criada e enviada para o n8n." : "Central criada. n8n ainda não confirmou o recebimento.", "success");
  } catch (error) {
    showMessage(adminError, error.message || "Erro ao criar central de IA.", "error");
    createWorkspace.textContent = originalText;
  } finally {
    createWorkspace.disabled = false;
  }
}

adminLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = adminCodeInput.value.trim();

  if (!code) {
    showMessage(adminMessage, "Digite o código de admin.", "error");
    return;
  }

  setCode(code);
  await loadClientes();
});

clientesTableBody?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button) return;
  const cliente = clientes[Number(button.dataset.index)];
  if (cliente) openDetails(cliente);
});

sendN8n?.addEventListener("click", sendSelectedToN8n);
createWorkspace?.addEventListener("click", bootstrapSelectedWorkspace);

closeDrawer?.addEventListener("click", () => {
  clientDrawer.classList.remove("active");
  clientDrawer.setAttribute("aria-hidden", "true");
});

clientDrawer?.addEventListener("click", (event) => {
  if (event.target === clientDrawer) {
    clientDrawer.classList.remove("active");
    clientDrawer.setAttribute("aria-hidden", "true");
  }
});

refreshAdmin?.addEventListener("click", loadClientes);
adminSearch?.addEventListener("input", () => {
  clearTimeout(window.__adminSearchTimer);
  window.__adminSearchTimer = setTimeout(loadClientes, 350);
});
adminStatus?.addEventListener("change", loadClientes);

logoutAdmin?.addEventListener("click", () => {
  clearCode();
  clientes = [];
  selectedCliente = null;
  showLogin();
});

if (getCode()) {
  loadClientes();
} else {
  showLogin();
}
