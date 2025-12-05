// api.js — utilisé par toutes les pages sauf login et register

const API_BASE_URL = "http://localhost:4000/api";

async function apiRequest(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Erreur API");
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}
