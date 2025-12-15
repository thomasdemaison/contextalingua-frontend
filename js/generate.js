// js/generate.js
// Rédaction - POST /api/ai/generate
// Robustesse :
// - Interception submit sur #generateForm (bloque tout reload)
// - Fallback event delegation sur document (si DOM dupliqué / remplacé)

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
    console.warn("[generate.js] Formulaire introuvable (#generateForm). Fallback via delegation.");
  }

  // Fallback si le submit ne passe pas / bouton hors form / DOM remplacé
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.id === "genSubmit") {
      console.log("[generate.js] Fallback click détecté sur #genSubmit.");
      e.preventDefault();
      e.stopPropagation();
      runGenerate();
    }
  }, true);

  // Sécurité : si bouton présent, on force type=submit (ou button), mais on bloque de toute façon le reload via handlers
  if (btn && !btn.getAttribute("type")) btn.setAttribute("type", "submit");
}

function getUserLanguageFallback() {
  // Langue “utilisateur” pour l’explication
  // (vous pourrez la remplacer plus tard par une préférence enregistrée en DB)
  const nav = (navigator.language || "fr").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "fr";
}

function buildPrompt({ format, targetLang, userLang, tone, objective, recipient, draft, context }) {
  const base =
`Tu es Camille, assistante de rédaction professionnelle.
Objectif : produire un contenu prêt à envoyer, clair, efficace et sans hallucinations.
Contraintes :
- Respecter le FORMAT demandé.
- Sortie en DEUX BLOCS :
  1) "MESSAGE_FINAL" dans la langue cible.
  2) "EXPLICATION_UTILISATEUR" dans la langue utilisateur (résumé de l’intention + points clés), pour qu’il comprenne avant envoi.
- Ne pas inventer de noms, de montants ou de faits : si une info manque, proposer une formulation neutre.

FORMAT = ${format}
LANGUE_CIBLE = ${targetLang}
LANGUE_UTILISATEUR = ${userLang}
`;

  const parts = [];
  parts.push(base);

  const add = (label, value) => {
    const v = (value || "").trim();
    if (v) parts.push(`\n---\n${label}:\n${v}\n`);
  };

  add("TON_SOUHAITE", tone);
  add("OBJECTIF", objective);
  add("DESTINATAIRE_DESCRIPTION", recipient);
  add("TEXTE_DE_DEPART_OPTIONNEL", draft);
  add("CONTEXTE_OPTIONNEL", context);

  // Instruction finale sur le format
  parts.push(`
--- 
Rendu attendu (obligatoire) :

MESSAGE_FINAL:
(texte)

EXPLICATION_UTILISATEUR:
(texte)
`);

  return parts.join("");
}

async function runGenerate() {
  const btn = document.getElementById("genSubmit");
  const errorEl = document.getElementById("genError");
  const outEl = document.getElementById("genOutput");

  if (errorEl) errorEl.textContent = "";
  if (outEl) outEl.textContent = "";

  const formatEl = document.getElementById("genFormat");
  const langEl = document.getElementById("genLanguage");
  const toneEl = document.getElementById("genTone");
  const objEl = document.getElementById("genObjective");
  const recEl = document.getElementById("genRecipient");
  const draftEl = document.getElementById("genDraft");
  const ctxEl = document.getElementById("genContext");

  const format = formatEl ? formatEl.value : "email";
  const targetLang = langEl ? (langEl.value || "fr") : "fr";
  const userLang = getUserLanguageFallback();

  const tone = toneEl ? toneEl.value : "";
  const objective = objEl ? objEl.value : "";
  const recipient = recEl ? recEl.value : "";
  const draft = draftEl ? draftEl.value : "";
  const context = ctxEl ? ctxEl.value : "";

  // Prompt enrichi (texte + séparateurs + labels)
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

  // Payload backend (adaptez les clés si votre API attend d'autres noms)
  const payload = {
    prompt,
    // Optionnel : vous pouvez aussi passer ces champs séparément si votre backend les logge/stocke
    meta: { format, targetLang, userLang },
  };

  console.log("[generate.js] Envoi /ai/generate …", payload);

  const originalLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Camille rédige…";
  }

  try {
    const data = await apiRequest("/ai/generate", "POST", payload);
    console.log("[generate.js] Réponse /ai/generate :", data);

    const text =
      data?.result?.text ??
      data?.result ??
      data?.text ??
      "";

    if (!text) throw new Error("Réponse inattendue du moteur de génération.");

    if (outEl) outEl.textContent = text;
  } catch (err) {
    console.error("[generate.js] Erreur génération :", err);
    if (errorEl) errorEl.textContent = err.message || "Erreur lors de la génération.";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel || "Lancer la rédaction";
    }
  }
}
