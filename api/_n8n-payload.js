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
    "Proximo passo: revisar o cadastro no CRM e iniciar a configuracao da IA."
  ].join("\n");
}

function buildClientWelcomeMessage(cliente, resumo) {
  const firstName = getFirstName(cliente.nome_responsavel);

  return [
    `Ola, ${firstName}! Tudo bem?`,
    "Aqui e da Clyora AI.",
    "",
    `Recebemos a confirmacao do seu plano ${resumo.plano} e seu cadastro ja entrou na nossa fila de implantacao.`,
    `Vamos revisar as informacoes da ${resumo.empresa} e iniciar a configuracao da sua IA de atendimento.`,
    "",
    "Se precisarmos de algum detalhe, vamos chamar voce por aqui.",
    "Obrigado por confiar na Clyora AI."
  ].join("\n");
}

function buildPromptBase(cliente, resumo) {
  const produtos = resumo.produtos.length
    ? resumo.produtos.map((produto, index) => `${index + 1}. ${produto.resumo}`).join("\n")
    : "Nenhum produto informado.";

  return [
    `Voce e a IA de atendimento da empresa ${resumo.empresa}.`,
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
    "Regras de atendimento:",
    `Pode responder: ${valueOrFallback(cliente.pode_responder)}.`,
    `Nao pode responder: ${valueOrFallback(cliente.nao_pode_responder)}.`,
    `Encaminhar para humano quando: ${valueOrFallback(cliente.quando_encaminhar)}.`,
    `Tom de voz: ${valueOrFallback(cliente.tom_voz)}.`,
    "",
    "Objetivo: atender leads com clareza, coletar nome, telefone e necessidade, explicar os servicos com seguranca e encaminhar para humano quando necessario."
  ].join("\n");
}

function buildChecklist(cliente, resumo) {
  return [
    {
      etapa: "Conferir cadastro",
      descricao: "Validar nome, WhatsApp, Instagram, nicho, servicos e produtos no CRM.",
      prioridade: "alta"
    },
    {
      etapa: "Montar prompt da IA",
      descricao: "Usar o prompt_base_ia enviado neste payload como ponto de partida.",
      prioridade: "alta"
    },
    {
      etapa: "Configurar canal",
      descricao: `Conectar o canal de atendimento informado pelo cliente: ${resumo.atendimento}.`,
      prioridade: "alta"
    },
    {
      etapa: "Testar respostas",
      descricao: "Simular perguntas comuns, limites da IA e encaminhamento para humano.",
      prioridade: "media"
    },
    {
      etapa: "Avisar cliente",
      descricao: `Enviar mensagem para ${resumo.responsavel} no WhatsApp ${resumo.whatsapp} confirmando o inicio da implantacao.",`,
      prioridade: "media"
    }
  ];
}

function buildN8nPayload(cliente, event = "cliente_ativado") {
  const resumo = buildResumo(cliente || {});

  return {
    event,
    source: "clyoraai",
    sent_at: new Date().toISOString(),
    cliente,
    automacao: {
      tipo: "implantacao_cliente",
      status: "pronto_para_implantacao",
      resumo,
      mensagem_admin_whatsapp: buildAdminMessage(cliente || {}, resumo),
      mensagem_cliente_boas_vindas: buildClientWelcomeMessage(cliente || {}, resumo),
      prompt_base_ia: buildPromptBase(cliente || {}, resumo),
      checklist_implantacao: buildChecklist(cliente || {}, resumo),
      proximas_acoes: [
        "Revisar dados no CRM",
        "Conferir regras do prompt",
        "Conectar canal de atendimento",
        "Rodar teste interno",
        "Enviar boas-vindas para o cliente",
        "Liberar atendimento para o cliente"
      ]
    }
  };
}

module.exports = { buildN8nPayload, buildClientWelcomeMessage };
