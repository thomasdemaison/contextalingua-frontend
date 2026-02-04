// js/generate.js (MINIMAL + SECURE + FR CONTROL FIXED)
// - Génération: POST /api/ai/generate
// - Contrôle FR: POST /api/ai/interpret (payload legacy)
// - UX minimaliste + autocomplete langues via languages.js (window.CL_LANG)

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Header (menus public/auth + logout)
  try {
    if (typeof setupHeaderNavigation === "function") setupHeaderNavigation();
  } catch (e) {
    console.error("[generate.js] setupHeaderNavigation error:", e);
  }

  initLanguageAutocompleteGenerate();
  setupCopyButtons();
  attachGenerateHandlers();
});

function attachGenerateHandlers() {
  const form = document.getElementById("generateForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    runGenerate();
  });
}

function getUserLanguageFallback() {
  const nav = (navigator.language || "fr").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "fr";
}

function parseRequest(text) {
  const t = (text || "").trim();
  const out = { tone: "", objective: "", recipient: "", context: "", draft: "" };
  if (!t) return out;

  const lines = t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const pick = (prefixes) => {
    const idx = lines.findIndex((l) =>
      prefixes.some((p) => l.toLowerCase().startsWith(p))
    );
    if (idx === -1) return "";
    return lines[idx].split(":").slice(1).join(":").trim();
  };

  out.tone = pick(["ton:", "tone:"]);
  out.objective = pick(["objectif:", "objective:"]);
  out.recipient = pick(["destinataire:", "a qui:", "à qui:", "recipient:"]);
  out.context = pick(["contexte:", "context:"]);
  out.draft = pick(["texte:", "texte de depart:", "texte de départ:", "draft:"]);

  // Fallback : si rien de structuré, on met tout dans context
  const anyStructured =
    out.tone || out.objective || out.recipient || out.context || out.draft;
  if (!anyStructured) out.context = t;

  return out;
}

/* -------------------- Robust extraction helpers -------------------- */

function extractTextFromApiResponse(data) {
  // Essaie de récupérer un "texte" quelque soit le format de retour
  // (évite [object Object])
  const candidate =
    data?.result?.text ??
    data?.result ??
    data?.text ??
    data?.data?.text ??
    data?.output ??
    data?.message ??
    data;

  if (typeof candidate === "string") return candidate;

  if (candidate && typeof candidate === "object") {
    if (typeof candidate.text === "string") return candidate.text;
    if (typeof candidate.translation === "string") return candidate.translation;
    if (typeof candidate.content === "string") return candidate.content;

    // cas: { result: { text: ... } } déjà couvert, mais on garde un fallback propre
    try {
      return JSON.stringify(candidate, null, 2);
    } catch {
      return "";
    }
  }

  return "";
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
  if (!requestText) {
    if (errorEl)
      errorEl.textContent = "Écris au moins une demande (objectif/ton/contexte).";
    return;
  }

  const parsed = parseRequest(requestText);

  const langCode =
    (document.getElementById("genLanguageCode")?.value || "fr").trim() || "fr";
  const langLabel =
    (document.getElementById("genLanguageLabel")?.value || "Français").trim() ||
    "Français";
  const format =
    (document.getElementById("genFormat")?.value || "email").trim() || "email";
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
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Camille rédige…";
  }

  try {
    // 1) Génération
    const data = await apiRequest("/ai/generate", "POST", payload);
    const generatedText = extractTextFromApiResponse(data);

    if (!generatedText) throw new Error("Réponse inattendue du moteur de génération.");

    if (outEl) outEl.textContent = generatedText;

    // 2) Contrôle FR (ne bloque jamais)
    if (outFrEl) outFrEl.textContent = "Traduction FR en cours…";

    try {
      const interpretPayload = {
        language: "fr",
        languageName: "Français",
        depth: "quick",
        textToInterpret: generatedText,
        context: "",
      };

      const frData = await apiRequest("/ai/interpret", "POST", interpretPayload);
      console.log("[generate.js] interpret FR raw response:", frData);

      const frText = extractTextFromApiResponse(frData);

      if (outFrEl) {
        outFrEl.textContent = frText || "(Contrôle FR indisponible pour le moment)";
      }
    } catch (e) {
      console.warn("[generate.js] FR control failed:", e);
      if (outFrEl) outFrEl.textContent = "(Contrôle FR indisponible pour le moment)";
    }
  } catch (err) {
    console.error("[generate.js] generate error:", err);
    if (errorEl) errorEl.textContent = err.message || "Erreur lors de la génération.";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel || "Générer";
    }
  }
}

/* -------------------- Autocomplete langues (languages.js / window.CL_LANG) -------------------- */

function initLanguageAutocompleteGenerate() {
  const labelInput = document.getElementById("genLanguageLabel");
  const codeInput = document.getElementById("genLanguageCode");
  const suggestBox = document.getElementById("genLangSuggest");

  if (!labelInput || !codeInput || !suggestBox) return;

  if (!window.CL_LANG || typeof window.CL_LANG.searchLanguages !== "function") {
    console.warn("[generate.js] window.CL_LANG absent → autocomplete désactivé");
    return;
  }

  // Default
  const def =
    window.CL_LANG.getLanguageByCode(codeInput.value) ||
    window.CL_LANG.getLanguages()[0];

  if (def) {
    labelInput.value = def.name;
    codeInput.value = def.code;
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

/* -------------------- Copy buttons -------------------- */

function setupCopyButtons() {
  const btnFinal = document.getElementById("btnCopyFinal");
  const btnFr = document.getElementById("btnCopyFR");

  if (btnFinal) {
    btnFinal.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(
          document.getElementById("genOutput")?.textContent || ""
        );
        btnFinal.textContent = "Copié ✓";
        setTimeout(() => (btnFinal.textContent = "Copier"), 1200);
      } catch {
        btnFinal.textContent = "Copie impossible";
        setTimeout(() => (btnFinal.textContent = "Copier"), 1200);
      }
    });
  }

  if (btnFr) {
    btnFr.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(
          document.getElementById("genOutputFR")?.textContent || ""
        );
        btnFr.textContent = "Copié ✓";
        setTimeout(() => (btnFr.textContent = "Copier"), 1200);
      } catch {
        btnFr.textContent = "Copie impossible";
        setTimeout(() => (btnFr.textContent = "Copier"), 1200);
      }
    });
  }
}
