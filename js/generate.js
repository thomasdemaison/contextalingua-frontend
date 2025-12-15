// js/generate.js
// Rédaction - POST /api/ai/generate

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
2) EXPLICATION_UTILISATEUR (langue utilisateur) : 4 à 8 puces max.

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

  wrap = document.createElemen
