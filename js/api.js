// js/api.js

const API_BASE_URL = "http://localhost:4000/api"; // adapter quand tu déploieras l'API

export async function apiRequest(endpoint, method = "GET", data = null, auth = false) {
    const headers = { "Content-Type": "application/json" };

    if (auth) {
        const token = localStorage.getItem("token");
        if (!token) {
            const error = new Error("Authentification requise.");
            error.status = 401;
            throw error;
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
        // pas grave, on gère plus bas
    }

    if (!response.ok) {
        const message = payload && payload.message ? payload.message : `HTTP ${response.status}`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }

    return payload;
}

export function saveAuth(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}

export function getCurrentUser() {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}
