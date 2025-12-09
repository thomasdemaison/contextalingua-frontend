// js/accompanied.js
// Mode accompagné de Camille – logique 100 % côté front, sans appel API.

/**
 * Etat global du mode accompagné
 */
const acState = {
  mode: "write",           // "write" | "interpret"
  step: 0,                 // index de la question en cours
  answers: {},             // { questionId: reponse }
  language: "fr",          // langue principale du texte final
  recipientType: "",       // type de destinataire (utile surtout en rédaction)
  objective: "",           // objectif principal
  sourceText: "",          // texte reçu (interprétation)
};

/**
 * Questions pour le mode RÉDACTION accompagnée
 * Orientation : contexte, destinataire, objectif, ton, contraintes.
 */
const QUESTIONS_WRITE = [
  {
    id: "recipient_profile",
    label:
      "À qui est destiné ce message ? Décrivez le profil du ou des destinataires et votre lien avec eux.",
  },
  {
    id: "context_before",
    label:
      "Que s'est-il passé juste avant ce message ? Donnez le contexte factuel en quelques lignes.",
  },
  {
    id: "main_goal",
    label:
      "Quel résultat concret attendez-vous après lecture de ce message (par exemple : obtenir une réponse, sécuriser un rendez-vous, relancer un paiement, clarifier un malentendu…) ?",
  },
  {
    id: "tone_details",
    label:
      "Comment souhaitez-vous que Camille s'exprime ? (par défaut : professionnel, clair et respectueux). Précisez si vous voulez plus chaleureux, plus ferme, plus diplomate, etc.",
  },
  {
    id: "must_have",
    label:
      "Y a-t-il des éléments à inclure absolument (mentions légales, conditions, arguments clés, concessions possibles…) ?",
  },
  {
    id: "must_avoid",
    label:
      "Y a-t-il au contraire des éléments ou formulations à éviter à tout prix (sujets sensibles, termes juridiques, reproches explicites…) ?",
  },
];

/**
 * Questions pour le mode INTERPRÉTATION accompagnée
 * Orientation : compréhension fine d’un texte reçu.
 */
const QUESTIONS_INTERPRET = [
  {
    id: "interpret_context",
    label:
      "Dans quel contexte professionnel ou personnel avez-vous reçu ce message ou ce texte ? (Si aucun contexte particulier, indiquez-le simplement.)",
  },
  {
    id: "author_profile",
    label:
      "Qui est l'auteur du message et quel est votre lien avec cette personne ou organisation (client, fournisseur, hiérarchie, administration, proche…) ?",
  },
  {
    id: "what_bothers_you",
    label:
      "Qu'est-ce qui vous interroge, vous met mal à l'aise ou vous semble flou dans ce texte ? (Exemples : ton agressif, menace implicite, demande peu claire, non-dit, etc.)",
  },
  {
    id: "stakes",
    label:
      "Quels sont les enjeux pour vous dans cette situation (financiers, relationnels, juridiques, RH…) ?",
  },
  {
    id: "need_reply",
    label:
      "Souhaitez-vous uniquement une analyse du message, ou aussi préparer une réponse adaptée ? Précisez ce que vous attendez : comprendre, décider quoi faire, rédiger une réponse…",
  },
  {
    id: "limits",
    label:
      "Y a-t-il des limites à ne pas franchir dans l'interprétation ou une éventuelle réponse (ton à éviter, menaces, références juridiques, etc.) ?",
  },
];

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const modeWriteBtn = document.getElementById("modeWriteBtn");
  const modeInterpretBtn = document.getElementById("modeInterpretBtn");
  const startBtn = document.getElementById("acStartBtn");

  const convoEl = document.getElementById("acConversation");
  const answerInput = document.getElementById("acAnswerInput");
  const answerSendBtn = document.getElementById("acAnswerSendBtn");
  const briefEl = document.getElementById("acBriefText");
  const generateBtn = document.getElementById("acGenerateBtn");

  if (!convoEl || !answerInput || !answerSendBtn || !briefEl || !generateBtn) {
    console.warn(
      "[Mode accompagné] Certains éléments HTML sont manquants. Vérifiez les id : acConversation, acAnswerInput, acAnswerSendBtn, acBriefText, acGenerateBtn."
    );
  }

  // --- Choix de mode (écriture / interprétation) ---

  if (modeWriteBtn && modeInterpretBtn) {
    modeWriteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setMode("write");
    });

    modeInterpretBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setMode("interpret");
    });
  }

  // --- Démarrage de l’accompagnement ---

  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      e.preventDefault();
      startAccompaniedMode();
    });
  }

  // --- Envoi des réponses utilisateur ---

  if (answerSendBtn && answerInput) {
    answerSendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleUserAnswer();
    });

    // Option : envoyer avec Ctrl+Enter
    answerInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUserAnswer();
      }
    });
  }

  // --- Bouton "Générer avec Camille" (pour l’instant local uniquement) ---

  if (generateBtn && briefEl) {
    generateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!briefEl.value.trim()) {
        alert(
          "Le brief est encore vide. Répondez aux questions de Camille pour le remplir."
        );
        return;
      }
      // Ici, plus tard, on redirigera vers generate.html / interpret.html
      // avec stockage du brief dans localStorage.
      alert(
        "Brief prêt pour Camille.\n\nPour l’instant, ce bouton ne fait qu’afficher ce message. Nous le brancherons ensuite au moteur IA (en réutilisant ce brief)."
      );
    });
  }

  // Mode par défaut : rédaction
  setMode("write", false);
});

