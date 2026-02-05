// js/interpret.js (MINIMAL + PREMIUM + ROBUSTE)
// - FR par défaut
// - Checkbox => choisir une autre langue via autocomplete (CL_LANG) comme generate
// - Parse anti JSON affiché : extrait translation + detected language + analysis
// - Lecture rapide : Ton / Intention / Point d’attention
// - Option Répondre : /ai/generate + /ai/interpret (FR contrôle)

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

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

  // Defaults UI
  setSelectedLanguageUI("fr", "Français", "🇫🇷");
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
  if (typeof v === "number" || typeof v === "boolean") return String(v);

  if (typeof v === "object") {
    if (typeof v.text === "string") return v.text;
    if (typeof v.translation === "string") return v.translation;
    if (typeof v.translatedText === "string") return v.translatedText;
    if (typeof v.output === "string") return v.output;
    if (typeof v.content === "string") return v.content;
    return "";
  }
  return "";
}

function looksLikeJsonString(s) {
  if (typeof s !== "string") return false;
  const t = s.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
}

function parseMaybeJsonString(s) {
  if (!looksLikeJsonString(s)) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function normalizeResult(data) {
  // Certaines APIs renvoient { ok, result: ... }, d'autres renvoient directement ...
  let result = data?.result ?? data ?? null;

  // Parfois result est une string JSON : "{...}"
  if (typeof result === "string") {
    const maybe = parseMaybeJsonString(result);
    if (maybe) result = maybe;
  }

  // Parfois data.text contient un JSON string
  if (typeof data?.text === "string") {
    const maybe = parseMaybeJsonString(data.text);
    if (maybe && !result) result = maybe;
  }

  return result;
}

/**
 * Parse /ai/interpret (robuste)
 * Cherche translation + langue détectée + bullets/analysis
 */
function parseInterpretResponse(data) {
  const ok = data?.ok;

  const result = normalizeResult(data);

  // --- 1) Traduction texte (priorité MAX pour éviter l'affichage JSON)
  let translationText = "";

  // cas fréquent backend: { detectedLanguage, translation, analysis }
  if (result && typeof result === "object") {
    translationText =
      (typeof result.translation === "string" && result.translation) ||
      (typeof result.translatedText === "string" && result.translatedText) ||
      (typeof result.text === "string" && result.text) ||
      "";
  }

  // fallback champs possibles sur data directement
  if (!translationText) {
    translationText =
      (typeof data?.translation === "string" && data.translation) ||
      (typeof data?.translatedText === "string" && data.translatedText) ||
      (typeof data?.text === "string" && data.text) ||
      "";
  }

  // fallback : si result est une string non JSON
  if (!translationText && typeof result === "string") {
    translationText = result;
  }

  // --- 2) Langue détectée (codes/noms)
  const detected =
    (result && typeof result === "object" && (
      result.detectedLanguage ||
      result.detected_language ||
      result.sourceLangName ||
      result.detectedLangName ||
      result.languageDetectedName ||
      result.source_language_name ||
      result.source_language
    )) ||
    data?.detectedLanguage ||
    data?.detected_language ||
    data?.sourceLangName ||
    data?.detectedLangName ||
    data?.languageDetectedName ||
    data?.source_language_name ||
    data?.source_language ||
    "";

  // --- 3) Analysis / insights
  let insights = [];
  const cand =
    (result && typeof result === "object" && (result.analysis || result.insights || result.bullets || result.summary)) ||
    data?.analysis ||
    data?.insights ||
    data?.bullets ||
    data?.summary ||
    null;

  if (Array.isArray(cand)) {
    insights = cand.map((x) => safeString(x) || String(x)).filter(Boolean);
  } else if (typeof cand === "string") {
    insights = cand.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 8);
  } else if (cand && typeof cand === "object") {
    // objet -> on prend quelques clés
    const keys = Object.keys(cand).slice(0, 6);
    insights = keys.map((k) => `${k} : ${safeString(cand[k])}`).filter(Boolean);
  }

  return {
    ok: ok !== false,
    translationText,
    detectedLanguage: safeString(detected),
    insights,
    creditBalance: data?.creditBalance,
  };
}

/* ---------------- UI helpers ---------------- */

function setSelectedLanguageUI(code, name, flag) {
  const lbl = document.getElementById("intLanguageSelectedLabel");
  if (lbl) lbl.textContent = `${flag || "🏳️"} ${name || code || ""}`.trim();
}

function fillQuickFromInsights(insights) {
  // Heuristique simple pour alimenter les bulles depuis analysis[]
  const arr = Array.isArray(insights) ? insights : [];
  const low = (s) => (typeof s === "string" ? s.toLowerCase() : "");

  const findBy = (keywords) => {
    for (const x of arr) {
      const t = low(x);
      if (keywords.some((k) => t.includes(k))) return x;
    }
    return "";
  };

  // Ton
  let tone =
    findBy(["ton est", "ton:", "tone", "professionnel", "respectueux", "agressif", "polie", "chaleureux"]) ||
    "";

  // Intention
  let intent =
    findBy(["intention", "vise", "objectif", "demande", "propose", "invitation", "souhaite", "relance"]) ||
    "";

  // Risque / point d’attention
  let risk =
    findBy(["attention", "risque", "point d’attention", "à éviter", "prudence", "sensible"]) ||
    "";

  // Fallbacks si analysis = liste générique
  if (!tone && arr[2]) tone = arr[2];
  if (!intent && arr[0]) intent = arr[0];
  if (!risk && arr[1]) risk = arr[1];

  setText("intQuickTone", tone ? tone.replace(/^ton\s*:?\s*/i, "") : "(non détecté)");
  setText("intQuickIntent", intent ? intent.replace(/^intention\s*:?\s*/i, "") : "(non détectée)");
  setText("intQuickRisk", risk ? risk.replace(/^(point d’attention|risques?)\s*:?\s*/i, "") : "(non détecté)");
}

