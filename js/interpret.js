// js/interpret.js (MINIMAL + PREMIUM + ROBUSTE)
// - Traduction FR par défaut
// - Option checkbox => choisir une autre langue via autocomplete (CL_LANG)
// - Parsing anti "[object Object]"
// - Option "Répondre" (dépliable) : génère une réponse + FR contrôle
//   => utilise /ai/generate + /ai/interpret en fallback si besoin

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Header (auth/public + logout)
  try {
    if (typeof setupHeaderNavigation === "function") setupHeaderNavigation();
  } catch (e) {
    console.error("[interpret.js] setupHeaderNavigation error:", e);
  }

  initTargetLangUX();
  initLanguageAutocompleteInterpret();
  setupCopyButtons();
  attachInterpretHandlers();
  attachReplyHandlers();
});

/* ---------------- Helpers ---------------- */

function getUserLanguageFallback() {
  const nav = (navigator.language || "fr").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "fr";
}

function setText(elId, value) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = value || "";
}

function safeString(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  // Cas fréquent: {text:"..."} / {translation:"..."} / objets divers
  if (typeof v === "object") {
    if (typeof v.text === "string") return v.text;
    if (typeof v.translation === "string") return v.translation;
    if (typeof v.translatedText === "string") return v.translatedText;
    if (typeof v.output === "string") return v.output;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

/**
 * Parse la réponse /ai/interpret (robuste).
 * On essaie de récupérer :
 * - translationText (string)
 * - sourceLangCode / sourceLangName (si présents)
 * - insights (liste de bullets)
 */
function parseInterpretResponse(data) {
  const ok = data?.ok;
  const result = data?.result ?? data;

  // Texte de traduction (plusieurs formats possibles)
  const translationText =
    (typeof result?.text === "string" && result.text) ||
    (typeof result?.translation === "string" && result.translation) ||
    (typeof result?.translatedText === "string" && result.translatedText) ||
    (typeof data?.text === "string" && data.text) ||
    safeString(result?.text ?? result?.translation ?? result?.translatedText ?? "");

  // Langue d'origine si backend la renvoie
  const sourceLangCode =
    result?.sourceLangCode ||
    result?.detectedLangCode ||
    result?.languageDetected ||
    result?.source_language ||
    "";
  const sourceLangName =
    result?.sourceLangName ||
    result?.detectedLangName ||
    result?.languageDetectedName ||
    result?.source_language_name ||
    "";

  // Insights : on essaye plusieurs champs
  let insights = [];
  const cand =
    result?.insights ||
    result?.analysis ||
    result?.bullets ||
    result?.summary ||
    null;

  // Si le backend renvoie déjà un tableau
  if (Array.isArray(cand)) {
    insights = cand.map((x) => safeString(x)).filter(Boolean);
  } else if (cand && typeof cand === "object") {
    // Cas objet: { tone:"", intent:"", risks:"" ... }
    const maybe = [];
    for (const k of ["intent", "tone", "risks", "risque", "ask", "request", "nextStep", "next_step"]) {
      if (cand[k]) maybe.push(`${labelize(k)} : ${safeString(cand[k])}`);
    }
    // fallback : on prend 3 clés max
    if (!maybe.length) {
      const keys = Object.keys(cand).slice(0, 3);
      keys.forEach((k) => maybe.push(`${labelize(k)} : ${safeString(cand[k])}`));
    }
    insights = maybe.filter(Boolean);
  } else if (typeof cand === "string") {
    // un bloc texte → on split léger
    insights = cand
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  // default si rien
  if (!insights.length) {
    insights = [
      "Ton : (non détecté)",
      "Intention : (non détectée)",
      "Point d’attention : (non détecté)",
    ];
  }

  return {
    ok: ok !== false,
    translationText,
    sourceLangCode,
    sourceLangName,
    insights,
    creditBalance: data?.creditBalance,
  };
}

function labelize(k) {
  const map = {
    intent: "Intention",
    tone: "Ton",
    risks: "Points d’attention",
    risque: "Points d’attention",
    ask: "Demande",
    request: "Demande",
    nextStep: "Prochaine étape",
    next_step: "Prochaine étape",
  };
  return map[k] || k;
}

function renderInsights(items) {
  const wrap = document.getElementById("intInsights");
  if (!wrap) return;

  wrap.innerHTML = "";
  items.slice(0, 6).forEach((txt) => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.padding = "10px 12px";
    div.style.borderRadius = "14px";
    div.style.border = "1px solid var(--border-subtle)";
    div.style.background = "rgba(2,6,23,.6)";
    div.textContent = txt;
    wrap.appendChild(div);
  });
}

/* ---------------- UX : langue cible optionnelle ---------------- */

function initTargetLangUX() {
  const toggle = document.getElementById("intToggleTargetLang");
  const wrap = document.getElementById("intTargetLangWrap");
  const label = document.getElementById("intTargetLanguageLabel");
  const code = document.getElementById("intTargetLanguageCode");

  if (!toggle || !wrap || !label || !code) return;

  // default = FR
  label.value = "Français";
  code.value = "fr";

  toggle.addEventListener("change", () => {
    wrap.style.display = toggle.checked ? "" : "none";
    if (!toggle.checked) {
      label.value = "Français";
      code.value = "fr";
    } else {
      // focus
      setTimeout(() => label.focus(), 0);
    }
  });
}

/* ---------------- Autocomplete langues (CL_LANG) ---------------- */

function initLanguageAutocompleteInterpret() {
  const labelInput = document.getElementById("intTargetLanguageLabel");
  const codeInput = document.getElementById("intTargetLanguageCode");
  const suggestBox = document.getElementById("intLangSuggest");

  if (!labelInput || !codeInput || !suggestBox || !window.CL_LANG) return;

  const def = window.CL_LANG.getLanguageByCode(codeInput.value) || window.CL_LANG.getLanguages()[0];
  if (def) {
    labelInput.value = def.name;
    codeInput.value = def.code;
  }

  function close() {
    suggestBox.style.display = "none";
    suggestBox.innerHTML = "";
  }

  function render(query) {
    const results = window.CL_LANG.searchLanguages((query || "").trim()).slice(0, 12);
    suggestBox.innerHTML = "";

    if (!results.length) {
      suggestBox.innerHTML = `<div style="padding:8px;color:var(--text-muted);font-size:.9rem;">Aucun résultat.</div>`;
      suggestBox.style.display = "block";
      return;
    }

    results.forEach((lang) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "btn btn-ghost";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.width = "100%";
      row.style.textAlign = "left";
      row.style.padding = "8px";
      row.innerHTML = `<span>${lang.flag || "🏳️"} ${lang.name}</span><span style="opacity:.7;">${lang.code}</span>`;

      row.addEventListener("click", () => {
        labelInput.value = lang.name;
        codeInput.value = lang.code;
        close();
      });

      suggestBox.appendChild(row);
    });

    suggestBox.style.display = "block";
  }

  labelInput.addEventListener("input", () => render(labelInput.value));
  labelInput.addEventListener("focus", () => render(labelInput.value));

  document.addEventListener("click", (e) => {
    if (e.target === labelInput || suggestBox.contains(e.target)) return;
    close();
  });
}

/* ---------------- Buttons ---------------- */

function setupCopyButtons() {
  document.getElementById("btnCopyTranslation")?.addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("intTranslation")?.textContent || "");
  });

  document.getElementById("btnCopyReply")?.addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("intReply")?.textContent || "");
  });

  document.getElementById("btnCopyReplyFR")?.addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("intReplyFR")?.textContent || "");
  });
}

