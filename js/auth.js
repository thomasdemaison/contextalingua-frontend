// js/auth.js
import { apiRequest, saveAuth, clearAuth, getCurrentUser } from "./api.js";

function setupLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const errorEl = document.getElementById("loginError");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.textContent = "";

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const data = await apiRequest("/auth/login", "POST", { email, password });
            saveAuth(data.token, data.user);
            window.location.href = "dashboard.html";
        } catch (err) {
            console.error(err);
            if (errorEl) errorEl.textContent = err.message || "Échec de la connexion.";
        }
    });
}

function setupRegisterForm() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    const errorEl = document.getElementById("registerError");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.textContent = "";

        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        const defaultLanguage = document.getElementById("registerLanguage").value || "fr";

        try {
            const data = await apiRequest("/auth/register", "POST", {
                email,
                password,
                defaultLanguage
            });
            saveAuth(data.token, data.user);
            window.location.href = "dashboard.html";
        } catch (err) {
            console.error(err);
            if (errorEl) errorEl.textContent = err.message || "Échec de la création de compte.";
        }
    });
}

function setupLogoutLinks() {
    const links = document.querySelectorAll("[data-logout]");
    links.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            clearAuth();
            window.location.href = "login.html";
        });
    });
}

function updateHeaderUser() {
    const user = getCurrentUser();
    const el = document.getElementById("headerUserEmail");
    if (el && user && user.email) {
        el.textContent = user.email;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupLoginForm();
    setupRegisterForm();
    setupLogoutLinks();
    updateHeaderUser();
});
