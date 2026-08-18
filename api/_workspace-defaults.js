const WORKSPACE_VERSION = "2026-08-17.1";

const AGENT_TEMPLATES = [
  {
    id: "atendimento_llm",
    nome: "Agente de atendimento",
    papel: "Responde conversas no WhatsApp com base na memoria da empresa e no historico do cliente final.",
    status: "pronto_para_treino",
    modelo: "OPENAI_AGENT_MODEL",
    entradas: ["mensagem_cliente", "memoria_empresa", "memoria_cliente_final"],
    saidas: ["resposta_whatsapp", "sinalizacao_humano"]
  },
  {
    id: "vendas_followup",
    nome: "Agente de vendas",
    papel: "Identifica intencao de compra, organiza oportunidades e sugere proximos contatos.",
    status: "pronto_para_treino",
    modelo: "OPENAI_AGENT_MODEL",
    entradas: ["conversa", "produtos", "precos", "regras_comerciais"],
    saidas: ["resumo_lead", "proxima_acao", "prioridade"]
  },
  {
    id: "memoria_aprendizado",
    nome: "Agente de memoria",
    papel: "Atualiza a memoria da empresa e de cada cliente final sem misturar dados entre empresas.",
    status: "pronto_para_treino",
    modelo: "OPENAI_AGENT_MODEL",
    entradas: ["historico", "correcoes_do_dono", "novas_informacoes"],
    saidas: ["memoria_atualizada", "itens_para_aprovacao"]
  },
  {
    id: "marketing_instagram",
    nome: "Agente de marketing",
    papel: "Cria ideias, legendas e campanhas para Instagram seguindo o tom de voz da empresa.",
    status: "aguardando_instagram",
    modelo: "OPENAI_AGENT_MODEL",
    entradas: ["servicos", "publico_alvo", "calendario", "ofertas"],
    saidas: ["ideias_post", "legendas", "campanhas"]
  },
  {
    id: "qualidade_humano",
    nome: "Agente de qualidade",
    papel: "Revisa limites da IA, detecta risco e aciona atendimento humano quando necessario.",
    status: "pronto_para_treino",
    modelo: "OPENAI_AGENT_MODEL",
    entradas: ["mensagem", "politicas", "limites", "reclamacoes"],
    saidas: ["aprovado", "encaminhar_humano", "motivo"]
  }
];

const WORKFLOW_TEMPLATES = [
  {
    id: "whatsapp_entrada",
    nome: "Entrada WhatsApp",
    ferramenta: "Meta WhatsApp Cloud API + n8n",
    status: "aguardando_conexao",
    descricao: "Recebe mensagens do WhatsApp da empresa e envia para a IA da Clyora com o identificador daquele cliente."
  },
  {
    id: "memoria_contexto",
    nome: "Busca de memoria",
    ferramenta: "Supabase",
    status: "pronto_para_configurar",
    descricao: "Carrega memoria da empresa e memoria individual do cliente final antes de gerar a resposta."
  },
  {
    id: "resposta_ia",
    nome: "Resposta com IA",
    ferramenta: "OpenAI Responses API",
    status: "pronto_para_configurar",
    descricao: "Gera a resposta com linguagem humana, sem afirmar ser o dono da empresa."
  },
  {
    id: "aprendizado_continuo",
    nome: "Aprendizado supervisionado",
    ferramenta: "Supabase + n8n",
    status: "pronto_para_configurar",
    descricao: "Atualiza memorias, registra historico e separa o que precisa de aprovacao humana."
  },
  {
    id: "marketing_conteudo",
    nome: "Marketing e Instagram",
    ferramenta: "n8n + OpenAI",
    status: "aguardando_instagram",
    descricao: "Gera ideias, legendas e campanhas para aprovacao antes da publicacao."
  },
  {
    id: "relatorio_admin",
    nome: "Relatorio interno",
    ferramenta: "CRM Clyora",
    status: "pronto_para_configurar",
    descricao: "Mostra leads, conversas, memorias e proximas acoes para o dono da empresa."
  }
];

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function valueOrFallback(value, fallback = "Nao informado") {
  const text = clean(value);
  return text || fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeJson(value, fallback) {
  if (Array.isArray(value)) return value.length ? value : clone(fallback);
  if (value && typeof value === "object") return Object.keys(value).length ? value : clone(fallback);

  const text = clean(value);
  if (!text) return clone(fallback);

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.length ? parsed : clone(fallback);
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length ? parsed : clone(fallback);
  } catch (error) {
    return clone(fallback);
  }

  return clone(fallback);
}

function slugify(value) {
  const text = clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return text || "cliente";
}

function compact(values) {
  return values.map(clean).filter(Boolean);
}

function getDisplayName(cliente = {}) {
  return valueOrFallback(cliente.nome_empresa || cliente.nome_responsavel, "Cliente Clyora");
}

function buildProduct(cliente = {}, index) {
  const parts = compact([
    cliente[`produto_${index}_nome`],
    cliente[`produto_${index}_descricao`],
    cliente[`produto_${index}_valor`]
  ]);

  return parts.length ? parts.join(" - ") : "";
}

