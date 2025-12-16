// js/generate.js
// Mode Rédaction : POST /api/ai/generate
// - Langues UX : recherche + drapeaux + noms complets
// - Envoi interne : code + nom (le user ne voit pas les codes)
// - Prompt durci pour forcer la langue
// - Debug visible uniquement superadmin

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  initLanguagePicker();
  attachGenerateHandlers();
});

/* -------------------- Rôles -------------------- */

function getUserSafe() {
  try {
    return typeof getCurrentUser === "function" ? getCurrentUser() : null;
  } catch {
    return null;
  }
}

function isSuperAdmin() {
  const u = getUserSafe();
  return !!(u && u.role === "superadmin");
}

/* -------------------- Langues (liste extensible) -------------------- */
/**
 * NOTE :
 * - code = interne (utile backend, logs, etc.)
 * - name = affichage user (langue complète)
 * - flag = emoji (rapide et léger)
 *
 * Vous pouvez ajouter autant de langues que souhaité.
 */
const LANGUAGES = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "Anglais", flag: "🇬🇧" },
  { code: "en-US", name: "Anglais (US)", flag: "🇺🇸" },
  { code: "es", name: "Espagnol", flag: "🇪🇸" },
  { code: "de", name: "Allemand", flag: "🇩🇪" },
  { code: "it", name: "Italien", flag: "🇮🇹" },
  { code: "pt", name: "Portugais", flag: "🇵🇹" },
  { code: "pt-BR", name: "Portugais (Brésil)", flag: "🇧🇷" },
  { code: "nl", name: "Néerlandais", flag: "🇳🇱" },
  { code: "sv", name: "Suédois", flag: "🇸🇪" },
  { code: "no", name: "Norvégien", flag: "🇳🇴" },
  { code: "da", name: "Danois", flag: "🇩🇰" },
  { code: "fi", name: "Finnois", flag: "🇫🇮" },
  { code: "pl", name: "Polonais", flag: "🇵🇱" },
  { code: "cs", name: "Tchèque", flag: "🇨🇿" },
  { code: "sk", name: "Slovaque", flag: "🇸🇰" },
  { code: "hu", name: "Hongrois", flag: "🇭🇺" },
  { code: "ro", name: "Roumain", flag: "🇷🇴" },
  { code: "bg", name: "Bulgare", flag: "🇧🇬" },
  { code: "el", name: "Grec", flag: "🇬🇷" },
  { code: "tr", name: "Turc", flag: "🇹🇷" },
  { code: "ru", name: "Russe", flag: "🇷🇺" },
  { code: "uk", name: "Ukrainien", flag: "🇺🇦" },
  { code: "ar", name: "Arabe", flag: "🇸🇦" },
  { code: "he", name: "Hébreu", flag: "🇮🇱" },
  { code: "zh", name: "Chinois", flag: "🇨🇳" },
  { code: "zh-TW", name: "Chinois (Traditionnel)", flag: "🇹🇼" },
  { code: "ja", name: "Japonais", flag: "🇯🇵" },
  { code: "ko", name: "Coréen", flag: "🇰🇷" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "th", name: "Thaï", flag: "🇹🇭" },
  { code: "vi", name: "Vietnamien", flag: "🇻🇳" },
  { code: "id", name: "Indonésien", flag: "🇮🇩" },
];

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function findLanguageByName(input) {
  const q = normalize(input);
  if (!q) return null;
  return (
    LANGUAGES.find((l) => normalize(l.name) === q) ||
    LANGUAGES.find((l) => normalize(l.name).includes(q)) ||
    null
  );
}

/* -------------------- Language Picker UI -------------------- */

function setSelectedLanguage(lang) {
  const codeEl = document.getElementById("genLanguageCode");
  const nameEl = document.getElementById("genLanguageName");
  const labelEl = document.getElementById("genLanguageSelectedLabel");

  if (codeEl) codeEl.value = lang.code;
  if (nameEl) nameEl.value = lang.name;
  if (labelEl) labelEl.textContent = `${lang.flag} ${lang.name}`;

  // Visuel "actif"
  document.querySelectorAll(".lang-pill").forEach((btn) => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-secondary");
    btn.style.borderColor = "rgba(148, 163, 184, 0.35)";
  });

  const activeBtn = document.querySelector(`.lang-pill[data-code="${lang.code}"]`);
  if (activeBtn) {
    activeBtn.classList.remove("btn-secondary");
    activeBtn.classList.add("btn-primary");
    activeBtn.style.borderColor = "rgba(37, 99, 235, 0.8)";
  }
}

function renderLanguageGrid(filterText = "") {
  const grid = document.getElementById("genLanguageGrid");
  if (!grid) return;

  const q = normalize(filterText);
  const items = q
    ? LANGUAGES.filter((l) => normalize(l.name).includes(q))
    : LANGUAGES;

  grid.innerHTML = "";

  items.slice(0, 40).forEach((lang) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary lang-pill";
    btn.dataset.code = lang.code;
    btn.style.justifyContent = "flex-start";
    btn.style.gap = "10px";
    btn.style.padding = "10px 12px";
    btn.style.borderRadius = "14px";

    const left = document.createElement("span");
    left.textContent = lang.flag;
    left.style.fontSize = "1.05rem";

    const right = document.createElement("span");
    right.textContent = lang.name;
    right.style.fontSize = "0.92rem";

    btn.appendChild(left);
    btn.appendChild(right);

    btn.addEventListener("click", () => setSelectedLanguage(lang));
    grid.appendChild(btn);
  });
}

