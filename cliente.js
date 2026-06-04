const loginForm = document.getElementById("loginForm") || document.querySelector("form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const btnEntrar = document.getElementById("btnEntrar");
const authMessage = document.getElementById("authMessage");

function showMessage(text, type = "info") {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.className = `auth-message ${type}`;
}

async function entrar(event) {
  event?.preventDefault();

  const email = emailInput?.value.trim();
  const senha = senhaInput?.value.trim();

  if (!email || !senha) {
    showMessage("Digite seu e-mail e senha.", "error");
    return;
  }

  if (btnEntrar) {
    btnEntrar.disabled = true;
    btnEntrar.textContent = "Entrando...";
  }

  showMessage("Entrando...", "info");

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "E-mail ou senha invalidos.");
    }

    localStorage.setItem("clyora_session", JSON.stringify({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: payload.expires_at,
      email: payload.user?.email || email
    }));

    showMessage("Acesso liberado. Redirecionando...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 500);
  } catch (error) {
    showMessage(error.message || "Erro ao entrar.", "error");
    if (btnEntrar) {
      btnEntrar.disabled = false;
      btnEntrar.textContent = "Entrar";
    }
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", entrar);
}

if (btnEntrar && btnEntrar.type === "button") {
  btnEntrar.addEventListener("click", entrar);
}