// ---------------------------------------------------------------------------
// Fonctions de mode & démarrage
// ---------------------------------------------------------------------------

/**
 * Change le mode (write | interpret)
 */
function setMode(mode, resetConversation = true) {
  acState.mode = mode === "interpret" ? "interpret" : "write";

  const modeWriteBtn = document.getElementById("modeWriteBtn");
  const modeInterpretBtn = document.getElementById("modeInterpretBtn");
  const briefEl = document.getElementById("acBriefText");

  if (modeWriteBtn && modeInterpretBtn) {
    if (acState.mode === "write") {
      modeWriteBtn.classList.remove("btn-ghost");
      modeWriteBtn.classList.add("btn-secondary");
      modeInterpretBtn.classList.remove("btn-secondary");
      modeInterpretBtn.classList.add("btn-ghost");
    } else {
      modeInterpretBtn.classList.remove("btn-ghost");
      modeInterpretBtn.classList.add("btn-secondary");
      modeWriteBtn.classList.remove("btn-secondary");
      modeWriteBtn.classList.add("btn-ghost");
    }
  }

  // Met à jour le chapeau du brief
  if (briefEl) {
    if (acState.mode === "write") {
      briefEl.value =
        "Mode : Rédaction accompagnée\n\nCe brief sera utilisé pour générer un texte comme si vous l'aviez écrit vous-même.\n\n";
    } else {
      briefEl.value =
        "Mode : Interprétation accompagnée\n\nCe brief sera utilisé pour analyser un texte reçu et, si besoin, préparer une réponse adaptée.\n\n";
    }
  }

  if (resetConversation) {
    resetConversationArea();
  }

  console.log("[Mode accompagné] mode =", acState.mode);
}

/**
 * Démarre une nouvelle session d’accompagnement :
 * - récupère les champs du formulaire (langue, objectif, etc.)
 * - réinitialise les réponses
 * - lance la première question.
 */
function startAccompaniedMode() {
  // Récupérer les champs de la partie haute du formulaire
  const languageSelect = document.getElementById("acLanguage");
  const recipientSelect = document.getElementById("acRecipientType");
  const objectiveInput = document.getElementById("acObjective");
  const sourceTextArea = document.getElementById("acSourceText");

  acState.language = languageSelect ? languageSelect.value || "fr" : "fr";
  acState.recipientType = recipientSelect ? recipientSelect.value || "" : "";
  acState.objective = objectiveInput ? objectiveInput.value.trim() : "";
  acState.sourceText = sourceTextArea ? sourceTextArea.value.trim() : "";

  if (acState.mode === "interpret" && !acState.sourceText) {
    alert(
      "En mode interprétation, merci de coller le texte ou le message à analyser avant de démarrer."
    );
    return;
  }

  // Réinitialisation
  acState.step = 0;
  acState.answers = {};

  resetConversationArea(true);

  // Message d'intro de Camille
  addCamilleMessage(
    acState.mode === "write"
      ? "Parfait, nous allons clarifier la situation pour rédiger un message qui vous ressemble. Je vais vous poser quelques questions ciblées, puis je préparerai un brief très précis."
      : "Très bien, nous allons analyser ce texte ensemble. Je vais vous poser quelques questions pour comprendre le contexte, les enjeux et ce qui vous pose question."
  );

  // Première question
  askNextQuestion();
}

/**
 * Remet à zéro la zone de conversation
 */
function resetConversationArea(clearAll = false) {
  const convoEl = document.getElementById("acConversation");
  const answerInput = document.getElementById("acAnswerInput");

  if (convoEl) {
    convoEl.innerHTML = "";
  }
  if (answerInput && clearAll) {
    answerInput.value = "";
  }
}

// ---------------------------------------------------------------------------
// Gestion du "chat" avec Camille
// ---------------------------------------------------------------------------

/**
 * Ajoute un message de Camille dans la zone de conversation
 */
function addCamilleMessage(text) {
  const convoEl = document.getElementById("acConversation");
  if (!convoEl) return;

  const p = document.createElement("p");
  p.style.marginBottom = "8px";
  p.innerHTML = `<strong>Camille :</strong> ${escapeHtml(text)}`;
  convoEl.appendChild(p);
  convoEl.scrollTop = convoEl.scrollHeight;
}

/**
 * Ajoute un message de l’utilisateur dans la zone de conversation
 */
