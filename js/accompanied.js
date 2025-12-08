// js/accompanied.js
// Mode accompagné : logique côté front (sans IA pour l’instant)

// Questions pour la RÉDACTION accompagnée
const WRITE_QUESTIONS = [
  "Qui est votre destinataire (profil + lien avec vous) ?",
  "Que s'est-il passé juste avant ce message ? (contexte factuel en quelques lignes)",
  "Quel résultat concret attendez-vous après lecture du message ?",
  "Quel ton souhaitez-vous que Camille adopte (par défaut : professionnel, clair et respectueux) ?",
  "Y a-t-il des éléments à inclure absolument ou au contraire à éviter ?"
];

// Questions INTERPRÉTATION – analyse seule
const INTERPRET_ANALYSE_QUESTIONS = [
  "Dans quel contexte professionnel ou personnel avez-vous reçu ce message ? (si aucun, indiquez-le)",
  "Qui est l'auteur du message et quel est votre lien avec cette personne ou organisation ?",
  "Qu'est-ce qui vous interroge ou vous met mal à l'aise dans ce texte ? (ton, formulation, implicite…)",
  "Y a-t-il des informations d'historique ou d'enjeux que Camille doit connaître pour interpréter correctement ?"
];

// Questions INTERPRÉTATION – analyse + préparation d’une réponse
const INTERPRET_ANALYSE_RESPONSE_QUESTIONS = [
  ...INTERPRET_ANALYSE_QUESTIONS,
  "Souhaitez-vous plutôt calmer les choses, poser un cadre ferme, négocier, ou autre ?",
  "Y a-t-il des limites à ne pas franchir dans la réponse (juridiques, relationnelles, commerciales) ?"
];

let acState = {
  mode: "write",           // "write" ou "interpret"
  interpretType: "analyse", // "analyse" ou "analyse_reponse"
  currentStep: 0,
  answers: [],
  started: false
};

document.addEventListener("DOMContentLoaded", () => {
  // Accès réservé aux utilisateurs connectés
  if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
    return;
  }

  setupModeButtons();
  setupStartButton();
  setupAnswerForm();
  setupGenerateButton();

  updateModeUI();
  updateBriefPreview();
});

// ----------------- Choix du mode -----------------

function setupModeButtons() {
  const writeBtn = document.getElementById("modeWriteBtn");
  const interpretBtn = document.getElementById("modeInterpretBtn");

  if (writeBtn) {
    writeBtn.addEventListener("click", () => {
      acState.mode = "write";
      resetConversation();
      updateModeUI();
    });
  }

  if (interpretBtn) {
    interpretBtn.addEventListener("click", () => {
      acState.mode = "interpret";
      resetConversation();
      updateModeUI();
    });
  }
}

function updateModeUI() {
  const writeBtn = document.getElementById("modeWriteBtn");
  const interpretBtn = document.getElementById("modeInterpretBtn");
  const sourceBlock = document.getElementById("acSourceBlock");
  const interpretTypeBlock = document.getElementById("acInterpretTypeBlock");

  const isWrite = acState.mode === "write";

  if (writeBtn && interpretBtn) {
    if (isWrite) {
      writeBtn.classList.remove("btn-ghost");
      writeBtn.classList.add("btn-secondary");

      interpretBtn.classList.remove("btn-secondary");
      interpretBtn.classList.add("btn-ghost");
    } else {
      interpretBtn.classList.remove("btn-ghost");
      interpretBtn.classList.add("btn-secondary");

      writeBtn.classList.remove("btn-secondary");
      writeBtn.classList.add("btn-ghost");
    }
  }

  // Pour l’interprétation : affichage du texte source + type d’accompagnement
  if (sourceBlock) {
    sourceBlock.style.display = isWrite ? "none" : "";
  }
  if (interpretTypeBlock) {
    interpretTypeBlock.style.display = isWrite ? "none" : "";
  }

  resetConversation();
  updateBriefPreview();
}

