const SUPABASE_URL = "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_KEY = "sb_publishable_u9jyER7w06nT3I7cOKYgOQ_08ScqMiF";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const email = document.getElementById("email");
const senha = document.getElementById("senha");

const btnCriar = document.getElementById("btnCriar");
const btnEntrar = document.getElementById("btnEntrar");

// 🔥 CRIAR CONTA
btnCriar.addEventListener("click", async () => {
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: senha.value
  });

  if (error) {
    alert("Erro: " + error.message);
    return;
  }

  alert("Conta criada! Agora faça login.");
});

// 🔥 LOGIN
btnEntrar.addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: senha.value
  });

  if (error) {
    alert("Erro: " + error.message);
    return;
  }

  // depois vamos criar essa página
  window.location.href = "dashboard.html";
});