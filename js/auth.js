// js/auth.js
// Auth + header public/auth + login/register

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
});

// ---------- Header ----------
function setupHeaderNavigation() {
  const user = getCurrentUser();
  const hasToken = isAuthenticated();

  // Toggle menus
  document.querySelectorAll(".nav-public-only").forEach((el) => {
    el.style.display = hasToken ? "none" : "";
  });
  document.querySelectorAll(".nav-auth-only").forEach((el) => {
    el.style.display = hasToken ? "" : "none";
  });

  // Email
  const headerEmail = document.getElementById("headerUserEmail");
  if (headerEmail) {
    headerEmail.textContent = hasToken && user?.email ? user.email : "";
  }

  // Logout
  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearAuth();
      window.location.href = "index.html";
    });
  }

  // Optional: header buttons (public)
  // Works only if you add these classes in HTML:
  //  - .js-go-login  (link to login.html)
  //  - .js-go-register (link to register.html)
  document.querySelectorAll(".js-go-login").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (hasToken) {
        e.preventDefault();
        window.location.href = "dashboard.html";
      }
      // sinon, laisse le href aller sur login.html
    });
  });

  document.querySelectorAll(".js-go-register").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (hasToken) {
        e.preventDefault();
        window.location.href = "dashboard.html";
      }
      // sinon, laisse le href aller sur register.html
    });
  });
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
    if (errorEl) errorEl.textContent = "";

    const email = emailInput?.value?.trim() || "";
    const password = passwordInput?.value || "";

    if (!email || !password) {
      if (errorEl) errorEl.textContent = "Email et mot de passe requis.";
      return;
    }

    try {
      const data = await apiRequest("/auth/login", "POST", { email, password });

      if (!data?.token || !data?.user) {
        if (errorEl) errorEl.textContent = "Réponse inattendue du serveur.";
        return;
      }

      saveAuth(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("[auth.js] login error:", err);
      if (!errorEl) return;
      if (err.status === 401) errorEl.textContent = "Identifiants invalides.";
      else if (err.message === "Failed to fetch") errorEl.textContent = "Impossible de contacter le serveur.";
      else errorEl.textContent = err.message || "Erreur lors de la connexion.";
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
    if (errorEl) errorEl.textContent = "";

    const email = emailInput?.value?.trim() || "";
    const password = passwordInput?.value || "";
    const defaultLanguage = languageInput?.value || "fr";

    if (!email || !password) {
      if (errorEl) errorEl.textContent = "Email et mot de passe requis.";
      return;
    }

    try {
      const data = await apiRequest("/auth/register", "POST", {
        email,
        password,
        defaultLanguage,
      });

      if (!data?.token || !data?.user) {
        if (errorEl) errorEl.textContent = "Réponse inattendue du serveur.";
        return;
      }

      saveAuth(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("[auth.js] register error:", err);
      if (errorEl) errorEl.textContent = err.message || "Erreur lors de la création du compte.";
    }
  });
}
