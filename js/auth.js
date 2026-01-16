// js/auth.js
// Gestion de l'authentification + header (espace public / espace utilisateur)

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
  }
