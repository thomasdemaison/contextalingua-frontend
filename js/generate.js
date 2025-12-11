// js/generate.js
// Page "Rédaction" (generate.html)
// Utilise l'endpoint backend : POST /api/ai/generate

document.addEventListener("DOMContentLoaded", () => {
  // Vérifie la connexion : sinon, retour à login
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  setupGeneratePage();
});

function setupGeneratePage() {
  const languageEl = document.getElementById("genLanguage");
  const toneEl = document.getElementById("genTone");
  const objectiveEl = document.getElementById("genObjective");
  const recipientEl = document.getElementById("genRecipient");
  const draftEl = document.getElementById("genDraft");
  const contextEl = document.getElementById("genContext");

  const submitBtn = document.getElementById("genSubmit");
  const errorEl = document.getElementById("genError");
  const resultEl = document.getElementById("genOutput");

  if (!submitBtn) {
    console.warn("[generate.js] Bouton genSubmit introuvable.");
    return;
  }

  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // par sécurité : au cas où

    if (errorEl) errorEl.textContent = "";
    if (resultEl) resultEl.textContent = "";

    const language = languageEl ? languageEl.value || "fr" : "fr";
    const tone = toneEl ? toneEl.value.trim() : "";
    const objective = objectiveEl ? objectiveEl.value.trim() : "";
    const recipientDescription = recipientEl
      ? recipientEl.value.trim()
      : "";
    const draftText = draftEl ? draftEl.value.trim() : "";
    const context = contextEl ? contextEl.value.trim() : "";

    // Exige au moins un objectif ou un texte de départ
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

      if (!data || !data.ok || !data.result) {
        throw new Error("Réponse inattendue du moteur de rédaction.");
      }

      if (resultEl) {
        resultEl.textContent = data.result.text || "";
      }
    } catch (err) {
      console.error("[generate.js] Erreur /ai/generate :", err);
      if (errorEl) {
        errorEl.textContent =
          err.message ||
          "Une erreur est survenue lors de la génération.";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Lancer la rédaction";
    }
  });
}
