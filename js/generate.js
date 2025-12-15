// js/generate.js
// Page "Rédaction" (generate.html)
// Utilise l'endpoint backend : POST /api/ai/generate

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  setupGeneratePage();
});

function setupGeneratePage() {
  const formEl = document.getElementById("generateForm");

  const languageEl  = document.getElementById("genLanguage");
  const toneEl      = document.getElementById("genTone");
  const objectiveEl = document.getElementById("genObjective");
  const recipientEl = document.getElementById("genRecipient");
  const draftEl     = document.getElementById("genDraft");
  const contextEl   = document.getElementById("genContext");

  const submitBtn = document.getElementById("genSubmit");
  const errorEl   = document.getElementById("genError");
  const resultEl  = document.getElementById("genOutput");

  if (!formEl) {
    console.warn("[generate.js] Formulaire generateForm introuvable.");
    return;
  }
  if (!submitBtn) {
    console.warn("[generate.js] Bouton genSubmit introuvable.");
    return;
  }

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (errorEl) errorEl.textContent = "";
    if (resultEl) resultEl.textContent = "";

    const language = languageEl ? (languageEl.value || "fr") : "fr";
    const tone = toneEl ? toneEl.value.trim() : "";
    const objective = objectiveEl ? objectiveEl.value.trim() : "";
    const recipientDescription = recipientEl ? recipientEl.value.trim() : "";
    const draftText = draftEl ? draftEl.value.trim() : "";
    const context = contextEl ? contextEl.value.trim() : "";

    // Garde-fou : on veut au moins un objectif OU un brouillon
    if (!objective && !draftText) {
      if (errorEl) {
        errorEl.textContent =
          "Merci de préciser au minimum un objectif ou un texte de départ.";
      }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Camille rédige…";

    try {
      const payload = {
        language,
        tone,
        objective,
        recipientDescription,
        draftText,
        context,
      };

      const data = await apiRequest("/ai/generate", "POST", payload);

      // On accepte plusieurs formats pour être tolérant côté backend
      const text =
        data?.result?.text ??
        data?.result ??
        data?.text ??
        "";

      if (!text) {
        throw new Error("Réponse inattendue du moteur de génération.");
      }

      if (resultEl) resultEl.textContent = text;
    } catch (err) {
      console.error("[generate.js] Erreur /ai/generate :", err);
      if (errorEl) {
        errorEl.textContent =
          err.message || "Une erreur est survenue lors de la génération.";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Lancer la rédaction";
    }
  });
}
