// js/auth.js
// Gestion du stockage auth + header + login / register

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

// ---------- Utilitaire texte pour le header ----------

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ---------- Initialisation globale ----------

document.addEventListener("DOMContentLoaded", () => {
  setupHeaderNavigation();
  setupLoginForm();
  setupRegisterForm();
});

// ---------- Navigation / header ----------

function setupHeaderNavigation() {
  const user = getCurrentUser();
  const hasToken = isAuthenticated();

  // Affichage / masquage des blocs public / auth
  const publicEls = document.querySelectorAll(".nav-public-only");
  const authEls = document.querySelectorAll(".nav-auth-only");

  publicEls.forEach((el) => {
    el.style.display = hasToken ? "none" : "";
  });
  authEls.forEach((el) => {
    el.style.display = hasToken ? "" : "none";
  });

  // Affichage de l'email dans le header
  const headerEmail = document.getElementById("headerUserEmail");
  if (headerEmail) {
    headerEmail.textContent = hasToken && user && user.email ? user.email : "";
  }

  const clickable = Array.from(document.querySelectorAll("a, button"));
  const normalizeText = (str) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  clickable.forEach((el) => {
    const txt = normalizeText(el.textContent || "");
    if (!txt) return;

    // Bouton explicite de déconnexion
    if (el.id === "btnLogout" || txt.includes("deconnexion")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = "index.html";
      });
      return;
    }

    // Boutons Se connecter (visibles seulement si non connecté)
    if (txt.includes("se connecter")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (hasToken) {
          // Si on est déjà connecté et qu'on clique sur un "Se connecter" résiduel
          window.location.href = "dashboard.html";
        } else {
          window.location.href = "login.html";
        }
      });
      return;
    }

    // "Commencer / Essayer gratuitement"
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

    // "Tableau de bord"
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

    // "Rédaction"
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

    // "Interprétation"
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

    // "Mode accompagné"
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

    // "Commencer / Essayer gratuitement"
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

    // "Tableau de bord"
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

    // "Rédaction"
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

    // "Interprétation"
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

    // "Mode accompagné" (ou "Accompagné")
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

    // Lien explicite "Déconnexion"
    if (txt.includes("deconnexion")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = "index.html";
      });
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
    if (errorEl) errorEl.textContent = "";

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email || !password) {
      if (errorEl) {
        errorEl.textContent = "Email et mot de passe requis.";
      }
      return;
    }

    try {
      const data = await apiRequest(
        "/auth/login",
        "POST",
        { email, password },
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
      console.error("Erreur login :", err);
      if (errorEl) {
        if (err.status === 401) {
          errorEl.textContent = "Identifiants invalides.";
        } else if (err.message === "Failed to fetch") {
          errorEl.textContent =
            "Impossible de contacter le serveur (API hors ligne ?).";
        } else {
          errorEl.textContent =
            err.message || "Erreur lors de la connexion.";
        }
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
    const defaultLanguage = languageSelect
      ? languageSelect.value
      : "fr";

    if (!email || !password) {
      if (errorEl) {
        errorEl.textContent = "Email et mot de passe requis.";
      }
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
