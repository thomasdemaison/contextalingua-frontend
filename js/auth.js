// js/auth.js
// Gestion de l'authentification + header (espace public / espace utilisateur)

console.log("[auth.js] loaded");

// ---------- Helpers de stockage ----------

function saveAuth(token, user) {
  if (token) localStorage.setItem("token", token);
  if (user) {
    try {
      localStorage.setItem("user", JSON.stringify(user));
    } catch {
      // ignore
    }
  }
}

function getCurrentUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
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

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ---------- Initialisation globale ----------

document.addEventListener("DOMContentLoaded", () => {
  try {
    setupHeaderNavigation();
  } catch (e) {
    console.error("Erreur setupHeaderNavigation :", e);
  }

  try {
    setupLoginForm();
  } catch (e) {
    console.error("Erreur setupLoginForm :", e);
  }

  try {
    setupRegisterForm();
  } catch (e) {
    console.error("Erreur setupRegisterForm :", e);
  }
});

// ---------- Header : affichage espace public / espace utilisateur ----------

function setupHeaderNavigation() {
  const user = getCurrentUser();
  const hasToken = isAuthenticated();

  const publicEls = document.querySelectorAll(".nav-public-only");
  const authEls = document.querySelectorAll(".nav-auth-only");

  publicEls.forEach((el) => (el.style.display = hasToken ? "none" : ""));
  authEls.forEach((el) => (el.style.display = hasToken ? "" : "none"));

  const headerEmail = document.getElementById("headerUserEmail");
  if (headerEmail) {
    headerEmail.textContent = hasToken && user && user.email ? user.email : "";
  }

  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearAuth();
      window.location.href = "index.html";
    });
  }

   // Liens publics (header)
  const goLogin = document.querySelectorAll(".js-go-login");
  const goRegister = document.querySelectorAll(".js-go-register");

  goLogin.forEach((el) => {
    el.addEventListener("click", (e) => {
      // si déjà connecté -> dashboard
      if (hasToken) {
        e.preventDefault();
        window.location.href = "dashboard.html";
      }
      // sinon on laisse le href faire son travail (login.html)
    });
  });

  goRegister.forEach((el) => {
    el.addEventListener("click", (e) => {
      // si connecté -> dashboard
      if (hasToken) {
        e.preventDefault();
        window.location.href = "dashboard.html";
      }
      // sinon on laisse le href faire son travail (register.html)
    });
  });

      return;
    }

    // Commencer / Essayer gratuitement
    if (
      txt.includes("commencer gratuitement") ||
      txt.includes("essayer gratuitement")
    ) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = hasToken ? "dashboard.html" : "register.html";
      });
      return;
    }

    // Tableau de bord
    if (txt.includes("tableau de bord")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = hasToken ? "dashboard.html" : "login.html";
      });
      return;
    }

    // Rédaction
    if (txt.includes("redaction")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = hasToken ? "generate.html" : "login.html";
      });
      return;
    }

    // Interprétation
    if (txt.includes("interpretation")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = hasToken ? "interpret.html" : "login.html";
      });
      return;
    }

    // Mode accompagné
    if (
      txt.includes("mode accompagne") ||
      txt === "accompagne" ||
      txt.includes("accompagne")
    ) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = hasToken ? "accompanied.html" : "login.html";
      });
      return;
    }
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
    console.log("[auth.js] submit loginForm");

    if (errorEl) errorEl.textContent = "";

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    console.log("[auth.js] calling /auth/login with", email);

    if (!email || !password) {
      if (errorEl) errorEl.textContent = "Email et mot de passe requis.";
      return;
    }

    try {
      const data = await apiRequest("/auth/login", "POST", { email, password });

      if (!data || !data.token || !data.user) {
        if (errorEl) errorEl.textContent = "Réponse inattendue du serveur.";
        return;
      }

      saveAuth(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("[auth.js] Erreur login :", err);
      if (errorEl) {
        if (err.status === 401) errorEl.textContent = "Identifiants invalides.";
        else if (err.message === "Failed to fetch")
          errorEl.textContent = "Impossible de contacter le serveur.";
        else errorEl.textContent = err.message || "Erreur lors de la connexion.";
      }
    }
  });
}

// ---------- Register ----------

function setupRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const emailInput = document.getElementById("registerEmail");
  const passwordInput = document.getElementById("registerPassword");
  const languageSelect = document.getElementById("registerLanguage");
  const errorEl = document.getElementById("registerError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.textContent = "";

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";
    const defaultLanguage = languageSelect ? languageSelect.value : "fr";

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

      if (!data || !data.token || !data.user) {
        if (errorEl) errorEl.textContent = "Réponse inattendue du serveur.";
        return;
      }

      saveAuth(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("[auth.js] Erreur register :", err);
      if (errorEl)
        errorEl.textContent =
          err.message || "Erreur lors de la création du compte.";
    }
  });
}
