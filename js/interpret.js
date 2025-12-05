// js/interpret.js

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    setupInterpretForm();
});

function setupInterpretForm() {
    const form = document.getElementById("interpretForm");
    if (!form) return;

    const inputEl = document.getElementById("interpretInput");
    const contextEl = document.getElementById("interpretContext");
    const languageSelect = document.getElementById("interpretLanguage");
    const resultEl = document.getElementById("interpretResult");
    const statusEl = document.getElementById("interpretStatus");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (statusEl) {
            statusEl.textContent = "Camille analyse votre message...";
        }
        if (resultEl) {
            resultEl.textContent = "";
        }

        const inputText = inputEl ? inputEl.value.trim() : "";
        const context = contextEl ? contextEl.value.trim() : "";
        const language = languageSelect
            ? languageSelect.value
            : "fr";

        if (!inputText) {
            if (statusEl) {
                statusEl.textContent =
                    "Merci de coller le message à interpréter.";
            }
            return;
        }

        try {
            const data = await apiRequest(
                "/ai/interpret",
                "POST",
                {
                    language,
                    inputText,
                    context: context || null
                },
                true
            );

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
                        "Analyse terminée. Crédits restants : " +
                        data.remainingCredits;
                } else {
                    statusEl.textContent = "Analyse terminée.";
                }
            }
        } catch (err) {
            console.error("Erreur /ai/interpret :", err);
            if (statusEl) {
                statusEl.textContent =
                    err.message ||
                    "Erreur lors de l’interprétation.";
            }
        }
    });
}
