// js/generate.js
// Rédaction - POST /api/ai/generate
// - Langues : picker (nom complet visible, code interne invisible)
// - Debug prompt : uniquement superadmin
// - Sécurise submit (pas de reload)

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    setupHeaderNavigation();
  } catch {}

  initLanguagePickerGenerate();
  attachGenerateHandlers();
});

function isSuperAdmin() {
  try {
    const u = getCurrentUser();
    return u && u.role === "superadmin";
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
      const t = e.target;
      if (t && t.id === "genSubmit") {
        e.preventDefault();
        e.stopPropagation();
        runGenerate();
      }
    },
    true
  );

  if (btn && !btn.getAttribute("type")) btn.setAttribute("type", "button");
}

function getUserLanguageFallback() {
  const nav = (navigator.language || "fr").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "fr";
}

function buildPrompt({ format, targetLangName, targetLangCode, userLang, tone, objective, recipient, draft, context }) {
  const base = `
Tu es Camille, spécialiste en communication professionnelle et en rédaction orientée résultat.
Tu écris comme un HUMAIN NATIF dans la langue cible (expressions idiomatiques, fluidité, naturel), sans formulations robotiques.

RÈGLES ABSOLUES :
- Tu dois produire un contenu COMPLET et exploitable, jamais un message vide.
- Si une information manque, tu proposes une formulation neutre + une variante.
- Tu n’inventes PAS de faits sensibles (montants, dates, identités) si non fournis ; utilise [à compléter] si nécessaire.
- Pas de blabla : va droit au but.

CONTRAINTE DE LANGUE (prioritaire) :
- Tu rédiges intégralement en : "${targetLangName}".
- Si tu détectes une autre langue dans le brief, tu l’ignores pour le MESSAGE_FINAL.

SORTIE OBLIGATOIRE EN 2 BLOCS :
1) MESSAGE_FINAL (langue cible)
2) EXPLICATION_UTILISATEUR (langue utilisateur) : 4 à 8 puces max (intention, structure, points d’attention).

PARAMÈTRES :
FORMAT = ${format}
LANGUE_CIBLE_NOM = ${targetLangName}
LANGUE_CIBLE_CODE_INTERNE = ${targetLangCode}
LANGUE_UTILISATEUR = ${userLang}
`.trim();

  const parts = [base];
  const add = (label, value) => {
    const v = (value || "").trim();
    if (v) parts.push(`\n---\n${label}:\n${v}\n`);
  };

  add("TON_SOUHAITÉ", tone);
  add("OBJECTIF_PRINCIPAL", objective);
  add("PROFIL_DESTINATAIRE", recipient);
  add("CONTEXTE_ET_CONTRAINTES", context);
  add("TEXTE_DEPART (optionnel)", draft);

  parts.push(
    `
--- RENDU ATTENDU (strict)
MESSAGE_FINAL:
(texte complet)

EXPLICATION_UTILISATEUR:
- ...
`.trim()
  );

  return parts.join("\n");
}

function ensurePromptDebugUI() {
  if (!isSuperAdmin()) return null;

  let wrap = document.getElementById("genPromptDebugWrap");
  if (wrap) return wrap;

  const outEl = document.getElementById("genOutput");
  if (!outEl || !outEl.parentElement) return null;

  wrap = document.createElement("div");
  wrap.id = "genPromptDebugWrap";
  wrap.style.marginTop = "14px";

  const title = document.createElement("h4");
  title.textContent = "Debug – Prompt envoyé (superadmin)";
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
  pre.textContent = "(le prompt apparaîtra ici après génération)";

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
  const v = (el.value ?? "").toString();
  return { found: true, value: v };
}

