// js/api.js

// À adapter plus tard si tu as une URL de prod (Cloudflare)
// Pour l’instant : backend local
const API_BASE_URL = "http://localhost:4000/api";

/**
 * Appel générique à l'API ContextaLingua.
 *
 * @param {string} path - Chemin après /api, ex : "/auth/login"
 * @param {string} method - Méthode HTTP (GET, POST, etc.)
 * @param {object|null} body - Corps JSON éventuel
 * @param {boolean} withAuth - true pour envoyer le token Bearer
 */
async function apiRequest(path, method = "GET", body = null, withAuth = false) {
    const url = API_BASE_URL + path;
    const headers = {
        "Content-Type": "application/json"
    };

    if (withAuth) {
        const token = localStorage.getItem("token");
        if (token) {
            headers["Authorization"] = "Bearer " + token;
        }
    }

    const options = {
        method,
        headers
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(url, options);
    } catch (err) {
        console.error("Erreur réseau vers", url, ":", err);
        throw new Error("Failed to fetch");
    }

    let data = null;
    const text = await response.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { raw: text };
        }
    }

    if (!response.ok) {
        const error = new Error(data && data.message ? data.message : "Erreur API");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

// ---- Gestion auth / utilisateur ----

function saveAuth(token, user) {
    if (token) {
        localStorage.setItem("token", token);
    }
    if (user) {
        localStorage.setItem("user", JSON.stringify(user));
    }
}

function getCurrentUser() {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.warn("Impossible de parser l’utilisateur stocké.");
        return null;
    }
}

function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}
