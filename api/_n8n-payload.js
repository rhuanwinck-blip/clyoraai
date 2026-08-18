const { buildWorkspaceSeed } = require("./_workspace-defaults");

const PLAN_LABELS = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral"
};

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function valueOrFallback(value, fallback = "Nao informado") {
  const text = clean(value);
  return text || fallback;
}

function compactList(values) {
  return values.map(clean).filter(Boolean);
}

function buildProduct(cliente, index) {
  const nome = cliente[`produto_${index}_nome`];
  const descricao = cliente[`produto_${index}_descricao`];
  const valor = cliente[`produto_${index}_valor`];
  const parts = compactList([nome, descricao, valor]);

  if (!parts.length) return null;

  return {
    nome: valueOrFallback(nome),
    descricao: valueOrFallback(descricao),
    valor: valueOrFallback(valor),
    resumo: parts.join(" - ")
  };
}

function getDisplayName(cliente) {
  return valueOrFallback(cliente.nome_empresa || cliente.nome_responsavel, "Cliente sem nome");
}

function getFirstName(name) {
  const text = clean(name);
  return text ? text.split(/\s+/)[0] : "tudo bem";
}

function getPublicBaseUrl() {
  if (process.env.PUBLIC_SITE_URL) return clean(process.env.PUBLIC_SITE_URL).replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${clean(process.env.VERCEL_URL).replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return "https://clyoraai.vercel.app";
}

function buildResumo(cliente) {
  const produtos = [1, 2, 3]
    .map((index) => buildProduct(cliente, index))
    .filter(Boolean);

  return {
    empresa: getDisplayName(cliente),
    responsavel: valueOrFallback(cliente.nome_responsavel),
    email: valueOrFallback(cliente.email),
    whatsapp: valueOrFallback(cliente.whatsapp),
    instagram: valueOrFallback(cliente.instagram),
    plano: PLAN_LABELS[clean(cliente.plano).toLowerCase()] || valueOrFallback(cliente.plano),
    nicho: valueOrFallback(cliente.nicho),
    atendimento: valueOrFallback(cliente.tipo_atendimento),
    regiao: valueOrFallback(cliente.regiao_atendimento),
    publico_alvo: valueOrFallback(cliente.publico_alvo),
    servicos: valueOrFallback(cliente.servicos),
    produtos
  };
}

function buildAdminMessage(cliente, resumo) {
  return [
    "Novo cliente ativo na Clyora AI",
    `Empresa: ${resumo.empresa}`,
    `Responsavel: ${resumo.responsavel}`,
    `WhatsApp: ${resumo.whatsapp}`,
    `E-mail: ${resumo.email}`,
    `Plano: ${resumo.plano}`,
    `Nicho: ${resumo.nicho}`,
    `Atendimento: ${resumo.atendimento}`,
    `Regiao: ${resumo.regiao}`,
    "",
    "Proximo passo: revisar o cadastro no CRM e iniciar a central de IA da empresa."
  ].join("\n");
}

function buildClientWelcomeMessage(cliente, resumo) {
  const firstName = getFirstName(cliente.nome_responsavel);

  return [
    `Ola, ${firstName}! Tudo bem?`,
    "Aqui e da Clyora AI.",
    "",
    `Recebemos a confirmacao do seu plano ${resumo.plano} e seu cadastro ja entrou na nossa fila de implantacao.`,
    `Vamos revisar as informacoes da ${resumo.empresa} e iniciar a configuracao da sua central de IA, atendimento e marketing.`,
    "",
    "Se precisarmos de algum detalhe, vamos chamar voce por aqui.",
    "Obrigado por confiar na Clyora AI."
  ].join("\n");
}

function buildPromptBase(cliente, resumo, workspace) {
  const produtos = resumo.produtos.length
    ? resumo.produtos.map((produto, index) => `${index + 1}. ${produto.resumo}`).join("\n")
    : "Nenhum produto informado.";

  return [
    `Voce atende clientes finais da empresa ${resumo.empresa}.`,
    `Responsavel pelo projeto: ${resumo.responsavel}.`,
    `Nicho da empresa: ${resumo.nicho}.`,
    `Tipo de atendimento: ${resumo.atendimento}.`,
    `Regiao de atendimento: ${resumo.regiao}.`,
    `Publico-alvo: ${resumo.publico_alvo}.`,
    `Servicos principais: ${resumo.servicos}.`,
    "",
    "Produtos ou ofertas cadastradas:",
    produtos,
    "",
    "Memoria inicial da empresa:",
    workspace.memory_empresa,
    "",
    "Regras de atendimento:",
    `Pode responder: ${valueOrFallback(cliente.pode_responder)}.`,
    `Nao pode responder: ${valueOrFallback(cliente.nao_pode_responder)}.`,
    `Encaminhar para humano quando: ${valueOrFallback(cliente.quando_encaminhar)}.`,
    `Tom de voz: ${valueOrFallback(cliente.tom_voz)}.`,
    "",
    "Identidade: fale em nome da empresa/equipe. Nao afirme ser o dono ou uma pessoa especifica.",
    "Objetivo: atender leads com clareza, coletar nome, telefone e necessidade, explicar os servicos com seguranca e encaminhar para humano quando necessario."
  ].join("\n");
}

function buildChecklist(cliente, resumo) {
  return [
    {
      etapa: "Conferir cadastro",
      descricao: "Validar nome, WhatsApp, Instagram, nicho, servicos, produtos e regras no CRM.",
      prioridade: "alta"
    },
    {
      etapa: "Criar central de IA",
      descricao: "Gerar memoria inicial, agentes, fluxos n8n e status da implantacao para este cliente.",
      prioridade: "alta"
    },
    {
      etapa: "Conectar WhatsApp oficial",
      descricao: `Conectar o WhatsApp da empresa e enviar mensagens para o endpoint /api/ai-atendimento com cliente_email=${resumo.email}.`,
      prioridade: "alta"
    },
    {
      etapa: "Testar atendimento",
      descricao: "Simular perguntas comuns, vendas, limites da IA, memoria e encaminhamento para humano.",
      prioridade: "alta"
    },
    {
      etapa: "Ativar marketing",
      descricao: "Gerar calendario, ideias e legendas para aprovacao antes de publicar no Instagram.",
      prioridade: "media"
    },
    {
      etapa: "Avisar cliente",
      descricao: `Enviar mensagem para ${resumo.responsavel} no WhatsApp ${resumo.whatsapp} confirmando o inicio da implantacao.`,
      prioridade: "media"
    }
  ];
}

function buildN8nPayload(cliente, event = "cliente_ativado") {
  const resumo = buildResumo(cliente || {});
  const workspace = buildWorkspaceSeed(cliente || {});
  const baseUrl = getPublicBaseUrl();

  return {
    event,
    source: "clyoraai",
    sent_at: new Date().toISOString(),
    cliente,
    workspace,
    integracoes: {
      agent_endpoint: `${baseUrl}/api/ai-atendimento`,
      client_workspace_endpoint: `${baseUrl}/api/client-workspace`,
      auth_header: "Authorization: Bearer CLYORA_AGENT_SECRET",
      isolamento_memoria: "cliente_email + contato_telefone"
    },
    automacao: {
      tipo: "implantacao_cliente",
      status: "pronto_para_implantacao",
      resumo,
      central_ia: {
        slug: workspace.slug,
        status: workspace.status,
        agentes: workspace.agents,
        fluxos: workspace.workflows,
        memoria_empresa: workspace.memory_empresa,
        memoria_clientes: workspace.memory_clientes,
        handoff: workspace.handoff,
        marketing: workspace.marketing
      },
      mensagem_admin_whatsapp: buildAdminMessage(cliente || {}, resumo),
      mensagem_cliente_boas_vindas: buildClientWelcomeMessage(cliente || {}, resumo),
      prompt_base_ia: buildPromptBase(cliente || {}, resumo, workspace),
      checklist_implantacao: buildChecklist(cliente || {}, resumo),
      proximas_acoes: [
        "Revisar dados no CRM",
        "Criar ou atualizar a central de IA no admin",
        "Configurar workflow n8n exclusivo do cliente",
        "Conectar WhatsApp oficial da empresa",
        "Rodar teste interno de atendimento",
        "Ativar memoria por cliente final",
        "Gerar primeira pauta de marketing",
        "Liberar atendimento para o cliente"
      ]
    }
  };
}

module.exports = { buildN8nPayload, buildClientWelcomeMessage };