/* ---------------- Interpréter ---------------- */

function attachInterpretHandlers() {
  const form = document.getElementById("interpretForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await runInterpret();
  });
}

async function runInterpret() {
  setText("intError", "");
  setText("intTranslation", "");
  setText("intMeta", "");
  renderInsights([]);

  const btn = document.getElementById("intSubmit");
  const originalLabel = btn ? btn.textContent : "";

  const textToInterpret = (document.getElementById("intText")?.value || "").trim();
  const context = (document.getElementById("intContext")?.value || "").trim();

  if (!textToInterpret) {
    setText("intError", "Collez un texte à interpréter.");
    return;
  }

  // Par défaut FR, sinon la langue choisie
  const toggle = document.getElementById("intToggleTargetLang");
  const targetLangCode = ((document.getElementById("intTargetLanguageCode")?.value || "fr").trim() || "fr");
  const targetLangName = ((document.getElementById("intTargetLanguageLabel")?.value || "Français").trim() || "Français");
  const forceTarget = !!(toggle && toggle.checked);

  // Payload legacy attendu par TON backend (celui qui marche déjà dans generate)
  // IMPORTANT : language = langue de réponse/traduction
  const payload = {
    language: forceTarget ? targetLangCode : "fr",
    languageName: forceTarget ? targetLangName : "Français",
    depth: "quick",
    textToInterpret,
    context,
    userLang: getUserLanguageFallback(),
  };

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Camille analyse…";
    }

    const data = await apiRequest("/ai/interpret", "POST", payload);

    const parsed = parseInterpretResponse(data);

    // Stocke des infos pour la partie "Répondre"
    window.__CL_LAST_INTERPRET__ = {
      sourceLangCode: parsed.sourceLangCode,
      sourceLangName: parsed.sourceLangName,
      originalText: textToInterpret,
      translationFR: parsed.translationText, // si on traduit en FR (ou autre)
      chosenTargetLangCode: payload.language,
      chosenTargetLangName: payload.languageName,
    };

    setText("intTranslation", parsed.translationText || "(traduction vide)");
    renderInsights(parsed.insights);

    const metaBits = [];
    if (parsed.sourceLangCode || parsed.sourceLangName) {
      metaBits.push(`Langue détectée : ${parsed.sourceLangName || parsed.sourceLangCode}`);
    } else {
      metaBits.push(`Langue détectée : auto`);
    }
    if (parsed.creditBalance != null) metaBits.push(`Crédits restants : ${parsed.creditBalance}`);
    setText("intMeta", metaBits.join(" · "));
  } catch (err) {
    console.error("[interpret.js] /ai/interpret error:", err);
    setText("intError", err.message || "Erreur lors de l’interprétation.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel || "Traduire & interpréter";
    }
  }
}

