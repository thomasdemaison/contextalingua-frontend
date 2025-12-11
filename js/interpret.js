// js/interpret.js
// Page "Interprétation" (interpret.html)
// Utilise l'endpoint backend : POST /api/ai/interpret

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  setupInterpretPage();
});

function setupInterpretPage() {
  const languageEl = document.getElementById("intLanguage");
  const questionTypeEl = document.getElementById("intQuestionType");
  const textEl = document.getElementById("intText");
  const contextEl = document.getElementById("intContext");

  const submitBtn = document.getElementById("intSubmit");
  const errorEl = document.getElementById("intError");
  const resultEl = document.getElementById("intOutput");

  if (!submitBtn) {
    console.warn("[interpret.js] Bouton intSubmit introuvable.");
    return;
  }

  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (errorEl) errorEl.textContent = "";
    if (resultEl) resultEl.textContent = "";

    const language = languageEl ? languageEl.value || "fr" : "fr";
    const questionType = questionTypeEl
      ? questionTypeEl.value || "analyse_globale"
      : "analyse_globale";
    const textToInterpret = textEl ? textEl.value.trim() : "";
    const context = contextEl ? contextEl.value.trim() : "";

    if (!textToInterpret) {
      if (errorEl) {
        errorEl.textContent =
          "Merci de coller le texte à analyser.";
      }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Camille analyse…";

    try {
      const payload = {
        language,
        questionType,
        textToInterpret,
        context,
      };

      const data = await apiRequest(
        "/ai/interpret",
        "POST",
        payload
      );

      if (!data || !data.ok || !data.result) {
        throw new Error(
          "Réponse inattendue du moteur d'interprétation."
        );
      }

      if (resultEl) {
        resultEl.textContent = data.result.text || "";
      }
    } catch (err) {
      console.error("[interpret.js] Erreur /ai/interpret :", err);
      if (errorEl) {
        errorEl.textContent =
          err.message ||
          "Une erreur est survenue lors de l’analyse.";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Interpréter le message";
    }
  });
}
