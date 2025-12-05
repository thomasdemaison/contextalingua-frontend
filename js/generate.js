// js/generate.js

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    setupGenerateForm();
});

function setupGenerateForm() {
    const form = document.getElementById("generateForm");
    if (!form) return;

    const contextInput = document.getElementById("generateContext");
    const initialTextInput = document.getElementById("generateInput");
    const languageSelect = document.getElementById("generateLanguage");
    const resultEl = document.getElementById("generateResult");
    const statusEl = document.getElementById("generateStatus");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (statusEl) {
            statusEl.textContent = "Camille réfléchit...";
        }
        if (resultEl) {
            resultEl.textContent = "";
        }

        const context = contextInput ? contextInput.value.trim() : "";
        const initialText = initialTextInput
            ? initialTextInput.value.trim()
            : "";
        const language = languageSelect
            ? languageSelect.value
            : "fr";

        try {
            const data = await apiRequest(
                "/ai/generate",
                "POST",
                {
                    language,
                    context,
                    inputText: initialText || null
                },
                true
            );

            // On essaie plusieurs clés possibles pour le texte renvoyé
            const output =
                data.outputText ||
                data.output ||
                data.text ||
                (data.result &&
                    (data.result.outputText ||
                        data.result.text)) ||
                JSON.stringify(data, null, 2);

            if (resultEl) {
                resultEl.textContent = output;
            }

            if (statusEl) {
                if (typeof data.remainingCredits === "number") {
                    statusEl.textContent =
                        "Génération terminée. Crédits restants : " +
                        data.remainingCredits;
                } else {
                    statusEl.textContent = "Génération terminée.";
                }
            }
        } catch (err) {
            console.error("Erreur /ai/generate :", err);
            if (statusEl) {
                statusEl.textContent =
                    err.message ||
                    "Erreur lors de la génération.";
            }
        }
    });
}
