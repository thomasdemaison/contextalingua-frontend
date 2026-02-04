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

  initLanguageAutocompleteGenerate();
  setupCopyButtons();
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

function initLanguageAutocompleteGenerate() {
  const labelInput = document.getElementById("genLanguageLabel");
  const codeInput  = document.getElementById("genLanguageCode");
  const suggestBox = document.getElementById("genLangSuggest");
  if (!labelInput || !codeInput || !suggestBox || !window.CL_LANG) return;

  // default
  const def = window.CL_LANG.getLanguageByCode(codeInput.value) || window.CL_LANG.getLanguages()[0];
  if (def) {
    labelInput.value = def.name;
    codeInput.value = def.code;
  }

  function close() { suggestBox.style.display = "none"; suggestBox.innerHTML = ""; }

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
function parseRequest(text) {
  const t = (text || "").trim();
  const out = { tone: "", objective: "", recipient: "", context: "", draft: "" };
  if (!t) return out;

  // Si l'utilisateur suit le format "Clé : valeur"
  const lines = t.split("\n").map(l => l.trim()).filter(Boolean);

  const pick = (prefixes) => {
    const idx = lines.findIndex(l => prefixes.some(p => l.toLowerCase().startsWith(p)));
    if (idx === -1) return "";
    const line = lines[idx];
    const val = line.split(":").slice(1).join(":").trim();
    return val;
  };

  out.tone      = pick(["ton:", "tone:"]);
  out.objective = pick(["objectif:", "objective:"]);
  out.recipient = pick(["destinataire:", "a qui:", "à qui:", "recipient:"]);
  out.context   = pick(["contexte:", "context:"]);
  out.draft     = pick(["texte:", "texte de depart:", "texte de départ:", "draft:"]);

  // Fallback : si rien n’est structuré → tout en contexte
  const anyStructured = out.tone || out.objective || out.recipient || out.context || out.draft;
  if (!anyStructured) {
    out.context = t;
  }

  return out;
}
async function runGenerate() {
  const btn = document.getElementById("genSubmit");
  const errorEl = document.getElementById("genError");
  const outEl = document.getElementById("genOutput");
  const outFrEl = document.getElementById("genOutputFR");

  if (errorEl) errorEl.textContent = "";
  if (outEl) outEl.textContent = "";
  if (outFrEl) outFrEl.textContent = "";

  const requestText = (document.getElementById("genRequest")?.value || "").trim();
  const parsed = parseRequest(requestText);

  const langCode = (document.getElementById("genLanguageCode")?.value || "fr").trim() || "fr";
  const langLabel = (document.getElementById("genLanguageLabel")?.value || "Français").trim() || "Français";
  const format = (document.getElementById("genFormat")?.value || "email").trim() || "email";
  const userLang = getUserLanguageFallback();

  const payload = {
    input: {
      tone: parsed.tone,
      objective: parsed.objective,
      recipient: parsed.recipient,
      draft: parsed.draft,
      context: parsed.context,
    },
    meta: {
      format,
      targetLangName: langLabel,
      targetLangCode: langCode,
      userLang,
    },
  };

  const originalLabel = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "Camille rédige…"; }

  try {
    const data = await apiRequest("/ai/generate", "POST", payload);
    const text = data?.result?.text ?? data?.result ?? data?.text ?? "";
    if (!text) throw new Error("Réponse inattendue du moteur de génération.");

    if (outEl) outEl.textContent = text;

    // Traduction FR de contrôle (si endpoint dispo)
    if (outFrEl) outFrEl.textContent = "Traduction FR en cours…";

    try {
      // ✅ adapte si ton endpoint s'appelle autrement
      const frData = await apiRequest("/ai/interpret", "POST", {
        input: { text }, // ou inputText selon ton API
        meta: {
          sourceLangCode: langCode,
          sourceLangName: langLabel,
          targetLangCode: "fr",
          targetLangName: "Français",
          userLang: "fr",
          mode: "translate", // si tu gères un mode
        },
      });

      const frText = frData?.result?.text ?? frData?.result ?? frData?.text ?? "";
      outFrEl.textContent = frText || "(Traduction indisponible pour le moment)";
    } catch (e) {
      // Si endpoint pas prêt, on ne bloque pas l’utilisateur
      outFrEl.textContent = "(Contrôle FR indisponible pour le moment)";
    }
  } catch (err) {
    if (errorEl) errorEl.textContent = err.message || "Erreur lors de la génération.";
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalLabel || "Générer"; }
  }
}
function setupCopyButtons() {
  document.getElementById("btnCopyFinal")?.addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("genOutput")?.textContent || "");
  });
  document.getElementById("btnCopyFR")?.addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("genOutputFR")?.textContent || "");
  });
}