/* ---------------- UX : langue cible optionnelle ---------------- */

function initTargetLangUX() {
  const toggle = document.getElementById("intToggleTargetLang");
  const wrap = document.getElementById("intTargetLangWrap");
  const label = document.getElementById("intTargetLanguageLabel");
  const code = document.getElementById("intTargetLanguageCode");

  if (!toggle || !wrap || !label || !code) return;

  // FR default
  label.value = "Français";
  code.value = "fr";

  toggle.addEventListener("change", () => {
    wrap.style.display = toggle.checked ? "" : "none";
    if (!toggle.checked) {
      label.value = "Français";
      code.value = "fr";
      setSelectedLanguageUI("fr", "Français", "🇫🇷");
    } else {
      setTimeout(() => label.focus(), 0);
    }
  });
}

/* ---------------- Autocomplete langues (CL_LANG) ---------------- */

function initLanguageAutocompleteInterpret() {
  const labelInput = document.getElementById("intTargetLanguageLabel");
  const codeInput = document.getElementById("intTargetLanguageCode");
  const suggestBox = document.getElementById("intLangSuggest");

  if (!labelInput || !codeInput || !suggestBox) return;

  if (!window.CL_LANG || typeof window.CL_LANG.searchLanguages !== "function") {
    console.warn("[interpret.js] window.CL_LANG absent → autocomplete désactivé");
    return;
  }

  // Default
  const def = window.CL_LANG.getLanguageByCode(codeInput.value) || window.CL_LANG.getLanguages()[0];
  if (def) {
    labelInput.value = def.name;
    codeInput.value = def.code;
    setSelectedLanguageUI(def.code, def.name, def.flag);
  }

  function close() {
    suggestBox.style.display = "none";
    suggestBox.innerHTML = "";
  }

  function render(query) {
    const q = (query || "").trim();
    const results = window.CL_LANG.searchLanguages(q).slice(0, 12);

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
      row.style.alignItems = "center";
      row.style.width = "100%";
      row.style.textAlign = "left";
      row.style.padding = "8px";
      row.innerHTML = `<span>${lang.flag || "🏳️"} ${lang.name}</span><span style="opacity:.7;">${lang.code}</span>`;

      row.addEventListener("click", () => {
        labelInput.value = lang.name;
        codeInput.value = lang.code;
        setSelectedLanguageUI(lang.code, lang.name, lang.flag);
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

/* ---------------- Copy buttons ---------------- */

function setupCopyButtons() {
  const bindCopy = (btnId, sourceId) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const old = btn.textContent;
      try {
        await navigator.clipboard.writeText(document.getElementById(sourceId)?.textContent || "");
        btn.textContent = "Copié ✓";
      } catch {
        btn.textContent = "Copie impossible";
      } finally {
        setTimeout(() => (btn.textContent = old), 1200);
      }
    });
  };

  bindCopy("btnCopyTranslation", "intTranslation");
  bindCopy("btnCopyReply", "intReply");
  bindCopy("btnCopyReplyFR", "intReplyFR");
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
  setText("intDetectedLangLabel", "—");
  fillQuickFromInsights([]);

  const btn = document.getElementById("intSubmit");
  const originalLabel = btn ? btn.textContent : "";

  const textToInterpret = (document.getElementById("intText")?.value || "").trim();
  const context = (document.getElementById("intContext")?.value || "").trim();
  const depth = (document.getElementById("intDepth")?.value || "quick").trim() || "quick";

  if (!textToInterpret) {
    setText("intError", "Collez un texte à interpréter.");
    return;
  }

  // langue cible : FR par défaut sauf si checkbox
  const toggle = document.getElementById("intToggleTargetLang");
  const forceTarget = !!(toggle && toggle.checked);

  const targetLangCode = (document.getElementById("intTargetLanguageCode")?.value || "fr").trim() || "fr";
  const targetLangName = (document.getElementById("intTargetLanguageLabel")?.value || "Français").trim() || "Français";

  const payload = {
    language: forceTarget ? targetLangCode : "fr",
    languageName: forceTarget ? targetLangName : "Français",
    depth,
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

    // Stocke pour "Répondre"
    window.__CL_LAST_INTERPRET__ = {
      originalText: textToInterpret,
      detectedLanguage: parsed.detectedLanguage || "",
      chosenTargetLangCode: payload.language,
      chosenTargetLangName: payload.languageName,
    };

    // 1) Traduction texte (pas JSON)
    setText("intTranslation", parsed.translationText || "(traduction vide)");

    // 2) Langue détectée
    setText("intDetectedLangLabel", parsed.detectedLanguage || "auto");

    // 3) Bulles à droite
    fillQuickFromInsights(parsed.insights);

    // Meta
    const metaBits = [];
    metaBits.push(`Langue détectée : ${parsed.detectedLanguage || "auto"}`);
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

/* ---------------- Répondre ---------------- */

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

  const last = window.__CL_LAST_INTERPRET__ || {};
  const originalText = last.originalText || (document.getElementById("intText")?.value || "").trim();

  if (!originalText) {
    setText("intReplyError", "Collez d’abord un texte et lancez l’interprétation.");
    return;
  }

  // On demande la réponse dans la langue d’origine (si backend comprend), sinon il fera au mieux
  const detectedLangName = last.detectedLanguage || "Langue d’origine";
  const detectedLangCode = "auto"; // fallback safe

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
      targetLangName: detectedLangName,
      targetLangCode: detectedLangCode,
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

    // FR contrôle (ne bloque pas)
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
      setText("intReplyFR", parsedFR.translationText || "(Contrôle FR indisponible)");
    } catch {
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