async function runGenerate() {
  const btn = document.getElementById("genSubmit");
  const errorEl = document.getElementById("genError");
  const outEl = document.getElementById("genOutput");

  if (errorEl) errorEl.textContent = "";
  if (outEl) outEl.textContent = "";

  const formatR = readValue("genFormat");
  const toneR = readValue("genTone");
  const objR = readValue("genObjective");
  const recR = readValue("genRecipient");
  const draftR = readValue("genDraft");
  const ctxR = readValue("genContext");

  // picker
  const langCode = (document.getElementById("genLanguageCode")?.value || "fr").trim() || "fr";
  const langLabel = (document.getElementById("genLanguageLabel")?.value || "Français").trim() || "Français";

  const format = (formatR.found ? formatR.value : "email") || "email";
  const userLang = getUserLanguageFallback();

  const prompt = buildPrompt({
    format,
    targetLangName: langLabel,
    targetLangCode: langCode,
    userLang,
    tone: toneR.value,
    objective: objR.value,
    recipient: recR.value,
    draft: draftR.value,
    context: ctxR.value,
  });

  // Debug superadmin only
  ensurePromptDebugUI();
  const dbg = document.getElementById("genPromptDebug");
  if (dbg && isSuperAdmin()) dbg.textContent = prompt;

  const payload = {
    prompt,
    meta: {
      format,
      targetLangName: langLabel,
      targetLangCode: langCode,
      userLang,
    },
  };

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

/* ---------------- Language Picker (Generate) ---------------- */

function initLanguagePickerGenerate() {
  const picker = document.getElementById("genLangPicker");
  if (!picker || !window.CL_LANG) return;

  const labelInput = document.getElementById("genLanguageLabel");
  const codeInput = document.getElementById("genLanguageCode");
  const openBtn = document.getElementById("genLangOpenBtn");
  const panel = document.getElementById("genLangPanel");
  const search = document.getElementById("genLangSearch");
  const favList = document.getElementById("genLangFavList");
  const allList = document.getElementById("genLangAllList");

  // default
  const def = window.CL_LANG.getLanguageByCode(codeInput.value) || window.CL_LANG.getLanguages()[0];
  labelInput.value = def ? def.name : "Français";
  codeInput.value = def ? def.code : "fr";

  function closePanel() {
    panel.classList.remove("open");
  }
  function openPanel() {
    panel.classList.add("open");
    search.value = "";
    render();
    search.focus();
  }

  openBtn.addEventListener("click", () => {
    if (panel.classList.contains("open")) closePanel();
    else openPanel();
  });

  document.addEventListener("click", (e) => {
    if (!panel.classList.contains("open")) return;
    if (picker.contains(e.target)) return;
    closePanel();
  });

  function setLanguage(lang) {
    labelInput.value = lang.name;
    codeInput.value = lang.code;
    closePanel();
  }

  function row(lang, isFav) {
    const el = document.createElement("div");
    el.className = "lang-picker-row";

    const left = document.createElement("div");
    left.className = "lang-picker-left";

    const flag = document.createElement("div");
    flag.className = "lang-picker-flag";
    flag.textContent = lang.flag || "🏳️";

    const name = document.createElement("div");
    name.className = "lang-picker-name";
    name.textContent = lang.name;

    left.appendChild(flag);
    left.appendChild(name);

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "lang-picker-fav" + (isFav ? " active" : "");
    favBtn.textContent = isFav ? "★" : "☆";
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.CL_LANG.toggleFavorite(lang.code);
      render();
    });

    el.appendChild(left);
    el.appendChild(favBtn);

    el.addEventListener("click", () => setLanguage(lang));
    return el;
  }

  function render() {
    const favCodes = window.CL_LANG.getFavorites();
    const all = window.CL_LANG.searchLanguages(search.value);
    const fav = favCodes
      .map((c) => window.CL_LANG.getLanguageByCode(c))
      .filter(Boolean);

    favList.innerHTML = "";
    allList.innerHTML = "";

    if (!fav.length) {
      const empty = document.createElement("div");
      empty.style.color = "var(--text-muted)";
      empty.style.fontSize = "0.9rem";
      empty.textContent = "Aucun favori pour l’instant.";
      favList.appendChild(empty);
    } else {
      fav.forEach((l) => favList.appendChild(row(l, true)));
    }

    all.forEach((l) => allList.appendChild(row(l, favCodes.includes(l.code))));
  }

  search.addEventListener("input", render);
}
