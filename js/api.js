// js/api.js
// Helper global pour appeler le backend ContextaLingua
(function () {
  // Stratégie :
  // - Par défaut : API sur la même origine => "/api" (compatible HTTPS, évite PNA)
  // - Override possible via window.API_BASE_URL (ex: en local)

  if (!window.API_BASE_URL) {
    // Si le frontend est servi depuis https://contextalingua.fr
    // alors l'API doit idéalement être accessible via https://contextalingua.fr/api
    window.API_BASE_URL = "/api";
  }

  async function apiRequest(endpoint, method = "GET", body = null, withAuth = true) {
    const headers = { "Content-Type": "application/json" };

    if (withAuth) {
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(window.API_BASE_URL + endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      // Important si vous passez ensuite en cookies/sessions :
      // credentials: "include",
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
      const error = new Error((data && data.message) || response.statusText || "Erreur API");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  window.apiRequest = apiRequest;
})();
