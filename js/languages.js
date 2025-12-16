// js/languages.js
// Liste "pragmatique + extensible" : ISO 639-1 + quelques variantes utiles.
// UI = noms complets (FR), codes invisibles (internes).
// Drapeau : emoji par défaut (simple, zéro asset). Sprite SVG possible plus tard.

(function () {
  const STORAGE_KEY_FAV = "cl_favorite_languages_v1";

  // Mapping simple code -> emoji (approximation UX).
  // Note : une langue != un pays, mais c’est utile et compréhensible pour l’utilisateur.
  const FLAG_EMOJI_BY_CODE = {
    fr: "🇫🇷",
    en: "🇬🇧",
    en_us: "🇺🇸",
    es: "🇪🇸",
    de: "🇩🇪",
    it: "🇮🇹",
    pt: "🇵🇹",
    pt_br: "🇧🇷",
    nl: "🇳🇱",
    pl: "🇵🇱",
    ro: "🇷🇴",
    sv: "🇸🇪",
    no: "🇳🇴",
    da: "🇩🇰",
    fi: "🇫🇮",
    cs: "🇨🇿",
    sk: "🇸🇰",
    hu: "🇭🇺",
    el: "🇬🇷",
    tr: "🇹🇷",
    ru: "🇷🇺",
    uk: "🇺🇦",
    ar: "🇸🇦",
    he: "🇮🇱",
    fa: "🇮🇷",
    hi: "🇮🇳",
    bn: "🇧🇩",
    ur: "🇵🇰",
    ta: "🇮🇳",
    te: "🇮🇳",
    mr: "🇮🇳",
    gu: "🇮🇳",
    kn: "🇮🇳",
    ml: "🇮🇳",
    pa: "🇮🇳",
    zh: "🇨🇳",
    zh_hans: "🇨🇳",
    zh_hant: "🇹🇼",
    ja: "🇯🇵",
    ko: "🇰🇷",
    vi: "🇻🇳",
    th: "🇹🇭",
    id: "🇮🇩",
    ms: "🇲🇾",
    tl: "🇵🇭",
    sw: "🇰🇪",
    yo: "🇳🇬",
    ig: "🇳🇬",
    ha: "🇳🇬",
    zu: "🇿🇦",
    af: "🇿🇦",
  };

  // Liste principale (vous pouvez l’allonger à volonté).
  // Astuce : pour l’UX pro, on privilégie les langues “business” en tête, puis le reste.
  const LANGUAGES = [
    // --- Top business / Europe ---
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "en", name: "Anglais (UK)", flag: "🇬🇧" },
    { code: "en_us", name: "Anglais (US)", flag: "🇺🇸" },
    { code: "es", name: "Espagnol", flag: "🇪🇸" },
    { code: "de", name: "Allemand", flag: "🇩🇪" },
    { code: "it", name: "Italien", flag: "🇮🇹" },
    { code: "pt", name: "Portugais (PT)", flag: "🇵🇹" },
    { code: "pt_br", name: "Portugais (BR)", flag: "🇧🇷" },
    { code: "nl", name: "Néerlandais", flag: "🇳🇱" },
    { code: "pl", name: "Polonais", flag: "🇵🇱" },
    { code: "ro", name: "Roumain", flag: "🇷🇴" },
    { code: "sv", name: "Suédois", flag: "🇸🇪" },
    { code: "no", name: "Norvégien", flag: "🇳🇴" },
    { code: "da", name: "Danois", flag: "🇩🇰" },
    { code: "fi", name: "Finnois", flag: "🇫🇮" },
    { code: "cs", name: "Tchèque", flag: "🇨🇿" },
    { code: "sk", name: "Slovaque", flag: "🇸🇰" },
    { code: "hu", name: "Hongrois", flag: "🇭🇺" },
    { code: "el", name: "Grec", flag: "🇬🇷" },
    { code: "tr", name: "Turc", flag: "🇹🇷" },
    { code: "ru", name: "Russe", flag: "🇷🇺" },
    { code: "uk", name: "Ukrainien", flag: "🇺🇦" },

    // --- MENA ---
    { code: "ar", name: "Arabe", flag: "🇸🇦" },
    { code: "he", name: "Hébreu", flag: "🇮🇱" },
    { code: "fa", name: "Persan (Farsi)", flag: "🇮🇷" },

    // --- Asie ---
    { code: "zh_hans", name: "Chinois (simplifié)", flag: "🇨🇳" },
    { code: "zh_hant", name: "Chinois (traditionnel)", flag: "🇹🇼" },
    { code: "ja", name: "Japonais", flag: "🇯🇵" },
    { code: "ko", name: "Coréen", flag: "🇰🇷" },
    { code: "vi", name: "Vietnamien", flag: "🇻🇳" },
    { code: "th", name: "Thaï", flag: "🇹🇭" },
    { code: "id", name: "Indonésien", flag: "🇮🇩" },
    { code: "ms", name: "Malais", flag: "🇲🇾" },
    { code: "tl", name: "Tagalog", flag: "🇵🇭" },

    // --- Inde / sous-continent ---
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "bn", name: "Bengali", flag: "🇧🇩" },
    { code: "ur", name: "Ourdou", flag: "🇵🇰" },
    { code: "ta", name: "Tamoul", flag: "🇮🇳" },
    { code: "te", name: "Télougou", flag: "🇮🇳" },
    { code: "mr", name: "Marathi", flag: "🇮🇳" },
    { code: "gu", name: "Gujarati", flag: "🇮🇳" },
    { code: "kn", name: "Kannada", flag: "🇮🇳" },
    { code: "ml", name: "Malayalam", flag: "🇮🇳" },
    { code: "pa", name: "Pendjabi", flag: "🇮🇳" },

    // --- Afrique ---
    { code: "sw", name: "Swahili", flag: "🇰🇪" },
    { code: "yo", name: "Yoruba", flag: "🇳🇬" },
    { code: "ig", name: "Igbo", flag: "🇳🇬" },
    { code: "ha", name: "Haoussa", flag: "🇳🇬" },
    { code: "zu", name: "Zoulou", flag: "🇿🇦" },
    { code: "af", name: "Afrikaans", flag: "🇿🇦" },

    // --- Divers (compléments utiles) ---
    { code: "ca", name: "Catalan", flag: "🇪🇸" },
    { code: "eu", name: "Basque", flag: "🇪🇸" },
    { code: "gl", name: "Galicien", flag: "🇪🇸" },
    { code: "bg", name: "Bulgare", flag: "🇧🇬" },
    { code: "hr", name: "Croate", flag: "🇭🇷" },
    { code: "sr", name: "Serbe", flag: "🇷🇸" },
    { code: "sl", name: "Slovène", flag: "🇸🇮" },
    { code: "et", name: "Estonien", flag: "🇪🇪" },
    { code: "lv", name: "Letton", flag: "🇱🇻" },
    { code: "lt", name: "Lituanien", flag: "🇱🇹" },
  ];

  function getLanguages() {
    // garantit flag si manquant
    return LANGUAGES.map((l) => ({
      ...l,
      flag: l.flag || FLAG_EMOJI_BY_CODE[l.code] || "🏳️",
    }));
  }

  function normalize(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function searchLanguages(query) {
    const q = normalize(query);
    if (!q) return getLanguages();
    return getLanguages().filter((l) => {
      const hay = normalize(l.name + " " + l.code);
      return hay.includes(q);
    });
  }

  function getFavorites() {
    const raw = localStorage.getItem(STORAGE_KEY_FAV);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function setFavorites(codes) {
    const uniq = Array.from(new Set(codes)).slice(0, 20);
    localStorage.setItem(STORAGE_KEY_FAV, JSON.stringify(uniq));
  }

  function toggleFavorite(code) {
    const fav = getFavorites();
    const idx = fav.indexOf(code);
    if (idx >= 0) fav.splice(idx, 1);
    else fav.unshift(code);
    setFavorites(fav);
    return fav;
  }

  function getLanguageByCode(code) {
    return getLanguages().find((l) => l.code === code) || null;
  }

  // Expose global
  window.CL_LANG = {
    getLanguages,
    searchLanguages,
    getFavorites,
    toggleFavorite,
    getLanguageByCode,
  };
})();
