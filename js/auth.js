// js/auth.js

document.addEventListener("DOMContentLoaded", () => {
    setupHeaderNavigation();
    setupLoginForm();
    setupRegisterForm();
    setupLogout();
});

// ---------- Navigation globale (header + CTA) ----------

function setupHeaderNavigation() {
    const user = getCurrentUser();
    const hasToken = !!localStorage.getItem("token");

    // Liens et boutons à analyser (header + body)
    const clickable = Array.from(
        document.querySelectorAll("a, button")
    );

    clickable.forEach((el) => {
        const text = (el.textContent || "").trim().toLowerCase();

        if (!text) return;

        // Se connecter
        if (text === "se connecter") {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "login.html";
                }
            });
        }

        // Commencer gratuitement
        if (text === "commencer gratuitement") {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    // Tu peux choisir dashboard ou generate
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "register.html";
                }
            });
        }

        // Tableau de bord
        if (text === "tableau de bord") {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "login.html";
                }
            });
        }

        // Rédaction
        if (text === "rédaction") {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    window.location.href = "generate.html";
                } else {
                    window.location.href = "login.html";
                }
            });
        }

        // Interprétation
        if (text === "interprétation") {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    window.location.href = "interpret.html";
                } else {
                    window.location.href = "login.html";
                }
            });
        }

        // Déconnexion
        if (text === "déconnexion") {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                clearAuth();
                window.location.href = "index.html";
            });
        }
    });

    // Affichage de l’email dans le header, si tu as un span dédié
    const headerEmail = document.getElementById("headerUserEmail");
    if (headerEmail && user && user.email) {
        headerEmail.textContent = user.email;
    }
}

// ---------- Login ----------

function setupLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const errorEl = document.getElementById("loginError");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.textContent = "";

        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        if (!email || !password) {
            if (errorEl) errorEl.textContent = "Email et mot de passe requis.";
            return;
        }

        try {
            const data = await apiRequest(
                "/auth/login",
                "POST",
                { email, password },
                false
            );

            const { token, user } = data;
            saveAuth(token, user);

            window.location.href = "dashboard.html";
        } catch (err) {
            console.error("Erreur login :", err);
            if (errorEl) {
                if (err.status === 401) {
                    errorEl.textContent = "Identifiants invalides.";
                } else {
                    errorEl.textContent =
                        err.message || "Erreur lors de la connexion.";
                }
            }
        }
    });
}

// ---------- Register ----------

function setupRegisterForm() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const languageSelect = document.getElementById("registerLanguage");
    const errorEl = document.getElementById("registerError");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.textContent = "";

        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";
        const defaultLanguage = languageSelect
            ? languageSelect.value
            : "fr";

        if (!email || !password) {
            if (errorEl)
                errorEl.textContent = "Email et mot de passe requis.";
            return;
        }

        try {
            const data = await apiRequest(
                "/auth/register",
                "POST",
                {
                    email,
                    password,
                    defaultLanguage
                },
                false
            );

            const { token, user } = data;
            saveAuth(token, user);

            window.location.href = "dashboard.html";
        } catch (err) {
            console.error("Erreur register :", err);
            if (errorEl) {
                errorEl.textContent =
                    err.message ||
                    "Erreur lors de la création du compte.";
            }
        }
    });
}

// ---------- Déconnexion (bouton dédié éventuel) ----------

function setupLogout() {
    const logoutBtn = document.getElementById("logoutButton");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = "index.html";
    });
}
