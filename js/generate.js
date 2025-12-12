// js/generate.js
// Page "Rédaction" (generate.html) – version simplifiée et très verbeuse

console.log("[generate.js] Fichier chargé.");

document.addEventListener("DOMContentLoaded", () => {
  console.log("[generate.js] DOM chargé, initialisation…");

  const token = localStorage.getItem("token");
  if (!token) {
    console.log("[generate.js] Pas de token, redirection login.");
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("generateForm");
  const submitBtn = document.getElementById("genSubmit");

  if (!form) {
    console.warn("[generate.js] Formulaire introuvable (id=generateForm).");
  } else {
    form.addEventListener("submit", (event) => {
      console.log("[generate.js] ÉVÉNEMENT submit détecté.");
      handleGenerateSubmit(event);
    });
    console.log("[generate.js] Listener 'submit' attaché sur generateForm.");
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", (event) => {
      console.log("[generate.js] ÉVÉNEMENT click sur genSubmit.");
      // On intercepte aussi le click, au cas où le submit ne remonte pas
      handleGenerateSubmit(event);
    });
    console.log("[generate.js] Listener 'click' attaché sur genSubmit.");
  } else {
    console.warn("[generate.js] Bouton genSubmit introuvable.");
  }
});

async function handleGenerateSubmit(event) {
  // On blinde : on empêche TOUT comportement par défaut
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  console.log("[generate.js] handleGenerateSubmit démarré.");

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
  const recipientDescription = recipientEl ? recipientEl.value.trim() : "";
  const draftText = draftEl ? draftEl.value.trim() : "";
  const context = contextEl ? contextEl.value.trim() : "";

  // Vérification minimale
  if (!objective && !draftText) {
    console.log(
      "[generate.js] Validation échouée : ni objectif ni texte de départ."
    );
    if (errorEl) {
      errorEl.textContent =
        "Merci de préciser au minimum un objectif ou un texte de départ.";
    }
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

  console.log("[generate.js] Payload envoyé à /ai/generate :", payload);

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
      console.warn("[generate.js] 401 non autorisé, redirection login.");
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
          "Erreur lors de la génération (" + response.status + ").";
      }
      return false;
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

  // On retourne false pour couper court à toute propagation
  return false;
}
