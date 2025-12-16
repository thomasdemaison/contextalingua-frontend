// js/generate.js
// Rédaction - POST /api/ai/generate
// Objectifs :
// 1) Empêcher tout reload (submit + click)
// 2) Collecter correctement les champs par ID
// 3) Forcer strictement la langue cible (le bug actuel)
// 4) Debug (prompt) uniquement SUPERADMIN

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  attachGenerateHandlers();
});

/* -------------------- Rôles -------------------- */

function isSuperAdmin() {
  try {
    const u = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    return !!(u && u.role === "superadmin");
  } catch {
    return false;
  }
}

/* -------------------- Handlers -------------------- */

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

  // Fallback click (au cas où)
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

  // Sécurise type du bouton
  if (btn && !btn.getAttribute("type")) btn.setAttribute("type", "button");
}

function getUserLanguageFallback() {
  const nav = (navigator.language || "fr").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "fr";
}

/* -------------------- Langues (libellés lisibles) -------------------- */

function langLabel(code) {
  const c = (code || "fr").toLowerCase();
  const map = {
    fr: "Français",
    en: "Anglais",
    es: "Espagnol",
    de: "Allemand",
    it: "Italien",
    pt: "Portugais",
    nl: "Néerlandais",
    zh: "Chinois",
    ja: "Japonais",
    ar: "Arabe",
  };
  return map[c] || c;
}

/* -------------------- Prompt -------------------- */

function buildPrompt({ format, targetLang, userLang, tone, objective, recipient, draft, context }) {
  const targetLabel = langLabel(targetLang);

  // ⚠️ Changement clé :
  // - On impose "ÉCRIS EXCLUSIVEMENT EN <LANGUE>"
  // - On demande une sortie en 2 blocs, mais courte (pro)
  // - On impose que MESSAGE_FINAL soit dans la langue cible, sans mélange.

  const base = `
Tu es Camille, spécialiste en communication professionnelle et en rédaction orientée résultat.

RÈGLE CRITIQUE (obligatoire) :
- ÉCRIS EXCLUSIVEMENT en ${targetLabel} (code: ${targetLang}). Ne mélange aucune autre langue.
- Si l'utilisateur écrit dans une autre langue, tu réponds quand même intégralement en ${targetLabel}.

STYLE :
- Professionnel, concis, actionnable.
- Zéro blabla, zéro meta.
- Si une info manque : utilise [à compléter] plutôt que d'inventer.

FORMAT DU LIVRABLE (obligatoire, court) :
1) MESSAGE_FINAL (en ${targetLabel})
2) NOTES (en ${langLabel(userLang)}) : 3 à 6 puces max (intention, ton, points de vigilance)

PARAMÈTRES :
- FORMAT = ${format}
- LANGUE_CIBLE = ${targetLang}
- LANGUE_UTILISATEUR = ${userLang}
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

  parts.push(`
--- RENDU ATTENDU (strict) ---
MESSAGE_FINAL:
(texte complet prêt à envoyer)

NOTES:
- ...
`.trim());

  return parts.join("\n");
}

/* -------------------- Debug UI (superadmin only) -------------------- */

function ensurePromptDebugUI() {
  // Ne rien afficher si pas superadmin
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
    } catch (e) {
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

/* -------------------- Lecture champs -------------------- */

function readValue(id) {
  const el = document.getElementById(id);
  if (!el) return { found: false, value: "" };
  return { found: true, value: (el.value ?? "").toString() };
}

/* -------------------- Run -------------------- */

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
    ["genLanguage", langR.found],
    ["genTone", toneR.found],
    ["genObjective", objR.found],
    ["genRecipient", recR.found],
    ["genDraft", draftR.found],
    ["genContext", ctxR.found],
    ["genFormat", formatR.found],
  ]
    .filter((x) => !x[1])
    .map((x) => x[0]);

  if (missing.length) {
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

  // Debug superadmin
  const wrap = ensurePromptDebugUI();
  if (wrap) {
    const dbg = document.getElementById("genPromptDebug");
    if (dbg) dbg.textContent = prompt;
  }

  const payload = {
    prompt,
    meta: { format, targetLang, userLang },
  };

  const originalLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Camille rédige…";
  }

  try {
    const data = await apiRequest("/ai/generate", "POST", payload);

    // Formats possibles selon backend
    const text = data?.result?.text ?? data?.result ?? data?.text ?? "";
    if (!text) throw new Error("Réponse inattendue du moteur de génération.");

    if (outEl) outEl.textContent = text;
  } catch (err) {
    if (errorEl) {
      if (err?.message === "Failed to fetch") {
        errorEl.textContent = "Impossible de contacter le serveur (API hors ligne ?).";
      } else {
        errorEl.textContent = err.message || "Erreur lors de la génération.";
      }
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel || "Lancer la rédaction";
    }
  }
}
