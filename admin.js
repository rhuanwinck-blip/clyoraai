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

  drawerContent.innerHTML = [
    section("Cadastro", [
      ["Empresa", cliente.nome_empresa],
      ["Responsável", cliente.nome_responsavel],
      ["E-mail", cliente.email],
      ["WhatsApp", cliente.whatsapp],
      ["Instagram", cliente.instagram]
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
      ["Tom de voz", cliente.tom_voz]
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
