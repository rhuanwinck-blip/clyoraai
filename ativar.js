const SUPABASE_URL = "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_KEY = "sb_publishable_u9jyER7w06nT317cOKYgOQ_08ScqMIF";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const mensagem = document.getElementById("ativarMensagem");

async function ativarCliente() {
  const dadosSalvos = localStorage.getItem("clyora_dados_cliente");

  if (!dadosSalvos) {
    mensagem.textContent = "Não encontramos seus dados de cadastro. Volte e preencha novamente.";
    return;
  }

  const dados = JSON.parse(dadosSalvos);

  const senha = dados.senha_acesso;
  delete dados.senha_acesso;

  const { error: authError } = await supabase.auth.signUp({
    email: dados.email,
    password: senha
  });

  if (authError) {
    mensagem.textContent = "Erro ao criar login: " + authError.message;
    return;
  }

  const { error: insertError } = await supabase
    .from("clientes")
    .insert([dados]);

  if (insertError) {
    mensagem.textContent = "Erro ao salvar dados da empresa: " + insertError.message;
    return;
  }

  localStorage.removeItem("clyora_dados_cliente");

  mensagem.textContent = "Acesso ativado com sucesso. Você será redirecionado para o login.";

  setTimeout(() => {
    window.location.href = "cliente.html";
  }, 2000);
}

ativarCliente();