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
  const base = `
Tu es Camille, spécialiste en communication professionnelle et en rédaction orientée résultat.
Tu écris comme un HUMAIN NATIF dans la langue cible (expressions idiomatiques, fluidité, naturel), sans formulations robotiques.

RÈGLES ABSOLUES :
- Tu dois produire un contenu COMPLET et exploitable, jamais un message vide.
- Si une information manque, tu poses 2-4 hypothèses raisonnables OU tu proposes une formulation neutre + une variante.
- Tu n’inventes PAS de faits sensibles (montants, dates, identités) si non fournis, mais tu peux proposer un emplacement [à compléter].
- Style : clair, crédible, moderne, non “template”.

SORTIE OBLIGATOIRE EN 2 BLOCS :
1) MESSAGE_FINAL (langue cible)
2) EXPLICATION_UTILISATEUR (langue utilisateur) : en 4 à 8 puces maximum (intention, structure, points d’attention).

PARAMÈTRES :
- FORMAT = ${format} (email / courrier / telephone)
- LANGUE_CIBLE = ${targetLang}
- LANGUE_UTILISATEUR = ${userLang}

OBJECTIF : obtenir une réponse / une action concrète.
`;

  const parts = [base.trim()];

  const add = (label, value) => {
    const v = (value || "").trim();
    if (v) parts.push(`\n### ${label}\n${v}\n`);
  };

  // On pousse le modèle à s'appuyer sur les champs
  add("TON_SOUHAITÉ", tone);
  add("OBJECTIF_PRINCIPAL", objective);
  add("PROFIL_DESTINATAIRE", recipient);
  add("CONTEXTE_ET_CONTRAINTES", context);
  add("TEXTE_DEPART (optionnel)", draft);

  // Garde-fous si l'utilisateur a peu rempli
  parts.push(`
### CONTRAINTE QUALITÉ
- Si OBJECTIF_PRINCIPAL est vide : propose 2 options d’objectif (et rédige pour la meilleure hypothèse).
- Si PROFIL_DESTINATAIRE est vide : suppose un destinataire professionnel standard et rédige quand même.
- Si TON_SOUHAITÉ est vide : ton professionnel, ferme mais respectueux.

### RENDU ATTENDU (strict)
MESSAGE_FINAL:
(texte complet)

EXPLICATION_UTILISATEUR:
- ...
`);

  return parts.join("\n");
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

  const format = formatEl?.value || "email";
  const targetLang = langEl?.value || "fr";
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
