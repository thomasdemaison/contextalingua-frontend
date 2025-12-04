// js/api.js

const API_BASE_URL = "http://localhost:4000/api";

export async function apiRequest(endpoint, method = "GET", data = null, auth = false) {
    const headers = { "Content-Type": "application/json" };

    if (auth) {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No auth token stored.");
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : null
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unknown API error");
    }

    return response.json();
}
