// js/generate.js
// Page "Rédaction" (generate.html) – sans balise <form>

console.log("[generate.js] Fichier chargé.");

document.addEventListener("DOMContentLoaded", () => {
  console.log("[generate.js] DOM chargé, initialisation…");

  const token = localStorage.getItem("token");
  if (!token) {
    console.log("[generate.js] Pas de token, redirection login.");
    window.location.href = "login.html";
    return;
  }

  const submitBtn = document.getElementById("genSubmit");
  if (!submitBtn) {
    console.warn("[generate.js] Bouton genSubmit introuvable.");
    return;
  }

  submitBtn.addEventListener("click", async (event) => {
    console.log("[generate.js] Clic sur genSubmit.");
    await handleGenerateClick(event);
  });
  console.log("[generate.js] Listener 'click' attaché sur genSubmit.");
});

async function handleGenerateClick(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  console.log("[generate.js] handleGenerateClick démarré.");

  const languageEl  = document.getElementById("genLanguage");
  const toneEl      = document.getElementById("genTone");
  const objectiveEl = document.getElementById("genObjective");
  const recipientEl = document.getElementById("genRecipient");
  const draftEl     = document.getElementById("genDraft");
  const contextEl   = document.getElementById("genContext");

  const submitBtn = document.getElementById("genSubmit");
  const errorEl   = document.getElementById("genError");
  const resultEl  = document.getElementById("genOutput");

  if (errorEl)  errorEl.textContent = "";
  if (resultEl) resultEl.textContent = "";

  const language            = languageEl ? languageEl.value || "fr" : "fr";
  const tone                = toneEl ? toneEl.value.trim() : "";
  const objective           = objectiveEl ? objectiveEl.value.trim() : "";
  const recipientDescription= recipientEl ? recipientEl.value.trim() : "";
  const draftText           = draftEl ? draftEl.value.trim() : "";
  const context             = contextEl ? contextEl.value.trim() : "";

  if (!objective && !draftText) {
    console.log("[generate.js] Validation : objectif ET texte de départ vides.");
    if (errorEl) {
      errorEl.textContent =
        "Merci de préciser au minimum un objectif ou un texte de départ.";
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Camille rédige…";
  }

  const payload = {
    language,
    tone,
    objective,
    recipientDescription,
    draftText,
    context,
  };

  console.log("[generate.js] Payload → /ai/generate :", payload);

  try {
    const API_BASE_URL = window.API_BASE_URL || "http://localhost:4000/api";
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(payload),
    });

    console.log(
      "[generate.js] Réponse brute /ai/generate :",
      response.status,
      response.statusText
    );

    if (response.status === 401) {
      console.warn("[generate.js] 401 → déconnexion et retour login.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "[generate.js] Réponse non OK :",
        response.status,
        text
      );
      if (errorEl) {
        errorEl.textContent =
          "Erreur lors de la génération (" + response.status + ").";
      }
      return;
    }

    const data = await response.json();
    console.log("[generate.js] JSON /ai/generate :", data);

    const finalText = data?.result?.text || data?.text || "";
    if (resultEl) {
      resultEl.textContent = finalText || "(aucun texte généré)";
    }
  } catch (err) {
    console.error("[generate.js] Exception fetch /ai/generate :", err);
    if (errorEl) {
      errorEl.textContent =
        err.message || "Une erreur est survenue lors de la génération.";
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Lancer la rédaction";
    }
  }
}
