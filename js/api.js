// js/api.js
// Helper global pour appeler le backend ContextaLingua

(function () {
  // Si déjà défini quelque part, on le réutilise, sinon on met la valeur par défaut.
  if (!window.API_BASE_URL) {
    window.API_BASE_URL = "http://localhost:4000/api";
  }

  /**
   * Appel générique à l'API backend.
   * @param {string} endpoint - ex : "/auth/login"
   * @param {string} [method="GET"]
   * @param {object|null} [body=null]
   * @param {boolean} [withAuth=true] - inclure ou non le token
   */
  async function apiRequest(endpoint, method = "GET", body = null, withAuth = true) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (withAuth) {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(window.API_BASE_URL + endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    const rawText = await response.text();
    let data = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }
    }

    if (!response.ok) {
      const error = new Error(
        (data && data.message) || response.statusText || "Erreur API"
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // On expose la fonction au scope global
  window.apiRequest = apiRequest;
})();
