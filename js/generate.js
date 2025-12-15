// js/generate.js
// Rédaction - POST /api/ai/generate
// Objectifs :
// 1) Empêcher tout reload (submit + click)
// 2) Collecter correctement les champs par ID
// 3) Afficher/coller le prompt envoyé pour debug (sans console only)

document.addEventListener("DOMContentLoaded", () => {
  console.log("[generate.js] DOM chargé, initialisation…");

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  attachGenerateHandlers();
});

function attachGenerateHandlers() {
  const form = document.getElementById("generateForm");
  const btn = document.getElementById("genSubmit");

  if (form) {
    console.log("[generate.js] Formulaire trouvé (#generateForm) → handler submit attaché.");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      runGenerate();
    });
  } else {
    console.warn("[generate.js] Formulaire introuvable (#generateForm). Fallback via click.");
  }

  // Fallback click (si bouton hors form / DOM remplacé / duplications)
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (target && target.id === "genSubmit") {
        console.log("[generate.js] Fallback click détecté sur #genSubmit.");
        e.preventDefault();
        e.stopPropagation();
        runGenerate();
      }
    },
    true
  );

  // Sécurisation : si pas de type, on force un type safe
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
    if (!v) return;
    parts.push(`\n---\n${label}:\n${v}\n`);
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

  // IDs attendus (doivent matcher generate.html)
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
    console.warn("[generate.js] Champs introuvables :", missing);
    if (errorEl) {
      errorEl.textContent = `Champs introuvables dans le HTML : ${missing.join(
        ", "
      )}. Vérifiez les id.`;
    }
    return;
  }

  const format = (formatR.value || "email").trim() || "email";
  const targetLang = (langR.value || "fr").trim() || "fr";
  const userLang = getUserLanguageFallback();

  const tone = toneR.value;
  const objective = objR.value;
  const recipient = recR.value;
  const draft = draftR.value;
  const context = ctxR.value;

  // Validation minimale : l’objectif ou le texte de départ doit exister
  if (!objective.trim() && !draft.trim()) {
    if (errorEl) {
      errorEl.textContent =
        "Merci de préciser au moins un objectif OU de coller un texte de départ.";
    }
    return;
  }

  const prompt = buildPrompt({
    format,
    targetLang,
    userLang,
    tone,
    objective,
    recipient,
    draft,
    context,
  });

  ensurePromptDebugUI();
  const dbg = document.getElementById("genPromptDebug");
  if (dbg) dbg.textContent = prompt;

  const payload = {
    prompt,
    meta: { format, targetLang, userLang },
  };

  const originalLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "C