// ----------------- Démarrage de l’accompagnement -----------------

function setupStartButton() {
  const btn = document.getElementById("acStartBtn");
  const errorEl = document.getElementById("acError");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (errorEl) errorEl.textContent = "";

    const langEl = document.getElementById("acLang");
    const audienceEl = document.getElementById("acAudience");
    const goalEl = document.getElementById("acGoal");
    const sourceEl = document.getElementById("acSourceText");
    const interpretTypeEl = document.getElementById("acInterpretType");

    const lang = langEl ? langEl.value : "fr";
    const audience = audienceEl ? audienceEl.value : "";
    const goal = goalEl ? goalEl.value.trim() : "";
    const sourceText = sourceEl ? sourceEl.value.trim() : "";
    const interpretType = interpretTypeEl ? interpretTypeEl.value : "analyse";

    // Pour rester simple : objectif toujours demandé (mais libre : "comprendre", "analyser le ton", etc.)
    if (!goal) {
      if (errorEl) {
        errorEl.textContent = "Merci d’indiquer en quelques mots ce que vous attendez de Camille.";
      }
      return;
    }

    if (acState.mode === "interpret" && !sourceText) {
      if (errorEl) {
        errorEl.textContent =
          "Pour l’interprétation accompagnée, le texte reçu est nécessaire.";
      }
      return;
    }

    acState.lang = lang;
    acState.audience = audience;
    acState.goal = goal;
    acState.sourceText = sourceText;
    acState.interpretType = interpretType;

    startConversation();
  });
}

function startConversation() {
  acState.started = true;
  acState.currentStep = 0;
  acState.answers = [];

  const convEl = document.getElementById("acConversation");
  const form = document.getElementById("acAnswerForm");
  const answerInput = document.getElementById("acAnswerInput");

  if (convEl) {
    convEl.innerHTML = "";
    appendCamilleMessage(
      "Parfait, nous allons clarifier la situation ensemble. " +
        "Je vais vous poser quelques questions ciblées, puis je préparerai un brief complet."
    );
  }

  if (form) form.style.display = "";
  if (answerInput) answerInput.value = "";

  showNextQuestion();
}

// ----------------- Questions / réponses -----------------

function setupAnswerForm() {
  const form = document.getElementById("acAnswerForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const answerInput = document.getElementById("acAnswerInput");
    if (!answerInput) return;

    const answer = answerInput.value.trim();
    if (!answer) return;

    appendUserMessage(answer);
    acState.answers.push(answer);
    answerInput.value = "";

    const questions = getCurrentQuestions();
    if (acState.currentStep >= questions.length) {
      endConversation();
    } else {
      showNextQuestion();
    }

    updateBriefPreview();
  });
}

function getCurrentQuestions() {
  if (acState.mode === "write") {
    return WRITE_QUESTIONS;
  }
  // mode interprétation
  if (acState.interpretType === "analyse_reponse") {
    return INTERPRET_ANALYSE_RESPONSE_QUESTIONS;
  }
  return INTERPRET_ANALYSE_QUESTIONS;
}

function showNextQuestion() {
  const questions = getCurrentQuestions();
  const index = acState.currentStep;

  if (index >= questions.length) {
    endConversation();
    return;
  }

  const question = questions[index];
  acState.currentStep++;

  appendCamilleMessage(question);

  const label = document.getElementById("acCurrentQuestionLabel");
  if (label) {
    label.textContent = "Camille : " + question;
  }
}

function endConversation() {
  appendCamilleMessage(
    "Merci pour toutes ces précisions. Le brief est prêt, vous pouvez maintenant lancer la génération."
  );

  const form = document.getElementById("acAnswerForm");
  if (form) {
    form.style.display = "none";
  }

  const generateBtn = document.getElementById("acGenerateBtn");
  if (generateBtn) {
    generateBtn.disabled = false;
  }

  updateBriefPreview();
}

