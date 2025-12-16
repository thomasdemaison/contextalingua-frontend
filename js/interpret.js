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

function isSuperAdmin() {
  try {
    const u = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    return (u && u.role === "superadmin") || false;
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
    } catch {
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

const payload = { language, questionType, textToInterpret, context };

// Debug (superadmin uniquement)
if (isSuperAdmin()) {
  ensureInterpretDebugUI();
  const pre = document.getElementById("intDebugPayload");
  if (pre) pre.textContent = JSON.stringify(payload, null, 2);
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
