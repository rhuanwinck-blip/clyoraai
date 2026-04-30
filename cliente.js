console.log("cliente.js carregou");

const SUPABASE_URL = "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_KEY = "sb_publishable_u9jyER7w06nT3I7cOKYgOQ_08ScqMiF";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const params = new URLSearchParams(window.location.search);
const acesso = params.get("acesso");

if (acesso !== "clyora2026") {
  alert("Acesso bloqueado. Crie sua conta somente após o pagamento.");
  window.location.href = "index.html";
}

const email = document.getElementById("email");
const senha = document.getElementById("senha");
const btnCriar = document.getElementById("btnCriar");
const btnEntrar = document.getElementById("btnEntrar");

btnCriar.addEventListener("click", async () => {
  alert("Tentando criar conta...");

  const { data, error } = await supabaseClient.auth.signUp({
    email: email.value,
    password: senha.value
  });

  if (error) {
    console.error(error);
    alert("Erro ao criar conta: " + error.message);
    return;
  }

  console.log(data);
  alert("Conta criada! Agora clique em Entrar.");
});

btnEntrar.addEventListener("click", async () => {
  alert("Tentando entrar...");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email.value,
    password: senha.value
  });

  if (error) {
    console.error(error);
    alert("Erro ao entrar: " + error.message);
    return;
  }

  console.log(data);
  window.location.href = "dashboard.html";
});