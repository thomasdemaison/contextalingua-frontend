// js/interpret.js (SECURE + PREMIUM)
// - POST /api/ai/interpret : { language, languageName, depth, textToInterpret, context }
// - Traduction en FR par défaut
// - Affiche langue détectée
// - Lecture rapide : parsing tolérant (plus de "(non détecté)" si dispo)
// - Répondre : génère dans la langue d'origine détectée + FR de contrôle

console.log("[interpret.js] loaded");

let LAST_DETECTED = { code: null, name: null }; // langue d'origine détectée

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // header (menus + logout)
  try {
    if (typeof setupHeaderNavigation === "function") setupHeaderNavigation();
  } catch (e) {
    console.error("[interpret.js] setupHeaderNavigation error:", e);
  }

  initInterpretLanguagePicker();
  setupCopyButtons();
  setupInterpretSubmit();
  setupReplySubmit();
});

/* -------------------- Langues (UI) -------------------- */

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

function setInterpretSelectedLanguage(lang) {
  const codeEl = document.getElementById("intLanguageCode");
  const nameEl = document.getElementById("intLanguageName");
  const labelEl = document.getElementById("intLanguageSelectedLabel");

  if (codeEl) codeEl.value = lang.code;
  if (nameEl) nameEl.value = lang.name;
  if (labelEl) labelEl.textContent = `${lang.flag} ${lang.name}`;

  document.querySelectorAll(".int-lang-pill").forEach((btn) => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-secondary");
    btn.style.borderColor = "rgba(148, 163, 184, 0.35)";
  });

  const activeBtn = document.querySelector(`.int-lang-pill[data-code="${lang.code}"]`);
  if (activeBtn) {
    activeBtn.classList.remove("btn-secondary");
    activeBtn.classList.add("btn-primary");
    activeBtn.style.borderColor = "rgba(37, 99, 235, 0.8)";
  }
}

function renderInterpretLanguageGrid(filterText = "") {
  const grid = document.getElementById("intLanguageGrid");
  if (!grid) return;

  const q = normalize(filterText);
  const items = q ? LANGUAGES.filter((l) => normalize(l.name).includes(q)) : LANGUAGES;

  grid.innerHTML = "";

  items.slice(0, 40).forEach((lang) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary int-lang-pill";
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

    btn.addEventListener("click", () => setInterpretSelectedLanguage(lang));
    grid.appendChild(btn);
  });
}

function initInterpretLanguagePicker() {
  const search = document.getElementById("intLanguageSearch");
  renderInterpretLanguageGrid("");

  const defaultLang = LANGUAGES.find((l) => l.code === "fr") || LANGUAGES[0];
  setInterpretSelectedLanguage(defaultLang);

  if (search) {
    search.addEventListener("input", () => {
      renderInterpretLanguageGrid(search.value);
      const found = findLanguageByName(search.value);
      if (found) setInterpretSelectedLanguage(found);
    });
  }
}

/* -------------------- Helpers affichage -------------------- */

function setText(id, value, fallback = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (value ?? "") || fallback;
}

function asText(v) {
  if (typeof v === "string") return v;
  if (v == null) return "";
  // évite [object Object]
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function pick(obj, paths) {
  for (const p of paths) {
    const parts = p.split(".");
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (!cur || typeof cur !== "object" || !(part in cur)) {
        ok = false;
        break;
      }
      cur = cur[part];
    }
    if (ok && cur != null) return cur;
  }
  return null;
}

function updateDetectedLanguageLabel(code, name) {
  const pretty = code && name ? `${code} — ${name}` : code ? code : "—";
  setText("intDetectedLangLabel", pretty, "—");
}

/* -------------------- Interpret submit -------------------- */

