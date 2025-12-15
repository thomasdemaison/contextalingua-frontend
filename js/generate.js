// js/generate.js
// Page "Rédaction" (generate.html)
// Endpoint : POST /api/ai/generate

document.addEventListener("DOMContentLoaded", () => {
  console.log("[generate.js] DOM chargé, initialisation…");

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  setupGeneratePage();
});

function setupGeneratePage() {
  const languageEl  = document.getElementById("genLanguage");
  const toneEl      = document.getElementById("genTone");
  const objectiveEl = document.getElementById("genObjective");
  const recipientEl = document.getElementById("genRecipient");
  const draftEl     = document.getElementById("genDraft");
  const contextEl   = document.getElementById("genContext");

  const submitBtn = document.getElementById("genSubmit");
  const errorEl   = document.getElementById("genError");
  const resultEl  = document.getElementById("genOutput");

  if (!submitBtn) {
    console.warn("[generate.js] Bouton genSubmit introuvable.");
    return;
  }

  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("[generate.js] Click détecté → lancement génération");

    if (errorEl) errorEl.textContent = "";
    if (resultEl) resultEl.textContent = "";

    const language = languageEl ? (languageEl.value || "fr") : "fr";
    const tone = toneEl ? toneEl.value.trim() : "";
    const objective = objectiveEl ? objectiveEl.value.trim() : "";
    const recipientDescription = recipientEl ? recipientEl.value.trim() : "";
    const draftText = draftEl ? draftEl.value.trim() : "";
    const context = contextEl ? contextEl.value.trim() : "";

    // ✅ pas de garde-fou bloquant : on envoie même si draft vide
    // (vous pourrez remettre une validation ensuite)
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
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

      console.log("[generate.js] Payload envoyé :", payload);

      const data = await apiRequest("/ai/generate", "POST", payload);
      console.log("[generate.js] Réponse brute :", data);

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
      submitBtn.textContent = originalLabel || "Lancer la rédaction";
    }
  });
}
