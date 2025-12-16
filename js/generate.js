// js/generate.js
// Rédaction - POST /api/ai/generate
// + Import automatique du brief du Mode accompagné (camilleBriefV1)

const CAMILLE_BRIEF_KEY = "camilleBriefV1";

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  importCamilleBriefIntoGenerate();
  setupLanguageFlags();
  attachGenerateHandlers();
});

function setupLanguageFlags() {
  const select = document.getElementById("genLanguage");
  const free = document.getElementById("genLanguageFree");
  const wrap = document.getElementById("langFlags");
  if (!select || !wrap) return;

  wrap.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-lang]");
    if (!btn) return;
    const lang = btn.getAttribute("data-lang");
    if (lang) {
      select.value = lang;
      if (free) free.value = "";
    }
  });

  if (free) {
    free.addEventListener("input", () => {
      const v = (free.value || "").trim().toLowerCase();
      if (v) select.value = v;
    });
  }
}


function importCamilleBriefIntoGenerate() {
  let payload = null;
  try {
    const raw = localStorage.getItem(CAMILLE_BRIEF_KEY);
    if (!raw) return;
    payload = JSON.parse(raw);
  } catch (e) {
    console.warn("[generate] brief JSON parse error:", e);
    return;
  }

  const briefData = payload?.briefData;
  if (!briefData || briefData.mode !== "write" || !briefData.form) return;

  const map = briefData.form;

  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? "";
  };

  setVal("genFormat", map.genFormat);
  setVal("genLanguage", map.genLanguage);
  setVal("genTone", map.genTone);
  setVal("genObjective", map.genObjective);
  setVal("genRecipient", map.genRecipient);
  setVal("genDraft", map.genDraft);
  setVal("genContext", map.genContext);

  showImportBanner("Brief importé depuis le Mode accompagné ✓");
}

function showImportBanner(text) {
  const form = document.getElementById("generateForm");
  if (!form) return;

  // Evite doublons
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

  form.prepend(div);
}

function isSuperAdmin() {
  try {
    const u = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    return (u && u.role === "superadmin") || false;
  } catch {
    return false;
  }
}

function attachGenerateHandlers() {
  const form = document.getElementById("generateForm");
  const btn = document.getElementById("genSubmit");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      runGenerate();
    });
  }

  // Fallback click
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (target && target.id === "genSubmit") {
        e.preventDefault();
        e.stopPropagation();
        runGenerate();
      }
    },
    true
  );

  // Bouton type safe
  if (btn && !btn.getAttribute("type")) btn.setAttribute("type", "button");
}

function getUserLanguageFallback() {
  const nav = (navigator.language || "fr").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "fr";
}

function buildPrompt({ format, targetLang, userLang, tone, objective, recipient, draft, context }) {
  const base = `
Tu es Camille, spécialiste en communication professionnelle et en rédaction orientée résultat.
Tu écris comme un HUMAIN NATIF dans la langue cible (expressions idiomatiques, fluidité, naturel), sans formulations robotiques.

RÈGLES ABSOLUES :
- Tu dois produire un contenu COMPLET et exploitable, jamais un message vide.
- Si une information manque, tu proposes une formulation neutre + une variante.
- Tu n’inventes PAS de faits sensibles (montants, dates, identités) si non fournis ; utilise [à compléter] si nécessaire.
- Pas de blabla : va droit au but.

SORTIE OBLIGATOIRE EN 2 BLOCS :
1) MESSAGE_FINAL (langue cible)
2) EXPLICATION_UTILISATEUR (langue utilisateur) : 4 à 8 puces max (intention, structure, points d’attention).

PARAMÈTRES :
FORMAT = ${format}
LANGUE_CIBLE = ${targetLang}
LANGUE_UTILISATEUR = ${userLang}
`.trim();

  const parts = [base];

  const add = (label, value) => {
    const v = (value || "").trim();
    if (v) {
      parts.push(`\n---\n${label}:\n${v}\n`);
    }
  };

  add("TON_SOUHAITÉ", tone);
  add("OBJECTIF_PRINCIPAL", objective);
  add("PROFIL_DESTINATAIRE", recipient);
  add("CONTEXTE_ET_CONTRAINTES", context);
  add("TEXTE_DEPART (optionnel)", draft);

  parts.push(`
--- RENDU ATTENDU (strict)
MESSAGE_FINAL:
(texte complet)

EXPLICATION_UTILISATEUR:
- ...
`.trim());

  return parts.join("\n");
}

