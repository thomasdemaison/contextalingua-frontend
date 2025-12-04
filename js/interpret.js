// js/interpret.js
import { apiRequest, clearAuth, getCurrentUser } from "./api.js";

function protectPage() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "login.html";
    }
}

async function submitInterpret() {
    const inputText = document.getElementById("intInputText").value;
    const explanationLanguage = document.getElementById("intExplanationLanguage").value;
    const context = document.getElementById("intContext").value;
    const recipientRole = document.getElementById("intRecipientRole").value;

    const outputEl = document.getElementById("intOutput");
    const errorEl = document.getElementById("intError");

    if (errorEl) errorEl.textContent = "";
    if (outputEl) outputEl.textContent = "";

    if (!inputText || !explanationLanguage) {
        if (errorEl) errorEl.textContent = "Texte et langue d'explication sont obligatoires.";
        return;
    }

    try {
        const result = await apiRequest(
            "/ai/interpret",
            "POST",
            {
                inputText,
                explanationLanguage,
                context,
                recipientRole
            },
            true
        );

        if (outputEl) outputEl.textContent = result.outputText || "";

    } catch (err) {
        console.error(err);
        if (err.status === 401) {
            clearAuth();
            window.location.href = "login.html";
            return;
        }
        if (errorEl) errorEl.textContent = err.message || "Erreur lors de l’interprétation.";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    protectPage();
    const btn = document.getElementById("intSubmit");
    if (btn) {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            submitInterpret();
        });
    }
});
