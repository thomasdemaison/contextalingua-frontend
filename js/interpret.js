// js/interpret.js
// Page "Interprétation" (interpret.html)
// Utilise l'endpoint backend : POST /api/ai/interpret
// Objectifs :
// - Rediriger si non connecté
// - Ne PAS demander la langue d'origine (détection côté IA)
// - Ajouter un debug (requête envoyée) uniquement pour SUPERADMIN
// - Éviter les erreurs de scope type "language is not defined"

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    setupInterpretPage();
  } catch (err) {
    console.error("[interpret.js] Erreur setupInterpretPage :", err);
  }
});

/* -------------------- Helpers -------------------- */

function isSuperAdmin() {
  try {
    const u = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    return !!(u && u.role === "superadmin");
  } catch {
    return false;
  }
}

function ensureInterpretDebugUI() {
  let wrap = document.getElementById("intDebugWrap");
  if (wrap) return wrap;

  const outEl = document.getElementById("intOutput");
  if (!outEl || !outEl.parentElement) return null;

  wrap = document.createElement("div");
  wrap.id = "intDebugWrap";
  wrap.style.marginTop = "14px";

  const title = document.createElement("h4");
  title.textContent = "Debug – Requête envoyée (copiable)";
  title.style.margin = "10px 0 6px";
  title.style.color = "var(--text-strong)";

  const pre = document.createElement("pre");
  pre.id = "intDebugPayload";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.fontSize = "0.85rem";
  pre.style.color = "var(--text-muted)";
  pre.style.background = "#020617";
  pre.style.borderRadius = "12px";
  pre.style.padding = "12px";
  pre.style.border = "1px solid var(--border-subtle)";
  pre.style.minHeight = "60px";
  pre.textContent = "(la requête apparaîtra ici après clic sur “Interpréter le message”)";

  const btnCopy = document.createElement("button");
  btnCopy.type = "button";
  btnCopy.className = "btn btn-secondary";
  btnCopy.style.marginTop = "8px";
  btnCopy.textContent = "Copier la requête";

  btnCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent || "");
      btnCopy.textContent = "Copié ✓";
      setTimeout(() => (btnCopy.textContent = "Copier la requête"), 1200);
    } catch (e) {
      btnCopy.textContent = "Copie impossible";
      setTimeout(() => (btnCopy.textContent = "Copier la requête"), 1200);
    }
  });

  wrap.appendChild(title);
  wrap.appendChild(pre);
  wrap.appendChild(btnCopy);

  outEl.parentElement.appendChild(wrap);
  return wrap;
}

/* -------------------- Main -------------------- */

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

    // Nettoyage UI
    if (errorEl) errorEl.textContent = "";
    if (resultEl) resultEl.textContent = "";

    // Valeurs (bien dans le scope !)
    const language = (languageEl && languageEl.value) ? languageEl.value : "fr";
    const questionType = (questionTypeEl && questionTypeEl.value)
      ? questionTypeEl.value
      : "analyse_globale";
    const textToInterpret = textEl ? (textEl.value || "").trim() : "";
    const context = contextEl ? (contextEl.value || "").trim() : "";

    if (!textToInterpret) {
      if (errorEl) errorEl.textContent = "Merci de coller le texte à analyser.";
      return;
    }

    // Payload envoyé au backend
    const payload = {
      language,           // langue de la réponse souhaitée
      questionType,       // type d'analyse
      textToInterpret,    // texte collé
      context             // contexte optionnel
      // IMPORTANT : pas de langue d'origine -> l'IA déduira
    };

    // Debug superadmin uniquement
    if (isSuperAdmin()) {
      ensureInterpretDebugUI();
      const pre = document.getElementById("intDebugPayload");
      if (pre) pre.textContent = JSON.stringify(payload, null, 2);
    }

    // UI état chargement
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Camille analyse…";

    try {
      const data = await apiRequest("/ai/interpret", "POST", payload);

      // Formats possibles selon votre backend
      // - { ok: true, result: { text: "..." } }
      // - { result: "..." }
      // - { text: "..." }
      const text =
        data?.result?.text ??
        data?.result ??
        data?.text ??
        "";

      if (!text) {
        throw new Error("Réponse inattendue du moteur d'interprétation.");
      }

      if (resultEl) resultEl.textContent = text;
    } catch (err) {
      console.error("[interpret.js] Erreur /ai/interpret :", err);
      if (errorEl) {
        if (err?.message === "Failed to fetch") {
          errorEl.textContent = "Impossible de contacter le serveur (API hors ligne ?).";
        } else {
          errorEl.textContent = err?.message || "Une erreur est survenue lors de l’analyse.";
        }
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel || "Interpréter le message";
    }
  });
}
