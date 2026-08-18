-- Rode este arquivo no SQL Editor do Supabase se a tabela clientes ainda nao tiver todos os campos.
-- Ele tenta adicionar as colunas sem apagar dados existentes.

alter table public.clientes add column if not exists nome_empresa text;
alter table public.clientes add column if not exists nome_responsavel text;
alter table public.clientes add column if not exists email text;
alter table public.clientes add column if not exists whatsapp text;
alter table public.clientes add column if not exists instagram text;
alter table public.clientes add column if not exists nicho text;
alter table public.clientes add column if not exists tipo_atendimento text;
alter table public.clientes add column if not exists regiao_atendimento text;
alter table public.clientes add column if not exists publico_alvo text;
alter table public.clientes add column if not exists servicos text;
alter table public.clientes add column if not exists vende_produtos text;

alter table public.clientes add column if not exists produto_1_nome text;
alter table public.clientes add column if not exists produto_1_descricao text;
alter table public.clientes add column if not exists produto_1_preco_tipo text;
alter table public.clientes add column if not exists produto_1_valor text;

alter table public.clientes add column if not exists produto_2_nome text;
alter table public.clientes add column if not exists produto_2_descricao text;
alter table public.clientes add column if not exists produto_2_preco_tipo text;
alter table public.clientes add column if not exists produto_2_valor text;

alter table public.clientes add column if not exists produto_3_nome text;
alter table public.clientes add column if not exists produto_3_descricao text;
alter table public.clientes add column if not exists produto_3_preco_tipo text;
alter table public.clientes add column if not exists produto_3_valor text;

alter table public.clientes add column if not exists pode_responder text;
alter table public.clientes add column if not exists nao_pode_responder text;
alter table public.clientes add column if not exists quando_encaminhar text;
alter table public.clientes add column if not exists tom_voz text;

alter table public.clientes add column if not exists marketing_opcao text;
alter table public.clientes add column if not exists marketing_frequencia text;
alter table public.clientes add column if not exists marketing_frequencia_personalizada text;

alter table public.clientes add column if not exists plano text;
alter table public.clientes add column if not exists status text default 'pendente';
alter table public.clientes add column if not exists data_cadastro timestamptz;
alter table public.clientes add column if not exists data_inicio timestamptz;
alter table public.clientes add column if not exists data_fim timestamptz;
alter table public.clientes add column if not exists pagamento_status text;
alter table public.clientes add column if not exists mercadopago_preapproval_id text;
alter table public.clientes add column if not exists mercadopago_plan_id text;
alter table public.clientes add column if not exists atualizado_em timestamptz;

-- Central de IA individual por cliente Clyora.
alter table public.clientes add column if not exists ai_workspace_status text default 'em_implantacao';
alter table public.clientes add column if not exists ai_workspace_slug text;
alter table public.clientes add column if not exists ai_workspace_n8n_url text;
alter table public.clientes add column if not exists ai_workspace_notes text;
alter table public.clientes add column if not exists memory_empresa text;
alter table public.clientes add column if not exists memory_clientes jsonb default '{}'::jsonb;
alter table public.clientes add column if not exists ai_agents_config jsonb default '[]'::jsonb;
alter table public.clientes add column if not exists n8n_workflows_config jsonb default '[]'::jsonb;
alter table public.clientes add column if not exists marketing_config jsonb default '{}'::jsonb;
alter table public.clientes add column if not exists human_handoff_config jsonb default '{}'::jsonb;
alter table public.clientes add column if not exists whatsapp_provider_status text default 'nao_conectado';
alter table public.clientes add column if not exists whatsapp_phone_number_id text;
alter table public.clientes add column if not exists meta_whatsapp_phone_number_id text;
alter table public.clientes add column if not exists meta_waba_id text;
alter table public.clientes add column if not exists instagram_status text default 'nao_conectado';
alter table public.clientes add column if not exists instagram_business_id text;
alter table public.clientes add column if not exists last_memory_update timestamptz;

create unique index if not exists clientes_email_unique on public.clientes (email);
create index if not exists clientes_ai_workspace_status_idx on public.clientes (ai_workspace_status);
create index if not exists clientes_meta_phone_idx on public.clientes (meta_whatsapp_phone_number_id);
create index if not exists clientes_whatsapp_phone_idx on public.clientes (whatsapp_phone_number_id);

-- Memoria separada dos clientes finais de cada empresa atendida pela Clyora.
create table if not exists public.cliente_contatos_memoria (
  id uuid primary key default gen_random_uuid(),
  cliente_email text not null,
  contato_telefone text not null,
  contato_nome text,
  resumo text,
  preferencias jsonb default '{}'::jsonb,
  estagio text default 'novo',
  tags text[] default array[]::text[],
  ultima_mensagem text,
  ultima_resposta text,
  ultimo_agente text,
  ultima_interacao timestamptz default now(),
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  unique (cliente_email, contato_telefone)
);

create index if not exists cliente_contatos_memoria_cliente_idx on public.cliente_contatos_memoria (cliente_email);
create index if not exists cliente_contatos_memoria_contato_idx on public.cliente_contatos_memoria (contato_telefone);

-- Historico das conversas usadas pelos agentes.
create table if not exists public.cliente_conversas (
  id uuid primary key default gen_random_uuid(),
  cliente_email text not null,
  contato_telefone text not null,
  canal text default 'whatsapp',
  direcao text,
  mensagem text,
  resposta text,
  agente text,
  metadata jsonb default '{}'::jsonb,
  criado_em timestamptz default now()
);

create index if not exists cliente_conversas_cliente_idx on public.cliente_conversas (cliente_email);
create index if not exists cliente_conversas_contato_idx on public.cliente_conversas (contato_telefone);
create index if not exists cliente_conversas_criado_idx on public.cliente_conversas (criado_em desc);

alter table public.cliente_contatos_memoria enable row level security;
alter table public.cliente_conversas enable row level security;