function initLanguagePicker() {
  const search = document.getElementById("genLanguageSearch");
  renderLanguageGrid("");

  // Valeur par défaut : Français
  const defaultLang = LANGUAGES.find((l) => l.code === "fr") || LANGUAGES[0];
  setSelectedLanguage(defaultLang);

  if (search) {
    search.addEventListener("input", () => {
      renderLanguageGrid(search.value);

      // Si le user tape un nom exact, on auto-sélectionne
      const found = findLanguageByName(search.value);
      if (found) setSelectedLanguage(found);
    });
  }
}

/* -------------------- Handlers formulaire -------------------- */

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

  // fallback click
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
  if (nav.startsWith("fr")) return "Français";
  if (nav.startsWith("en")) return "Anglais";
  if (nav.startsWith("es")) return "Espagnol";
  return "Français";
}

/* -------------------- Prompt -------------------- */

function buildPrompt({ format, targetLangName, targetLangCode, userLangName, tone, objective, recipient, draft, context }) {
  return `
Tu es Camille, spécialiste en communication professionnelle et en rédaction orientée résultat.

RÈGLE CRITIQUE (obligatoire) :
- Écris EXCLUSIVEMENT en ${targetLangName}. Ne mélange aucune autre langue.
- Si des éléments sont fournis dans une autre langue, tu produis quand même le message final intégralement en ${targetLangName}.
- Si une info manque : utilise [à compléter] plutôt que d’inventer.

STYLE :
- Professionnel, concis, actionnable.
- Pas de blabla.

FORMAT DU LIVRABLE (obligatoire) :
1) MESSAGE_FINAL (en ${targetLangName})
2) NOTES (en ${userLangName}) : 3 à 6 puces max

PARAMÈTRES :
- FORMAT = ${format}
- LANGUE_CIBLE (nom) = ${targetLangName}
- LANGUE_CIBLE (code interne) = ${targetLangCode}

---
TON_SOUHAITÉ:
${(tone || "").trim() || "—"}

---
OBJECTIF_PRINCIPAL:
${(objective || "").trim() || "—"}

---
PROFIL_DESTINATAIRE:
${(recipient || "").trim() || "—"}

---
CONTEXTE_ET_CONTRAINTES:
${(context || "").trim() || "—"}

---
TEXTE_DEPART (optionnel):
${(draft || "").trim() || "—"}

--- RENDU ATTENDU (strict) ---
MESSAGE_FINAL:
(texte complet prêt à envoyer)

NOTES:
- ...
`.trim();
}

/* -------------------- Debug (superadmin only) -------------------- */

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

/* -------------------- Run -------------------- */

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
  const toneR = readValue("genTone");
  const objR = readValue("genObjective");
  const recR = readValue("genRecipient");
  const draftR = readValue("genDraft");
  const ctxR = readValue("genContext");

  const langCodeR = readValue("genLanguageCode");
  const langNameR = readValue("genLanguageName");

  const missing = [
    ["genFormat", formatR.found],
    ["genLanguageCode", langCodeR.found],
    ["genLanguageName", langNameR.found],
    ["genTone", toneR.found],
    ["genObjective", objR.found],
    ["genRecipient", recR.found],
    ["genDraft", draftR.found],
    ["genContext", ctxR.found],
  ]
    .filter((x) => !x[1])
    .map((x) => x[0]);

  if (missing.length) {
    if (errorEl) errorEl.textContent = `Champs introuvables : ${missing.join(", ")}`;
    return;
  }

  const format = (formatR.value || "email").trim() || "email";
  const targetLangCode = (langCodeR.value || "fr").trim() || "fr";
  const targetLangName = (langNameR.value || "Français").trim() || "Français";
  const userLangName = getUserLanguageFallback();

  const prompt = buildPrompt({
    format,
    targetLangName,
    targetLangCode,
    userLangName,
    tone: toneR.value,
    objective: objR.value,
    recipient: recR.value,
    draft: draftR.value,
    context: ctxR.value,
  });

  // Debug superadmin only
  const wrap = ensurePromptDebugUI();
  if (wrap) {
    const dbg = document.getElementById("genPromptDebug");
    if (dbg) dbg.textContent = prompt;
  }

  const payload = {
    prompt,
    meta: {
      format,
      targetLang: targetLangCode,
      targetLangName,
      userLangName,
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
    if (errorEl) {
      errorEl.textContent =
        err?.message === "Failed to fetch"
          ? "Impossible de contacter le serveur (API hors ligne ?)."
          : err.message || "Erreur lors de la génération.";
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel || "Lancer la rédaction";
    }
  }
}