function addUserMessage(text) {
  const convoEl = document.getElementById("acConversation");
  if (!convoEl) return;

  const p = document.createElement("p");
  p.style.marginBottom = "8px";
  p.style.color = "#cbd5f5";
  p.innerHTML = `<strong>Vous :</strong> ${escapeHtml(text)}`;
  convoEl.appendChild(p);
  convoEl.scrollTop = convoEl.scrollHeight;
}

/**
 * Gestion de la réponse utilisateur à une question
 */
function handleUserAnswer() {
  const answerInput = document.getElementById("acAnswerInput");
  if (!answerInput) return;

  const text = answerInput.value.trim();
  if (!text) return;

  // Ajout dans le "chat"
  addUserMessage(text);

  // Stockage de la réponse
  const questions = acState.mode === "write" ? QUESTIONS_WRITE : QUESTIONS_INTERPRET;
  const currentQuestion = questions[acState.step - 1]; // step a déjà été avancé lors de askNextQuestion

  if (currentQuestion) {
    acState.answers[currentQuestion.id] = text;
  }

  // Préparer la prochaine question
  answerInput.value = "";
  askNextQuestion();
}

/**
 * Pose la question suivante ou termine le brief
 */
function askNextQuestion() {
  const questions = acState.mode === "write" ? QUESTIONS_WRITE : QUESTIONS_INTERPRET;

  if (acState.step >= questions.length) {
    // Plus de questions → construire le brief
    finalizeBrief();
    addCamilleMessage(
      "Merci pour vos réponses. Le brief est maintenant prêt dans la colonne de droite. Vous pourrez l'utiliser pour lancer une rédaction ou une interprétation avec Camille."
    );
    return;
  }

  const question = questions[acState.step];
  acState.step += 1;

  addCamilleMessage(question.label);
}

// ---------------------------------------------------------------------------
// Construction du brief final
// ---------------------------------------------------------------------------

/**
 * Construit le brief complet dans le textarea de droite
 */
function finalizeBrief() {
  const briefEl = document.getElementById("acBriefText");
  const generateBtn = document.getElementById("acGenerateBtn");
  if (!briefEl) return;

  let brief = "";

  if (acState.mode === "write") {
    brief += "Mode : Rédaction accompagnée\n\n";
    brief += `Langue cible : ${acState.language || "fr"}\n`;
    if (acState.recipientType) {
      brief += `Type de destinataire : ${acState.recipientType}\n`;
    }
    if (acState.objective) {
      brief += `Objectif principal saisi : ${acState.objective}\n`;
    }
    brief += "\n--- Contexte et attentes ---\n";

    brief += formatAnswerBlock(
      "Destinataire / lien avec vous",
      acState.answers["recipient_profile"]
    );
    brief += formatAnswerBlock(
      "Contexte avant ce message",
      acState.answers["context_before"]
    );
    brief += formatAnswerBlock(
      "Résultat concret attendu",
      acState.answers["main_goal"]
    );
    brief += formatAnswerBlock("Ton souhaité", acState.answers["tone_details"]);
    brief += formatAnswerBlock(
      "Éléments à inclure absolument",
      acState.answers["must_have"]
    );
    brief += formatAnswerBlock(
      "Éléments ou formulations à éviter",
      acState.answers["must_avoid"]
    );

    brief +=
      "\nCamille devra rédiger le message final comme si l'utilisateur l'avait écrit lui-même, en respectant ces éléments.";
  } else {
    // Mode INTERPRÉTATION
    brief += "Mode : Interprétation accompagnée\n\n";
    brief += `Langue principale du texte analysé : ${acState.language || "fr"}\n`;
    brief += "\n--- Texte reçu ---\n";
    brief += acState.sourceText
      ? acState.sourceText + "\n\n"
      : "(aucun texte fourni)\n\n";

    brief += "--- Contexte et enjeux ---\n";
    brief += formatAnswerBlock(
      "Contexte de réception",
      acState.answers["interpret_context"]
    );
    brief += formatAnswerBlock(
      "Profil et lien avec l'auteur",
      acState.answers["author_profile"]
    );
    brief += formatAnswerBlock(
      "Ce qui pose question / malaise",
      acState.answers["what_bothers_you"]
    );
    brief += formatAnswerBlock("Enjeux pour l'utilisateur", acState.answers["stakes"]);
    brief += formatAnswerBlock(
      "Attente principale (analyse seule ou analyse + réponse)",
      acState.answers["need_reply"]
    );
    brief += formatAnswerBlock(
      "Limites / choses à éviter dans la réponse",
      acState.answers["limits"]
    );

    brief +=
      "\nCamille devra analyser le texte en expliquant le ton, les implicites éventuels, les risques ou opportunités, puis proposer si besoin une stratégie de réponse alignée avec ces contraintes.";
  }

  briefEl.value = brief;

  if (generateBtn) {
    generateBtn.disabled = false;
  }
}

/**
 * Utilitaire pour formatter un bloc de réponse dans le brief
 */
function formatAnswerBlock(title, value) {
  if (!value || !value.trim()) return "";
  return `\n${title} :\n${value.trim()}\n`;
}

/**
 * Echappement minimal pour éviter l'injection HTML dans la zone de "chat"
 */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
