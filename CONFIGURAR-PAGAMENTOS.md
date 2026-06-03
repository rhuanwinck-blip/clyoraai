# Configuracao de pagamentos da Clyora AI

O codigo do site ja esta preparado para o fluxo profissional:

1. Cliente escolhe um plano.
2. Preenche o cadastro.
3. O sistema cria um cliente pendente no Supabase.
4. Cliente vai para o checkout do Mercado Pago.
5. Mercado Pago envia webhook para a Vercel.
6. O webhook confirma a assinatura e muda o cliente para `ativo`.
7. O dashboard libera o acesso.

## 1. Variaveis de ambiente na Vercel

Na Vercel, entre no projeto e va em:

Settings > Environment Variables

Crie estas variaveis:

```text
SUPABASE_URL=https://odmzoygdrllcypxnuooa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=cole_a_service_role_key_do_supabase
MERCADO_PAGO_ACCESS_TOKEN=cole_o_access_token_de_producao_do_mercado_pago
MERCADO_PAGO_WEBHOOK_SECRET=cole_a_assinatura_secreta_do_webhook_do_mercado_pago
```

Importante:

- `SUPABASE_SERVICE_ROLE_KEY` nunca deve ir no frontend.
- `MERCADO_PAGO_ACCESS_TOKEN` nunca deve ir no frontend.
- Essas chaves ficam somente na Vercel.

Depois de adicionar as variaveis, faca um novo deploy.

## 2. Webhook no Mercado Pago

Configure o webhook de producao para esta URL:

```text
https://SEU-DOMINIO/api/mercadopago-webhook
```

Exemplo:

```text
https://clyoraai.com.br/api/mercadopago-webhook
```

Ative o evento de assinatura:

```text
subscription_preapproval
```

Se aparecer opcao de pagamento recorrente, tambem pode ativar:

```text
subscription_authorized_payment
```

## 3. Retorno apos pagamento

Configure o retorno/sucesso do Mercado Pago para:

```text
https://SEU-DOMINIO/ativar.html
```

Essa pagina nao ativa o cliente sozinha. Ela apenas orienta o cliente. A ativacao real acontece pelo webhook.

## 4. Campos esperados na tabela clientes

A tabela `clientes` precisa aceitar estes campos principais:

```text
nome_empresa
nome_responsavel
email
whatsapp
instagram
nicho
tipo_atendimento
regiao_atendimento
publico_alvo
servicos
vende_produtos
produto_1_nome
produto_1_descricao
produto_1_preco_tipo
produto_1_valor
produto_2_nome
produto_2_descricao
produto_2_preco_tipo
produto_2_valor
produto_3_nome
produto_3_descricao
produto_3_preco_tipo
produto_3_valor
pode_responder
nao_pode_responder
quando_encaminhar
tom_voz
marketing_opcao
marketing_frequencia
marketing_frequencia_personalizada
plano
status
data_cadastro
data_inicio
data_fim
pagamento_status
mercadopago_preapproval_id
mercadopago_plan_id
atualizado_em
```

Se algum campo nao existir, o cadastro ou webhook pode dar erro ao salvar.

## 5. Links dos planos ja configurados

Mensal:

```text
https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=47cb3bbe00de45dea881d349b84fb30a
```

Trimestral:

```text
https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=91e59597a6ee4289a4c661b434e206e3
```

Semestral:

```text
https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=5f13c11db0fc45f384880c192410c93b
```