function buildMemoryEmpresa(cliente = {}) {
  const produtos = [1, 2, 3]
    .map((index) => buildProduct(cliente, index))
    .filter(Boolean);

  return [
    `Empresa: ${getDisplayName(cliente)}`,
    `Responsavel: ${valueOrFallback(cliente.nome_responsavel)}`,
    `Nicho: ${valueOrFallback(cliente.nicho)}`,
    `Regiao de atendimento: ${valueOrFallback(cliente.regiao_atendimento)}`,
    `Publico-alvo: ${valueOrFallback(cliente.publico_alvo)}`,
    `Tipo de atendimento: ${valueOrFallback(cliente.tipo_atendimento)}`,
    `Servicos principais: ${valueOrFallback(cliente.servicos)}`,
    produtos.length ? `Produtos/ofertas: ${produtos.join(" | ")}` : "Produtos/ofertas: Nao informado",
    `Tom de voz: ${valueOrFallback(cliente.tom_voz)}`,
    `Pode responder: ${valueOrFallback(cliente.pode_responder)}`,
    `Nao pode responder: ${valueOrFallback(cliente.nao_pode_responder)}`,
    `Encaminhar para humano quando: ${valueOrFallback(cliente.quando_encaminhar)}`,
    "Regra de identidade: responder em nome da empresa, sem afirmar ser o dono ou uma pessoa especifica."
  ].join("\n");
}

function buildMarketingConfig(cliente = {}) {
  return {
    status: clean(cliente.instagram_status) || "aguardando_conexao",
    canal_principal: "instagram",
    frequencia: valueOrFallback(cliente.marketing_frequencia, "A definir"),
    opcao: valueOrFallback(cliente.marketing_opcao, "A definir"),
    diretrizes: valueOrFallback(cliente.marketing_frequencia_personalizada, "Gerar ideias e legendas alinhadas ao nicho, publico-alvo e ofertas da empresa."),
    exige_aprovacao_humana: true
  };
}

function buildHandoffConfig(cliente = {}) {
  return {
    status: "ativo",
    responsavel: valueOrFallback(cliente.nome_responsavel),
    whatsapp_responsavel: valueOrFallback(cliente.whatsapp),
    regras: valueOrFallback(cliente.quando_encaminhar, "Quando houver reclamacao, pedido sensivel, negociacao fora das regras ou duvida que nao esteja na memoria."),
    mensagem_padrao: "Vou confirmar isso com a equipe e ja te retorno com seguranca."
  };
}

function buildMemoryClientesDefault() {
  return {
    isolamento: "cliente_email + telefone_cliente_final",
    regra: "Cada empresa tem memoria separada. Cada cliente final tambem tem memoria propria dentro da empresa.",
    exemplos: ["nome", "interesse", "historico", "preferencias", "etapa_comercial"]
  };
}

function buildWorkspaceSeed(cliente = {}) {
  const empresa = getDisplayName(cliente);
  const slugBase = cliente.ai_workspace_slug || cliente.email || empresa;

  return {
    version: WORKSPACE_VERSION,
    status: clean(cliente.ai_workspace_status) || "em_implantacao",
    slug: clean(cliente.ai_workspace_slug) || `clyora-${slugify(slugBase)}`,
    n8n_url: clean(cliente.ai_workspace_n8n_url),
    notes: clean(cliente.ai_workspace_notes),
    whatsapp_status: clean(cliente.whatsapp_provider_status) || "nao_conectado",
    whatsapp_phone_number_id: clean(cliente.whatsapp_phone_number_id || cliente.meta_whatsapp_phone_number_id),
    instagram_status: clean(cliente.instagram_status) || "nao_conectado",
    instagram_business_id: clean(cliente.instagram_business_id),
    memory_empresa: clean(cliente.memory_empresa) || buildMemoryEmpresa(cliente),
    memory_clientes: safeJson(cliente.memory_clientes, buildMemoryClientesDefault()),
    agents: safeJson(cliente.ai_agents_config, AGENT_TEMPLATES),
    workflows: safeJson(cliente.n8n_workflows_config, WORKFLOW_TEMPLATES),
    marketing: safeJson(cliente.marketing_config, buildMarketingConfig(cliente)),
    handoff: safeJson(cliente.human_handoff_config, buildHandoffConfig(cliente)),
    last_memory_update: cliente.last_memory_update || null,
    empresa
  };
}

function buildWorkspaceColumns(cliente = {}, overrides = {}) {
  const workspace = {
    ...buildWorkspaceSeed(cliente),
    ...overrides
  };

  return {
    ai_workspace_status: workspace.status,
    ai_workspace_slug: workspace.slug,
    ai_workspace_n8n_url: workspace.n8n_url || null,
    ai_workspace_notes: workspace.notes || null,
    whatsapp_provider_status: workspace.whatsapp_status || "nao_conectado",
    whatsapp_phone_number_id: workspace.whatsapp_phone_number_id || null,
    instagram_status: workspace.instagram_status || "nao_conectado",
    instagram_business_id: workspace.instagram_business_id || null,
    memory_empresa: workspace.memory_empresa,
    memory_clientes: workspace.memory_clientes,
    ai_agents_config: workspace.agents,
    n8n_workflows_config: workspace.workflows,
    marketing_config: workspace.marketing,
    human_handoff_config: workspace.handoff,
    last_memory_update: new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };
}

module.exports = {
  WORKSPACE_VERSION,
  AGENT_TEMPLATES,
  WORKFLOW_TEMPLATES,
  buildWorkspaceSeed,
  buildWorkspaceColumns,
  buildMemoryEmpresa,
  clean,
  valueOrFallback
};
