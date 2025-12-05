// js/auth.js

document.addEventListener("DOMContentLoaded", () => {
    setupHeaderNavigation();
    setupLoginForm();
    setupRegisterForm();
    setupLogout();
});

// ---- Utils ----

function normalizeText(str) {
    return (str || "")
        .toLowerCase()
        // on enlève les accents pour éviter les soucis de comparaison
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// ---------- Navigation globale (header + CTA) ----------

function setupHeaderNavigation() {
    const user = getCurrentUser();
    const hasToken = !!localStorage.getItem("token");

    const clickable = Array.from(document.querySelectorAll("a, button"));

    clickable.forEach((el) => {
        const textRaw = (el.textContent || "");
        const text = normalizeText(textRaw);

        if (!text) return;

        // "Se connecter"
        if (text.includes("se connecter")) {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "login.html";
                }
            });
        }

        // "Commencer gratuitement" OU "Essayer gratuitement"
        if (
            text.includes("commencer gratuitement") ||
            text.includes("essayer gratuitement")
        ) {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "register.html";
                }
            });
        }

        // "Tableau de bord"
        if (text.includes("tableau de bord")) {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "login.html";
                }
            });
        }

        // "Rédaction"
        if (text.includes("redaction")) {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    window.location.href = "generate.html";
                } else {
                    window.location.href = "login.html";
                }
            });
        }

        // "Interprétation"
        if (text.includes("interpretation")) {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (hasToken) {
                    window.location.href = "interpret.html";
                } else {
                    window.location.href = "login.html";
                }
            });
        }

        // "Déconnexion"
        if (text.includes("deconnexion")) {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                clearAuth();
                window.location.href = "index.html";
            });
        }
    });

    // Email dans le header, si présent
    const headerEmail = document.getElementById("headerUserEmail");
    if (headerEmail && user && user.email) {
        headerEmail.textContent = user.email;
    }
}

// ---------- Détection robuste du formulaire de login ----------

function setupLoginForm() {
    // 1) On essaie d'abord par ID explicite
    let form = document.getElementById("loginForm");

    // 2) Sinon, on cherche le 1er form qui contient email + mot de passe
    if (!form) {
        const forms = document.querySelectorAll("form");
        for (const f of forms) {
            const emailField = f.querySelector(
                'input[type="email"], input[name*="email" i]'
            );
            const pwdField = f.querySelector('input[type="password"]');
            const innerText = normalizeText(f.innerText || "");
            if (emailField && pwdField && innerText.includes("connexion")) {
                form = f;
                break;
            }
        }
    }

    if (!form) return; // pas de formulaire de connexion sur cette page

    // On identifie les champs
    const emailInput =
        form.querySelector("#loginEmail") ||
        form.querySelector('input[type="email"], input[name*="email" i]');
    const passwordInput =
        form.querySelector("#loginPassword") ||
        form.querySelector('input[type="password"]');
    const errorEl =
        document.getElementById("loginError") ||
        form.querySelector(".auth-error");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.textContent = "";

        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        if (!email || !password) {
            if (errorEl)
                errorEl.textContent = "Email et mot de passe requis.";
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

            // redirection directe vers le dashboard
            window.location.href = "dashboard.html";
        } catch (err) {
            console.error("Erreur login :", err);
            if (errorEl) {
                if (err.status === 401) {
                    errorEl.textContent = "Identifiants invalides.";
                } else if (err.message === "Failed to fetch") {
                    errorEl.textContent =
                        "Impossible de contacter le serveur (backend éteint ?).";
                } else {
                    errorEl.textContent =
                        err.message || "Erreur lors de la connexion.";
                }
            }
        }
    });
}

// ---------- Détection robuste du formulaire de register ----------

function setupRegisterForm() {
    let form = document.getElementById("registerForm");

    if (!form) {
        const forms = document.querySelectorAll("form");
        for (const f of forms) {
            const emailField = f.querySelector(
                'input[type="email"], input[name*="email" i]'
            );
            const pwdField = f.querySelector('input[type="password"]');
            const innerText = normalizeText(f.innerText || "");
            if (
                emailField &&
                pwdField &&
                (innerText.includes("creer un compte") ||
                    innerText.includes("inscription"))
            ) {
                form = f;
                break;
            }
        }
    }

    if (!form) return;

    const emailInput =
        form.querySelector("#registerEmail") ||
        form.querySelector('input[type="email"], input[name*="email" i]');
    const passwordInput =
        form.querySelector("#registerPassword") ||
        form.querySelector('input[type="password"]');
    const languageSelect =
        form.querySelector("#registerLanguage") ||
        form.querySelector("select[name*='language' i]");
    const errorEl =
        document.getElementById("registerError") ||
        form.querySelector(".auth-error");

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
                { email, password, defaultLanguage },
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
