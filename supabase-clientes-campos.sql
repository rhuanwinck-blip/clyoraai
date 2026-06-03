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

create unique index if not exists clientes_email_unique on public.clientes (email);
