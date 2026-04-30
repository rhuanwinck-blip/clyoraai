const SUPABASE_URL = "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_KEY = "sb_publishable_u9jyER7w06nT317cOKYgOQ_08ScqMIF";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const btnEntrar = document.getElementById("btnEntrar");
const authMessage = document.getElementById("authMessage");

function showMessage(text, type = "info") {
  authMessage.textContent = text;
  authMessage.className = `auth-message ${type}`;
}

btnEntrar.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const senha = senhaInput.value.trim();

  if (!email || !senha) {
    showMessage("Digite seu e-mail e senha.", "error");
    return;
  }

  showMessage("Entrando...", "info");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    showMessage("E-mail ou senha inválidos.", "error");
    return;
  }

  showMessage("Acesso liberado. Redirecionando...", "success");

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 1000);
});