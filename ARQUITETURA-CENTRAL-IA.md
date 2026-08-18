# Central de IA por cliente - Clyora AI

Este arquivo descreve a operacao ideal para cada empresa cliente da Clyora.

## Ideia principal

Cada empresa tem uma central propria, com memoria, agentes e fluxos separados. A memoria nunca deve misturar dados de empresas diferentes.

A chave de isolamento da memoria e:

```txt
cliente_email + contato_telefone
```

Ou seja:

- `cliente_email` identifica a empresa cliente da Clyora.
- `contato_telefone` identifica o cliente final daquela empresa.

## Fluxo do WhatsApp

1. O cliente final manda mensagem no WhatsApp da empresa.
2. A Meta WhatsApp Cloud API envia o evento para o n8n daquela empresa.
3. O n8n chama o endpoint da Clyora:

```txt
POST /api/ai-atendimento
Authorization: Bearer CLYORA_AGENT_SECRET
```

4. O endpoint busca a empresa no Supabase.
5. O endpoint busca a memoria daquele cliente final.
6. A OpenAI gera a resposta com base no contexto da empresa.
7. A resposta volta para o n8n.
8. O n8n envia a mensagem pelo WhatsApp.
9. A Clyora salva a conversa e atualiza a memoria do cliente final.

## Payload minimo do n8n

```json
{
  "cliente_email": "empresa@email.com",
  "contato_telefone": "5546999999999",
  "contato_nome": "Nome do cliente final",
  "mensagem": "Mensagem recebida no WhatsApp",
  "canal": "whatsapp",
  "origem": "n8n"
}
```

## Agentes da central

A primeira versao da central cria estes agentes:

- Agente de atendimento
- Agente de vendas
- Agente de memoria
- Agente de marketing
- Agente de qualidade

Todos usam a mesma base tecnica, mas cada um tem uma funcao diferente dentro do fluxo.

## Tabelas novas

O arquivo `supabase-clientes-campos.sql` adiciona:

- novos campos na tabela `clientes`
- tabela `cliente_contatos_memoria`
- tabela `cliente_conversas`

## Variavel de seguranca

Antes de liberar o endpoint `/api/ai-atendimento` em producao, configure na Vercel:

```txt
CLYORA_AGENT_SECRET=<um_codigo_forte_criado_por_voce>
```

O n8n precisa mandar esse mesmo codigo no header `Authorization`.

## Regra de identidade

A IA pode falar em nome da empresa e da equipe, mas nao deve afirmar ser o dono ou uma pessoa especifica. Se perguntarem diretamente se e IA, a resposta deve ser transparente e curta.
