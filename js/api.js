// js/api.js
// Helper global pour appeler le backend ContextaLingua

(function () {
  // Définition de base : peut être surchargée avant chargement de api.js
  // Exemple: window.API_BASE_URL = "https://api.contextalingua.fr/api";
  if (!window.API_BASE_URL) {
    window.API_BASE_URL = "http://localhost:4000/api";
  }

  async function apiRequest(endpoint, method = "GET", body = null, withAuth = true) {
    const headers = { "Content-Type": "application/json" };

    if (withAuth) {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const url = window.API_BASE_URL + endpoint;

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });
    } catch (networkErr) {
      const err = new Error("Failed to fetch");
      err.cause = networkErr;
      throw err;
    }

    const rawText = await response.text();
    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText; // fallback
      }
    }

    if (!response.ok) {
      const msg =
        (data && typeof data === "object" && data.message) ||
        response.statusText ||
        "Erreur API";

      const error = new Error(msg);
      error.status = response.status;
      error.data = data;
      error.url = url;
      throw error;
    }

    return data;
  }

  window.apiRequest = apiRequest;
})();
