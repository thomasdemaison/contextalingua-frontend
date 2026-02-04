// js/interpret.js
// POST /api/ai/interpret
// Payload legacy : { language, languageName, depth, textToInterpret, context }

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

  initInterpretLanguagePicker();
  setupInterpretPage();
});

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
  document.getElementById("intLanguageCode").value = lang.code;
  document.getElementById("intLanguageName").value = lang.name;

  const labelEl = document.getElementById("intLanguageSelectedLabel");
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

function setupInterpretPage() {
  const submitBtn = document.getElementById("intSubmit");
  const errorEl = document.getElementById("intError");
  const resultEl = document.getElementById("intOutput");

  if (!submitBtn) return;

  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (errorEl) errorEl.textContent = "";
    if (resultEl) resultEl.textContent = "";

    const language = (document.getElementById("intLanguageCode")?.value || "fr").trim() || "fr";
    const languageName = (document.getElementById("intLanguageName")?.value || "Français").trim() || "Français";
    const depth = (document.getElementById("intDepth")?.value || "quick").trim() || "quick";

    const textToInterpret = (document.getElementById("intText")?.value || "").trim();
    const context = (document.getElementById("intContext")?.value || "").trim();

    if (!textToInterpret) {
      if (errorEl) errorEl.textContent = "Merci de coller le texte à analyser.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Camille analyse…";

    try {
      const payload = { language, languageName, depth, textToInterpret, context };
      const data = await apiRequest("/ai/interpret", "POST", payload);

      const out = data?.result?.text ?? data?.result ?? data?.text ?? "";
      if (!out) throw new Error("Réponse inattendue du moteur d'interprétation.");

      resultEl.textContent = out;
    } catch (err) {
      console.error("[interpret.js] interpret failed:", err);
      if (errorEl) errorEl.textContent = err.message || "Une erreur est survenue lors de l’analyse.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Interpréter le message";
    }
  });
}