function ensurePromptDebugUI() {
  let wrap = document.getElementById("genPromptDebugWrap");
  if (wrap) return wrap;

  const outEl = document.getElementById("genOutput");
  if (!outEl || !outEl.parentElement) return null;

  wrap = document.createElement("div");
  wrap.id = "genPromptDebugWrap";
  wrap.style.marginTop = "14px";

  const title = document.createElement("h4");
  title.textContent = "Debug – Prompt envoyé (copiable)";
  title.style.margin = "10px 0 6px";
  title.style.color = "var(--text-strong)";

  const pre = document.createElement("pre");
  pre.id = "genPromptDebug";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.fontSize = "0.85rem";
  pre.style.color = "var(--text-muted)";
  pre.style.background = "#020617";
  pre.style.borderRadius = "12px";
  pre.style.padding = "12px";
  pre.style.border = "1px solid var(--border-subtle)";
  pre.style.minHeight = "60px";
  pre.textContent = "(le prompt apparaîtra ici après clic sur “Lancer la rédaction”)";

  const btnCopy = document.createElement("button");
  btnCopy.type = "button";
  btnCopy.className = "btn btn-secondary";
  btnCopy.style.marginTop = "8px";
  btnCopy.textContent = "Copier le prompt";
  btnCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent || "");
      btnCopy.textContent = "Copié ✓";
      setTimeout(() => (btnCopy.textContent = "Copier le prompt"), 1200);
    } catch {
      btnCopy.textContent = "Copie impossible";
      setTimeout(() => (btnCopy.textContent = "Copier le prompt"), 1200);
    }
  });

  wrap.appendChild(title);
  wrap.appendChild(pre);
  wrap.appendChild(btnCopy);
  outEl.parentElement.appendChild(wrap);

  return wrap;
}

function readValue(id) {
  const el = document.getElementById(id);
  if (!el) return { found: false, value: "" };
  return { found: true, value: (el.value ?? "").toString() };
}

async function runGenerate() {
  const btn = document.getElementById("genSubmit");
  const errorEl = document.getElementById("genError");
  const outEl = document.getElementById("genOutput");

  if (errorEl) errorEl.textContent = "";
  if (outEl) outEl.textContent = "";

  const formatR = readValue("genFormat");
  const langR = readValue("genLanguage");
  const toneR = readValue("genTone");
  const objR = readValue("genObjective");
  const recR = readValue("genRecipient");
  const draftR = readValue("genDraft");
  const ctxR = readValue("genContext");

  const missing = [
    ["genFormat", formatR.found],
    ["genLanguage", langR.found],
    ["genTone", toneR.found],
    ["genObjective", objR.found],
    ["genRecipient", recR.found],
    ["genDraft", draftR.found],
    ["genContext", ctxR.found],
  ]
    .filter((x) => !x[1])
    .map((x) => x[0]);

  if (missing.length) {
    if (errorEl) errorEl.textContent = `Champs introuvables : ${missing.join(", ")}. Vérifiez les id.`;
    return;
  }

  const format = (formatR.value || "email").trim() || "email";
  const targetLang = (langR.value || "fr").trim() || "fr";
  const userLang = getUserLanguageFallback();

  const prompt = buildPrompt({
    format,
    targetLang,
    userLang,
    tone: toneR.value,
    objective: objR.value,
    recipient: recR.value,
    draft: draftR.value,
    context: ctxR.value,
  });

  // Debug prompt (superadmin uniquement)
if (isSuperAdmin()) {
  ensurePromptDebugUI();
  const dbg = document.getElementById("genPromptDebug");
  if (dbg) dbg.textContent = prompt;
}

  const payload = { prompt, meta: { format, targetLang, userLang } };

  const originalLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Camille rédige…";
  }

  try {
    const data = await apiRequest("/ai/generate", "POST", payload);
    const text = data?.result?.text ?? data?.result ?? data?.text ?? "";
    if (!text) throw new Error("Réponse inattendue du moteur de génération.");
    if (outEl) outEl.textContent = text;
  } catch (err) {
    if (errorEl) errorEl.textContent = err.message || "Erreur lors de la génération.";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel || "Lancer la rédaction";
    }
  }
}
