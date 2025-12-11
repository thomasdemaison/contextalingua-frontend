// js/generate.js
// Page "Rédaction" (generate.html)
// Appel direct au backend : POST /api/ai/generate

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("[generate.js] Pas de token, redirection login.");
    window.location.href = "login.html";
    return;
  }

  console.log("[generate.js] DOM chargé, initialisation…");
});

// Fonction appelée directement par le bouton via onclick
async function handleGenerateClick(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  console.log("[generate.js] Clic sur Lancer la rédaction");

  const languageEl = document.getElementById("genLanguage");
  const toneEl = document.getElementById("genTone");
  const objectiveEl = document.getElementById("genObjective");
  const recipientEl = document.getElementById("genRecipient");
  const draftEl = document.getElementById("genDraft");
  const contextEl = document.getElementById("genContext");

  const submitBtn = document.getElementById("genSubmit");
  const errorEl = document.getElementById("genError");
  const resultEl = document.getElementById("genOutput");

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

  // Validation minimale
  if (!objective && !draftText) {
    if (errorEl) {
      errorEl.textContent =
        "Merci de préciser au minimum un objectif ou un texte de départ.";
    }
    console.log(
      "[generate.js] Validation échouée : ni objectif ni texte de départ."
    );
    return false;
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

  console.log(
    "[generate.js] Envoi à /ai/generate avec payload :",
    payload
  );

  try {
    const API_BASE_URL =
      window.API_BASE_URL || "http://localhost:4000/api";
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
      console.warn(
        "[generate.js] 401 non autorisé, redirection login."
      );
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
      return false;
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
          "Erreur lors de la génération (" +
          response.status +
          ").";
      }
      return false;
    }

    const data = await response.json();
    console.log("[generate.js] JSON /ai/generate :", data);

    const finalText = data?.result?.text || data?.text || "";
    if (resultEl) {
      resultEl.textContent = finalText;
    }
  } catch (err) {
    console.error("[generate.js] Exception fetch /ai/generate :", err);
    if (errorEl) {
      errorEl.textContent =
        err.message ||
        "Une erreur est survenue lors de la génération.";
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Lancer la rédaction";
    }
  }

  // Ceinture + bretelles : on retourne false
  return false;
}