/* ---------------- Répondre (optionnel) ---------------- */

function attachReplyHandlers() {
  const btn = document.getElementById("intReplyBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    await runReply();
  });
}

async function runReply() {
  setText("intReplyError", "");
  setText("intReply", "");
  setText("intReplyFR", "");

  const goal = (document.getElementById("intReplyGoal")?.value || "").trim();
  if (!goal) {
    setText("intReplyError", "Décrivez l’intention de réponse.");
    return;
  }

  const btn = document.getElementById("intReplyBtn");
  const originalLabel = btn ? btn.textContent : "";

  // On s'appuie sur la dernière interprétation
  const last = window.__CL_LAST_INTERPRET__ || {};
  const originalText = last.originalText || (document.getElementById("intText")?.value || "").trim();

  if (!originalText) {
    setText("intReplyError", "Collez d’abord un texte et lancez l’interprétation.");
    return;
  }

  // Langue d'origine : si backend la renvoie on l’utilise, sinon fallback = "auto" puis on force au moins "en"
  // (si ton backend ne gère pas "auto" dans generate, il ignorera; c’est juste un fallback)
  const srcCode = last.sourceLangCode || "auto";
  const srcName = last.sourceLangName || "Langue d’origine";

  // 1) Génération de réponse (dans la langue d’origine)
  const payloadGenerate = {
    input: {
      tone: "professionnel, clair, naturel",
      objective: "répondre au message ci-dessous",
      recipient: "interlocuteur du message reçu",
      draft: "",
      context:
        `Message reçu (original) :\n${originalText}\n\n` +
        `Ce que je veux répondre :\n${goal}\n\n` +
        `Contraintes : réponse courte, factuelle, polie. Si une question est nécessaire, 1 question max.`,
    },
    meta: {
      format: "email",
      targetLangName: srcName,
      targetLangCode: srcCode,
      userLang: "fr",
    },
  };

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Camille répond…";
    }

    const gen = await apiRequest("/ai/generate", "POST", payloadGenerate);
    const replyText = safeString(gen?.result?.text ?? gen?.result ?? gen?.text ?? "");

    if (!replyText) throw new Error("Réponse inattendue du moteur de génération.");
    setText("intReply", replyText);

    // 2) FR contrôle
    setText("intReplyFR", "Traduction FR en cours…");
    try {
      const frData = await apiRequest("/ai/interpret", "POST", {
        language: "fr",
        languageName: "Français",
        depth: "quick",
        textToInterpret: replyText,
        context: "",
        userLang: "fr",
      });
      const parsedFR = parseInterpretResponse(frData);
      setText("intReplyFR", parsedFR.translationText || "(FR indisponible)");
    } catch (e) {
      setText("intReplyFR", "(Contrôle FR indisponible)");
    }
  } catch (err) {
    console.error("[interpret.js] reply error:", err);
    setText("intReplyError", err.message || "Erreur lors de la génération de la réponse.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel || "Générer une réponse";
    }
  }
}
