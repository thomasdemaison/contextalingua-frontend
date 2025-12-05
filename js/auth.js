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

  // Afficher l'email si un élément est prévu
  const headerEmail = document.getElementById("headerUserEmail");
  if (headerEmail && user && user.email) {
    headerEmail.textContent = user.email;
  }

  const clickable = Array.from(document.querySelectorAll("a, button"));

  clickable.forEach((el) => {
    const txt = normalizeText(el.textContent || "");
    if (!txt) return;

    // Bouton connexion : si connecté, on le transforme en "Déconnexion"
    if (txt.includes("se connecter")) {
      if (hasToken) {
        el.textContent = "Déconnexion";
        el.addEventListener("click", (e) => {
          e.preventDefault();
          clearAuth();
          window.location.href = "index.html";
        });
      } else {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          window.location.href = "login.html";
        });
      }
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
