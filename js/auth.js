// js/auth.js
// Gestion de l'authentification + header (espace public / espace utilisateur)

// ---------- Helpers de stockage ----------

function saveAuth(token, user) {
  if (token) {
    localStorage.setItem("token", token);
  }
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

// Petit utilitaire pour comparer des textes de bouton sans accent, etc.
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

  // 1) afficher / masquer les blocs public / auth
  const publicEls = document.querySelectorAll(".nav-public-only");
  const authEls   = document.querySelectorAll(".nav-auth-only");

  publicEls.forEach((el) => {
    el.style.display = hasToken ? "none" : "";
  });
  authEls.forEach((el) => {
    el.style.display = hasToken ? "" : "none";
  });

  // 2) email dans le header
  const headerEmail = document.getElementById("headerUserEmail");
  if (headerEmail) {
    headerEmail.textContent = hasToken && user && user.email ? user.email : "";
  }

  // 3) bouton Déconnexion explicite
  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearAuth();
      window.location.href = "index.html";
    });
  }

  // 4) Redirections intelligentes selon les libellés
  const clickable = Array.from(document.querySelectorAll("a, button"));

  clickable.forEach((el) => {
    const txt = normalizeText(el.textContent || "");
    if (!txt) return;

    // Evite de ré-attacher un handler sur le bouton de logout qu'on a déjà géré
    if (el.id === "btnLogout") return;

    // Se connecter
    if (txt.includes("se connecter")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (hasToken) {
          window.location.href = "dashboard.html";
        } else {
          window.location.href = "login.html";
        }
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
        if (hasToken) {
          window.location.href = "dashboard.html";
        } else {
          window.location.href = "register.html";
        }
      });
      return;
    }

    // Tableau de bord
    if (txt.includes("tableau de bord")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (hasToken) {
          window.location.href = "dashboard.html";
        } else {
          window.location.href = "login.html";
        }
      });
      return;
    }

    // Rédaction
    if (txt.includes("redaction")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (hasToken) {
          window.location.href = "generate.html";
        } else {
          window.location.href = "login.html";
        }
      });
      return;
    }

    // Interprétation
    if (txt.includes("interpretation")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (hasToken) {
          window.location.href = "interpret.html";
        } else {
          window.location.href = "login.html";
        }
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
        if (hasToken) {
          window.location.href = "accompanied.html";
        } else {
          window.location.href = "login.html";
        }
      });
      return;
    }
  });
}

// ---------- Login ----------

function setupLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const emailInput    = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const errorEl       = document.getElementById("loginError");

  form.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("[auth.js] submit loginForm");

  if (errorEl) errorEl.textContent = "";

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  console.log("[auth.js] email =", email, "pwdLen =", password ? password.length : 0);

  if (!email || !password) {
    if (errorEl) errorEl.textContent = "Email et mot de passe requis.";
    return;
  }

  try {
    console.log("[auth.js] calling /auth/login with", email);

    const data = await apiRequest(
      "/auth/login",
      "POST",
      { email, password }
    );

    console.log("[auth.js] login OK, got token?", !!data?.token);

    if (!data || !data.token || !data.user) {
      if (errorEl) {
        errorEl.textContent =
          "Réponse inattendue du serveur. Vérifiez le backend.";
      }
      return;
    }

    saveAuth(data.token, data.user);
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("[auth.js] Erreur login :", err);

    if (errorEl) {
      if (err.status === 401) {
        errorEl.textContent = "Identifiants invalides.";
      } else if (err.message === "Failed to fetch") {
        errorEl.textContent = "Impossible de contacter le serveur.";
      } else {
        errorEl.textContent = err.message || "Erreur lors de la connexion.";
      }
    }
  }
});

}

// ---------- Register ----------

function setupRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const emailInput    = document.getElementById("registerEmail");
  const passwordInput = document.getElementById("registerPassword");
  const languageSelect= document.getElementById("registerLanguage");
  const errorEl       = document.getElementById("registerError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.textContent = "";

    const email           = emailInput ? emailInput.value.trim() : "";
    const password        = passwordInput ? passwordInput.value : "";
    const defaultLanguage = languageSelect ? languageSelect.value : "fr";

    if (!email || !password) {
      if (errorEl) errorEl.textContent = "Email et mot de passe requis.";
      return;
    }

    try {
      const data = await apiRequest(
        "/auth/register",
        "POST",
        { email, password, defaultLanguage },
        false
      );

      if (!data || !data.token || !data.user) {
        if (errorEl) {
          errorEl.textContent =
            "Réponse inattendue du serveur. Vérifiez le backend.";
        }
        return;
      }

      saveAuth(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Erreur register :", err);
      if (errorEl) {
        errorEl.textContent =
          err.message || "Erreur lors de la création du compte.";
      }
    }
  });
}
