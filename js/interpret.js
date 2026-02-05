// js/interpret.js (MINIMAL + PREMIUM + ROBUSTE)
// - FR par défaut
// - Checkbox => choisir une autre langue via autocomplete (CL_LANG)
// - Parse anti JSON affiché : extrait translation + detected language + analysis
// - Lecture rapide : Langue d'origine / Ton / Intention / Point d’attention
// - Option Répondre : /ai/generate + /ai/interpret (contrôle dans la langue choisie)

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
  setText("intQuickLang", "(non détectée)");
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

  // ✅ IMPORTANT : certaines réponses sont encapsulées dans result.text (objet)
  if (result && typeof result === "object" && result.text && typeof result.text === "object") {
    return result.text;
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

  // --- 1) Traduction texte
  let translationText = "";

  if (result && typeof result === "object") {
    translationText =
      (typeof result.translation === "string" && result.translation) ||
      (typeof result.translatedText === "string" && result.translatedText) ||
      (typeof result.text === "string" && result.text) ||
      "";
  }

  if (!translationText) {
    translationText =
      (typeof data?.translation === "string" && data.translation) ||
      (typeof data?.translatedText === "string" && data.translatedText) ||
      (typeof data?.text === "string" && data.text) ||
      "";
  }

  if (!translationText && typeof result === "string") {
    translationText = result;
  }

  // --- 2) Langue détectée
  const detected =
    (result &&
      typeof result === "object" &&
      (result.detectedLanguage ||
        result.detected_language ||
        result.sourceLangName ||
        result.detectedLangName ||
        result.languageDetectedName ||
        result.source_language_name ||
        result.source_language)) ||
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
  } else if (cand && typeof cand === "objec
