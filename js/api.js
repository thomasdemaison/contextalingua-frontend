// js/api.js
// ------------------------
// Config API
// ------------------------
const API_BASE_URL = "http://localhost:4000/api";

// ------------------------
// Fonctions utilitaires
// ------------------------
async function apiRequest(endpoint, method = "GET", data = null, requireAuth = false) {
    const headers = { "Content-Type": "application/json" };

    if (requireAuth) {
        const token = localStorage.getItem("token");
        if (!token) {
            const err = new Error("Authentification requise.");
            err.status = 401;
            throw err;
        }
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : null
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        // pas de body JSON, on laisse payload à null
    }

    if (!response.ok) {
        const message = payload && payload.message ? payload.message : `Erreur HTTP ${response.status}`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }

    return payload;
}

function saveAuth(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
