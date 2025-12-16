// js/languages.js
// Source de vérité unique pour toutes les langues de ContextaLingua

export const LANGUAGES = [
  {
    id: "fr",
    label: "Français",
    native: "Français",
    flag: "flag-fr",
    popular: true,
    business: true,
  },
  {
    id: "en",
    label: "Anglais",
    native: "English",
    flag: "flag-gb",
    popular: true,
    business: true,
  },
  {
    id: "es",
    label: "Espagnol",
    native: "Español",
    flag: "flag-es",
    popular: true,
    business: true,
  },
  {
    id: "de",
    label: "Allemand",
    native: "Deutsch",
    flag: "flag-de",
    popular: true,
    business: true,
  },
  {
    id: "it",
    label: "Italien",
    native: "Italiano",
    flag: "flag-it",
    popular: false,
    business: true,
  },
  {
    id: "pt",
    label: "Portugais",
    native: "Português",
    flag: "flag-pt",
    popular: false,
    business: true,
  },
  {
    id: "nl",
    label: "Néerlandais",
    native: "Nederlands",
    flag: "flag-nl",
    popular: false,
    business: true,
  },
  {
    id: "pl",
    label: "Polonais",
    native: "Polski",
    flag: "flag-pl",
    popular: false,
    business: true,
  },
  {
    id: "zh",
    label: "Chinois (mandarin)",
    native: "中文",
    flag: "flag-cn",
    popular: false,
    business: true,
  },
  {
    id: "ja",
    label: "Japonais",
    native: "日本語",
    flag: "flag-jp",
    popular: false,
    business: true,
  },
  {
    id: "ar",
    label: "Arabe",
    native: "العربية",
    flag: "flag-sa",
    popular: false,
    business: true,
  },
  {
    id: "ru",
    label: "Russe",
    native: "Русский",
    flag: "flag-ru",
    popular: false,
    business: true,
  },
  {
    id: "tr",
    label: "Turc",
    native: "Türkçe",
    flag: "flag-tr",
    popular: false,
    business: false,
  },
  {
    id: "ko",
    label: "Coréen",
    native: "한국어",
    flag: "flag-kr",
    popular: false,
    business: false,
  },
  {
    id: "hi",
    label: "Hindi",
    native: "हिन्दी",
    flag: "flag-in",
    popular: false,
    business: false,
  },
];

// Helpers UX
export function getLanguageById(id) {
  return LANGUAGES.find((l) => l.id === id);
}

export function getPopularLanguages() {
  return LANGUAGES.filter((l) => l.popular);
}

export function searchLanguages(query) {
  const q = (query || "").toLowerCase();
  return LANGUAGES.filter(
    (l) =>
      l.label.toLowerCase().includes(q) ||
      (l.native && l.native.toLowerCase().includes(q))
  );
}
