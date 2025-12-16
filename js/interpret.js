// js/interpret.js
// Page "Interprétation" (interpret.html)
// + Import automatique du brief du Mode accompagné (camilleBriefV1)

const CAMILLE_BRIEF_KEY = "camilleBriefV1";

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  importCamilleBriefIntoInterpret();
  setupInterpretPage();
});

function importCamilleBriefIntoInterpret() {
  let payload = null;
  try {
    const raw = localStorage.getItem(CAMILLE_BRIEF_KEY);
    if (!raw) return;
    payload = JSON.parse(raw);
  } catch (e) {
    console.warn("[interpret] brief JSON parse error:", e);
    return;
  }

  const briefData = payload?.briefData;
  if (!briefData || briefData.mode !== "interpret" || !briefData.form) return;

  const map = briefData.form;

  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? "";
  };

  setVal("intLanguage", map.intLanguage);
  setVal("intQuestionType", map.intQuestionType);
  setVal("intText", map.intText);
  setVal("intContext", map.intContext);

  showImportBanner("Brief importé depuis le Mode accompagné ✓");
}

function showImportBanner(text) {
  const submitBtn = document.getElementById("intSubmit");
  if (!submitBtn) return;

  if (document.getElementById("camilleImportBanner")) return;

  const div = document.createElement("div");
  div.id = "camilleImportBanner";
  div.textContent = text;
  div.style.margin = "10px 0 14px";
  div.style.padding = "10px 12px";
  div.style.borderRadius = "12px";
  div.style.border = "1px solid var(--border-subtle)";
  div.style.background = "rgba(14, 165, 233, 0.08)";
  div.style.color = "var(--text-main)";
  div.style.fontSize = "0.9rem";

  submitBtn.parentElement.insertBefore(div, submitBtn);
}

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
    const questionType = questionTypeEl ? questionTypeEl.value || "analyse_globale" : "analyse_globale";
    const textToInterpret = textEl ? textEl.value.trim() : "";
    const context = contextEl ? contextEl.value.trim() : "";

    if (!textToInterpret) {
      if (errorEl) errorEl.textContent = "Merci de coller le texte à analyser.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Camille analyse…";

    try {
      const payload = { language, questionType, textToInterpret, context };
      const data = await apiRequest("/ai/interpret", "POST", payload);

      if (!data || !data.ok || !data.result) {
        throw new Error("Réponse inattendue du moteur d'interprétation.");
      }

      if (resultEl) resultEl.textContent = data.result.text || "";
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message || "Une erreur est survenue lors de l’analyse.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Interpréter le message";
    }
  });
}
