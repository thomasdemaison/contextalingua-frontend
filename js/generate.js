// js/generate.js (SECURE)
// Rédaction - POST /api/ai/generate
// - Le prompt n'est PLUS construit côté front (secret côté backend)
// - Le front envoie uniquement des champs "input" + "meta"
// - Debug prompt côté client supprimé (sinon ça fuite)

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    setupHeaderNavigation();
  } catch {}

  initLanguagePickerGenerate();
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

  // Fallback click
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

function readValue(id) {
  const el = document.getElementById(id);
  if (!el) return { found: false, value: "" };
  const v = (el.value ?? "").toString();
  return { found: true, value: v };
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

  // picker
  const langCode = (document.getElementById("genLanguageCode")?.value || "fr").trim() || "fr";
  const langLabel = (document.getElementById("genLanguageLabel")?.value || "Français").trim() || "Français";

  const format = (formatR.found ? formatR.value : "email") || "email";
  const userLang = getUserLanguageFallback();

  // ✅ On n'envoie plus de prompt, seulement les champs
  const payload = {
    input: {
      tone: toneR.value,
      objective: objR.value,
      recipient: recR.value,
      draft: draftR.value,
      context: ctxR.value,
    },
    meta: {
      format,
      targetLangName: langLabel,
      targetLangCode: langCode,
      userLang,
    },
  };

  const originalLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Camille rédige…";
  }

  try {
    const data = await apiRequest("/ai/generate", "POST", payload);

    // Compat : tu avais plusieurs formats de retour
    const text = data?.result?.text ?? data?.result ?? data?.text ?? "";
    if (!text) throw new Error("Réponse inattendue du moteur de génération.");
    if (outEl) outEl.textContent = text;
  } catch (err) {
    if (errorEl) errorEl.textContent = err.message || "Erreur lors de la génération.";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel || "Lancer la rédaction";
    }
  }
}

/* ---------------- Language Picker (Generate) ---------------- */

function initLanguagePickerGenerate() {
  const picker = document.getElementById("genLangPicker");
  if (!picker || !window.CL_LANG) return;

  const labelInput = document.getElementById("genLanguageLabel");
  const codeInput = document.getElementById("genLanguageCode");
  const openBtn = document.getElementById("genLangOpenBtn");
  const panel = document.getElementById("genLangPanel");
  const search = document.getElementById("genLangSearch");
  const favList = document.getElementById("genLangFavList");
  const allList = document.getElementById("genLangAllList");

  // default
  const def = window.CL_LANG.getLanguageByCode(codeInput.value) || window.CL_LANG.getLanguages()[0];
  labelInput.value = def ? def.name : "Français";
  codeInput.value = def ? def.code : "fr";

  function closePanel() {
    panel.classList.remove("open");
  }
  function openPanel() {
    panel.classList.add("open");
    search.value = "";
    render();
    search.focus();
  }

  openBtn.addEventListener("click", () => {
    if (panel.classList.contains("open")) closePanel();
    else openPanel();
  });

  document.addEventListener("click", (e) => {
    if (!panel.classList.contains("open")) return;
    if (picker.contains(e.target)) return;
    closePanel();
  });

  function setLanguage(lang) {
    labelInput.value = lang.name;
    codeInput.value = lang.code;
    closePanel();
  }

  function row(lang, isFav) {
    const el = document.createElement("div");
    el.className = "lang-picker-row";

    const left = document.createElement("div");
    left.className = "lang-picker-left";

    const flag = document.createElement("div");
    flag.className = "lang-picker-flag";
    flag.textContent = lang.flag || "🏳️";

    const name = document.createElement("div");
    name.className = "lang-picker-name";
    name.textContent = lang.name;

    left.appendChild(flag);
    left.appendChild(name);

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "lang-picker-fav" + (isFav ? " active" : "");
    favBtn.textContent = isFav ? "★" : "☆";
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.CL_LANG.toggleFavorite(lang.code);
      render();
    });

    el.appendChild(left);
    el.appendChild(favBtn);

    el.addEventListener("click", () => setLanguage(lang));
    return el;
  }

  function render() {
    const favCodes = window.CL_LANG.getFavorites();
    const all = window.CL_LANG.searchLanguages(search.value);
    const fav = favCodes
      .map((c) => window.CL_LANG.getLanguageByCode(c))
      .filter(Boolean);

    favList.innerHTML = "";
    allList.innerHTML = "";

    if (!fav.length) {
      const empty = document.createElement("div");
      empty.style.color = "var(--text-muted)";
      empty.style.fontSize = "0.9rem";
      empty.textContent = "Aucun favori pour l’instant.";
      favList.appendChild(empty);
    } else {
      fav.forEach((l) => favList.appendChild(row(l, true)));
    }

    all.forEach((l) => allList.appendChild(row(l, favCodes.includes(l.code))));
  }

  search.addEventListener("input", render);
}
