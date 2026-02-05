// js/api.js
// Objectif : API_BASE_URL fiable + override simple
// - Par défaut : même origine => "/api" (si vous avez un reverse proxy)
// - Override possible via :
//   1) window.API_BASE_URL (recommandé)
//   2) localStorage("API_BASE_URL") (pratique en dev)
//   3) fallback local si on est sur localhost

(function () {
  function guessDefaultApiBase() {
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      return "http://localhost:4000/api";
    }

    // Si tu es sur contextalingua.fr, API sur api.contextalingua.fr
    if (location.hostname.endsWith("contextalingua.fr")) {
      return "https://api.contextalingua.fr/api";
    }

    // fallback générique
    return "https://api.contextalingua.fr/api";
  }

  const fromWindow = typeof window !== "undefined" ? window.API_BASE_URL : null;
  const fromStorage = (() => {
    try {
      return localStorage.getItem("API_BASE_URL");
    } catch {
      return null;
    }
  })();

  const API_BASE_URL = (fromWindow || fromStorage || guessDefaultApiBase()).replace(/\/+$/, "");
  window.API_BASE_URL = API_BASE_URL; // exposé pour debug

  console.log("[api.js] API_BASE_URL =", API_BASE_URL);

  async function apiRequest(path, method = "GET", body = null) {
    const token = localStorage.getItem("token");
    const url = API_BASE_URL + (path.startsWith("/") ? path : "/" + path);

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const options = {
      method,
      headers,
      // IMPORTANT: si vous utilisez des cookies côté API, mettez credentials:"include"
      // credentials: "include",
    };

    if (body && method !== "GET") options.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(url, options);
    } catch (e) {
      const err = new Error("Failed to fetch");
      err.status = 0;
      throw err;
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!res.ok) {
      const err = new Error((data && data.message) || "Erreur API");
      err.status = res.status;
      err.data = data;
      err.url = url;
      throw err;
    }

    return data;
  }

  // Helpers pratiques pour vous (dev)
  window.apiRequest = apiRequest;
  window.setApiBaseUrl = function (value) {
    localStorage.setItem("API_BASE_URL", value);
    console.log("[api.js] API_BASE_URL set to", value, "→ rechargez la page");
  };
})();