// ----------------- Construction du brief -----------------

function updateBriefPreview() {
  const briefEl = document.getElementById("acBriefPreview");
  if (!briefEl) return;

  const modeLabel =
    acState.mode === "write" ? "Rédaction accompagnée" : "Interprétation accompagnée";

  const parts = [];
  parts.push(`Mode : ${modeLabel}`);

  if (acState.mode === "interpret") {
    const typeLabel =
      acState.interpretType === "analyse_reponse"
        ? "Analyse du texte + préparation d’une réponse"
        : "Analyse / compréhension du texte uniquement";
    parts.push(`Type d’accompagnement : ${typeLabel}`);
  }

  parts.push("");

  if (acState.lang) {
    parts.push(`Langue du texte final : ${acState.lang}`);
  }

  if (acState.audience) {
    parts.push(`Type de destinataire (si pertinent) : ${acState.audience}`);
  }

  if (acState.goal) {
    parts.push(`Objectif principal : ${acState.goal}`);
  }

  if (acState.mode === "interpret" && acState.sourceText) {
    parts.push("");
    parts.push("Texte reçu à interpréter :");
    parts.push(acState.sourceText);
  }

  if (acState.answers && acState.answers.length > 0) {
    parts.push("");
    parts.push("Réponses détaillées de l'utilisateur :");
    const questions = getCurrentQuestions();
    acState.answers.forEach((answer, idx) => {
      const q = questions[idx] || `Question ${idx + 1}`;
      parts.push(`- ${q}`);
      parts.push(`  → ${answer}`);
    });
  }

  briefEl.value = parts.join("\n");
}

// ----------------- Bouton "Générer avec Camille" -----------------

function setupGenerateButton() {
  const btn = document.getElementById("acGenerateBtn");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();

    const briefEl = document.getElementById("acBriefPreview");
    if (!briefEl || !briefEl.value.trim()) {
      alert("Le brief est vide. Répondez d'abord aux questions de Camille.");
      return;
    }

    alert(
      "Le brief est prêt et structuré.\n\n" +
        "Prochaine étape : nous brancherons ce mode accompagné sur l'API IA " +
        "en utilisant la même structure de requête que les pages Rédaction et Interprétation."
    );
  });
}

// ----------------- Helpers conversation -----------------

function appendCamilleMessage(text) {
  const convEl = document.getElementById("acConversation");
  if (!convEl) return;

  const p = document.createElement("p");
  p.style.color = "var(--text-main)";
  p.innerHTML = `<strong>Camille :</strong> ${escapeHtml(text)}`;
  convEl.appendChild(p);
  convEl.scrollTop = convEl.scrollHeight;
}

function appendUserMessage(text) {
  const convEl = document.getElementById("acConversation");
  if (!convEl) return;

  const p = document.createElement("p");
  p.style.color = "var(--text-muted)";
  p.style.textAlign = "right";
  p.innerHTML = `<strong>Vous :</strong> ${escapeHtml(text)}`;
  convEl.appendChild(p);
  convEl.scrollTop = convEl.scrollHeight;
}

function resetConversation() {
  acState.started = false;
  acState.currentStep = 0;
  acState.answers = [];

  const convEl = document.getElementById("acConversation");
  const form = document.getElementById("acAnswerForm");
  const answerInput = document.getElementById("acAnswerInput");
  const generateBtn = document.getElementById("acGenerateBtn");

  if (convEl) {
    convEl.innerHTML = "";
    const p = document.createElement("p");
    p.style.color = "var(--text-muted)";
    p.textContent = "Camille attend que vous lanciez le mode accompagné.";
    convEl.appendChild(p);
  }

  if (form) form.style.display = "none";
  if (answerInput) answerInput.value = "";
  if (generateBtn) generateBtn.disabled = true;
}

// Sécurité simple pour éviter l'injection HTML
function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
