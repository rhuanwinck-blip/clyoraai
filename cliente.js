const SUPABASE_URL = "https://odmzoygdrllcypxnuooa.supabase.co";
const SUPABASE_KEY = "sb_publishable_u9jyER7w06nT317cOKYgOQ_08ScqMIF";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const emailInput = document.getElementById("email");
const codigoInput = document.getElementById("codigo");
const btnEnviarCodigo = document.getElementById("btnEnviarCodigo");
const btnEntrar = document.getElementById("btnEntrar");
const authMessage = document.getElementById("authMessage");

// 🔥 FUNÇÃO DE MENSAGEM PROFISSIONAL
function showMessage(text, type = "info") {
  authMessage.textContent = text;
  authMessage.className = `auth-message ${type}`;
}

// 🔥 ENVIAR CÓDIGO
btnEnviarCodigo.addEventListener("click", async () => {
  const email = emailInput.value.trim();

  if (!email) {
    showMessage("Digite seu e-mail para continuar.", "error");
    return;
  }

  showMessage("Enviando código...", "info");

  const { error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: false
    }
  });

  if (error) {
    showMessage("Erro ao enviar código. Verifique o e-mail.", "error");
    return;
  }

  showMessage("Código enviado! Verifique seu e-mail.", "success");
});

// 🔥 LOGIN COM CÓDIGO
btnEntrar.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const codigo = codigoInput.value.trim();

  if (!email || !codigo) {
    showMessage("Digite o e-mail e o código recebido.", "error");
    return;
  }

  showMessage("Validando acesso...", "info");

  const { error } = await supabase.auth.verifyOtp({
    email: email,
    token: codigo,
    type: "email"
  });

  if (error) {
    showMessage("Código inválido ou expirado.", "error");
    return;
  }

  showMessage("Acesso liberado! Redirecionando...", "success");

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 1200);
});