function setupInterpretSubmit() {
  const btn = document.getElementById("intSubmit");
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    setText("intError", "");
    setText("intTranslation", "");
    setText("intQuickTone", "(non détecté)");
    setText("intQuickIntent", "(non détectée)");
    setText("intQuickRisk", "(non détecté)");
    updateDetectedLanguageLabel(null, null);

    const langCode = (document.getElementById("intLanguageCode")?.value || "fr").trim() || "fr";
    const langName = (document.getElementById("intLanguageName")?.value || "Français").trim() || "Français";
    const depth = (document.getElementById("intDepth")?.value || "quick").trim() || "quick";

    const textToInterpret = (document.getElementById("intText")?.value || "").trim();
    const context = (document.getElementById("intContext")?.value || "").trim();

    if (!textToInterpret) {
      setText("intError", "Merci de coller le texte à analyser.");
      return;
    }

    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Camille analyse…";

    try {
      const payload = {
        language: langCode,
        languageName: langName,
        depth,
        textToInterpret,
        context,
      };

      const data = await apiRequest("/ai/interpret", "POST", payload);

      // ✅ parsing souple
      const result = data?.result ?? data;

      // 1) Texte traduit / réponse principale
      const translated =
        pick(result, ["text", "translation", "translatedText", "output.text", "result.text"]) ||
        pick(data, ["result.text", "text"]);
      if (translated) setText("intTranslation", asText(translated));
      else setText("intTranslation", "(Aucune traduction retournée)");

      // 2) Langue détectée (origine)
      const detCode =
        pick(result, [
          "detectedLanguage.code",
          "detected.languageCode",
          "sourceLanguage.code",
          "sourceLang.code",
          "meta.sourceLangCode",
          "meta.detectedLangCode",
        ]) || null;

      const detName =
        pick(result, [
          "detectedLanguage.name",
          "detected.languageName",
          "sourceLanguage.name",
          "sourceLang.name",
          "meta.sourceLangName",
          "meta.detectedLangName",
        ]) || null;

      LAST_DETECTED = { code: detCode, name: detName };
      updateDetectedLanguageLabel(detCode, detName);

      // 3) Lecture rapide (ton / intention / risque)
      const tone =
        pick(result, ["quickRead.tone", "quick.tone", "analysis.tone", "summary.tone"]) || null;
      const intent =
        pick(result, ["quickRead.intent", "quick.intent", "analysis.intent", "summary.intent"]) || null;
      const risk =
        pick(result, ["quickRead.risk", "quickRead.warning", "analysis.risk", "analysis.warning", "summary.warning"]) ||
        null;

      setText("intQuickTone", tone ? asText(tone) : "(non détecté)");
      setText("intQuickIntent", intent ? asText(intent) : "(non détectée)");
      setText("intQuickRisk", risk ? asText(risk) : "(non détecté)");
    } catch (err) {
      console.error("[interpret.js] interpret error:", err);
      setText("intError", err.message || "Une erreur est survenue lors de l’analyse.");
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel || "Traduire & interpréter";
    }
  });
}

/* -------------------- Reply (generate) -------------------- */

function setupReplySubmit() {
  const btn = document.getElementById("replySubmit");
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    setText("replyError", "");
    setText("replyOrig", "");
    setText("replyFR", "");

    const intent = (document.getElementById("replyIntent")?.value || "").trim();
    const originalMsg = (document.getElementById("intText")?.value || "").trim();
    const ctx = (document.getElementById("intContext")?.value || "").trim();

    if (!intent) {
      setText("replyError", "Décrivez au moins l’intention de réponse.");
      return;
    }
    if (!originalMsg) {
      setText("replyError", "Collez d’abord le message à interpréter.");
      return;
    }

    // ✅ LANGUE D’ORIGINE = détectée lors de l’interprétation
    // fallback: si pas détecté, on reste en FR pour ne pas bloquer
    const targetLangCode = LAST_DETECTED.code || "fr";
    const targetLangName = LAST_DETECTED.name || "Langue d’origine";

    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Camille rédige…";

    try {
      // 1) Générer la réponse dans la langue d'origine
      const genPayload = {
        input: {
          tone: "professionnel",
          objective: "répondre au message reçu",
          recipient: "interlocuteur",
          draft: "",
          context:
            (ctx ? `Contexte : ${ctx}\n\n` : "") +
            `Message reçu (à traiter) :\n${originalMsg}\n\n` +
            `Intention de réponse : ${intent}`,
        },
        meta: {
          format: "email",
          targetLangName,
          targetLangCode,
          userLang: "fr",
        },
      };

      const genData = await apiRequest("/ai/generate", "POST", genPayload);
      const replyText = genData?.result?.text ?? genData?.result ?? genData?.text ?? "";
      if (!replyText) throw new Error("Réponse inattendue lors de la génération.");

      setText("replyOrig", replyText);

      // 2) Contrôle FR (traduire la réponse générée vers FR)
      setText("replyFR", "Traduction FR en cours…");
      try {
        const frData = await apiRequest("/ai/interpret", "POST", {
          language: "fr",
          languageName: "Français",
          depth: "quick",
          textToInterpret: replyText,
          context: "",
        });

        const frRes = frData?.result ?? frData;
        const frText =
          pick(frRes, ["text", "translation", "translatedText", "result.text"]) ||
          pick(frData, ["result.text", "text"]) ||
          "";

        setText("replyFR", frText || "(Contrôle FR indisponible)");
      } catch (e2) {
        setText("replyFR", "(Contrôle FR indisponible)");
      }
    } catch (err) {
      console.error("[interpret.js] reply error:", err);
      setText("replyError", err.message || "Erreur lors de la génération de la réponse.");
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel || "Générer une réponse";
    }
  });
}

/* -------------------- Copy buttons -------------------- */

function setupCopyButtons() {
  document.getElementById("btnCopyTranslation")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById("intTranslation")?.textContent || "");
    } catch {}
  });

  document.getElementById("btnCopyReplyOrig")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById("replyOrig")?.textContent || "");
    } catch {}
  });

  document.getElementById("btnCopyReplyFR")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById("replyFR")?.textContent || "");
    } catch {}
  });
}
