// js/auth.js
// Auth + header public/auth + login/register + password reset

console.log("[auth.js] loaded");

// ---------- Storage helpers ----------
function saveAuth(token, user) {
  if (token) localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function isAuthenticated() {
  return !!localStorage.getItem("token");
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  setupHeaderNavigation();
  setupLoginForm();
  setupRegisterForm();
  setupForgotPasswordForm();
  setupResetPasswordForm();
});

// ---------- Header ----------
function setupHeaderNavigation() {
  const user = getCurrentUser();
  const hasToken = isAuthenticated();

  document.querySelectorAll(".nav-public-only").forEach((el) => {
    el.style.display = hasToken ? "none" : "";
  });
  document.querySelectorAll(".nav-auth-only").forEach((el) => {
    el.style.display = hasToken ? "" : "none";
  });

  const headerEmail = document.getElementById("headerUserEmail");
  if (headerEmail) {
    headerEmail.textContent = hasToken && user?.email ? user.email : "";
  }

  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearAuth();
      window.location.href = "index.html";
    });
  }
}

// ---------- Login ----------
function setupLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const errorEl = document.getElementById("loginError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    try {
      const data = await apiRequest("/auth/login", "POST", {
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });

      saveAuth(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      errorEl.textContent =
        err.status === 401
          ? "Identifiants invalides."
          : "Erreur de connexion.";
    }
  });
}

// ---------- Register ----------
function setupRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const emailInput = document.getElementById("registerEmail");
  const passwordInput = document.getElementById("registerPassword");
  const languageInput = document.getElementById("registerLanguage");
  const errorEl = document.getElementById("registerError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    try {
      const data = await apiRequest("/auth/register", "POST", {
        email: emailInput.value.trim(),
        password: passwordInput.value,
        defaultLanguage: languageInput.value || "fr",
      });

      saveAuth(data.token, data.user);

      // ✅ Umami conversion: signup success
      if (window.umami && typeof window.umami.track === "function") {
        window.umami.track("signup_success", {
          method: "email",
          lang: (languageInput.value || "fr"),
        });
      }

      window.location.href = "dashboard.html";
    } catch (err) {
      errorEl.textContent = "Erreur lors de la création du compte.";
    }
  });
}


// ---------- Forgot password ----------
function setupForgotPasswordForm() {
  const form = document.getElementById("forgotPasswordForm");
  if (!form) return;

  const emailInput = document.getElementById("forgotEmail");
  const messageEl = document.getElementById("forgotMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageEl.textContent = "";

    try {
      await apiRequest("/auth/forgot-password", "POST", {
        email: emailInput.value.trim(),
      });

      messageEl.style.color = "#22c55e";
      messageEl.textContent =
        "Si un compte existe, un email de réinitialisation a été envoyé.";
    } catch {
      messageEl.style.color = "red";
      messageEl.textContent = "Erreur lors de la demande.";
    }
  });
}

// ---------- Reset password ----------
function setupResetPasswordForm() {
  const form = document.getElementById("resetPasswordForm");
  if (!form) return;

  const passwordInput = document.getElementById("newPassword");
  const messageEl = document.getElementById("resetMessage");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    messageEl.textContent = "Lien invalide.";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageEl.textContent = "";

    try {
      await apiRequest("/auth/reset-password", "POST", {
        token,
        newPassword: passwordInput.value,
      });

      messageEl.style.color = "#22c55e";
      messageEl.textContent =
        "Mot de passe modifié. Vous pouvez vous connecter.";
    } catch {
      messageEl.style.color = "red";
      messageEl.textContent = "Lien expiré ou invalide.";
    }
  });
}
