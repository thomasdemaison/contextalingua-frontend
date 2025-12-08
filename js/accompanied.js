// js/accompanied.js
// Mode accompagné : logique côté front (sans IA pour l’instant)

// Questions fixes pour le mode rédaction
const WRITE_QUESTIONS = [
  "À qui est destiné ce message (profil du ou des destinataires) ?",
  "Quel est l'objectif précis de ce message pour vous ?",
  "Quel ton souhaitez-vous adopter (formel, chaleureux, ferme, diplomate…) ?",
  "Y a-t-il des contraintes particulières (longueur, délais, éléments à absolument mentionner) ?"
];

// Questions fixes pour le mode interprétation
const INTERPRET_QUESTIONS = [
  "Dans quel contexte professionnel avez-vous reçu ce message ?",
  "Qu'attendez-vous concrètement comme résultat de l'interprétation (comprendre le ton, préparer une réponse, vérifier un risque…) ?",
  "Quels passages vous inquiètent ou vous semblent flous ?",
  "Y a-t-il des informations de contexte (relation commerciale, historique, enjeux financiers) que Camille doit connaître ?"
];

let acState = {
  mode: "write",           // "write" ou "interpret"
  currentStep: 0,
  answers: [],
  started: false
};

document.addEventListener("DOMContentLoaded", () => {
  // Sécurité : accès réservé aux utilisateurs connectés
  if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
    return;
  }

  setupModeButtons();
  setupStartButton();
  setupAnswerForm();
  setupGenerateButton();

  // État initial de l’UI
  updateModeUI();
  updateBriefPreview();
});

// ----------------- Mode (rédaction / interprétation) -----------------

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

  // Pour l’interprétation, on affiche le bloc "Texte reçu"
  if (sourceBlock) {
    sourceBlock.style.display = isWrite ? "none" : "";
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

    const lang = langEl ? langEl.value : "fr";
    const audience = audienceEl ? audienceEl.value : "";
    const goal = goalEl ? goalEl.value.trim() : "";
    const sourceText = sourceEl ? sourceEl.value.trim() : "";

    if (!goal) {
      if (errorEl) {
        errorEl.textContent = "Merci de préciser l'objectif principal.";
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

    // On stocke ces infos de base dans le state (utile pour le brief)
    acState.lang = lang;
    acState.audience = audience;
    acState.goal = goal;
    acState.sourceText = sourceText;

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

// ----------------- Gestion des questions / réponses -----------------

function setupAnswerForm() {
  const form = document.getElementById("acAnswerForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const answerInput = document.getElementById("acAnswerInput");
    if (!answerInput) return;

    const answer = answerInput.value.trim();
    if (!answer) return;

    // On affiche la réponse dans la conversation
    appendUserMessage(answer);
    acState.answers.push(answer);
    answerInput.value = "";

    // Question suivante ou fin
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
  return acState.mode === "write" ? WRITE_QUESTIONS : INTERPRET_QUESTIONS;
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
  parts.push("");

  if (acState.lang) {
    parts.push(`Langue du texte final : ${acState.lang}`);
  }

  if (acState.audience) {
    parts.push(`Type de destinataire : ${acState.audience}`);
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

// ----------------- Bouton "Générer avec Camille" (placeholder IA) -----------------

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

    // Pour l’instant : simple message de confirmation
    // (on branchera ensuite sur vos endpoints IA existants).
    alert(
      "Le brief est prêt et structuré.\n\n" +
        "Prochaine étape : nous brancherons ce mode accompagné sur l'API IA " +
        "en utilisant la même structure de requête que les pages Rédaction et Interprétation."
    );
  });
}

// ----------------- Helpers affichage conversation -----------------

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

// Sécurité simple pour éviter l'injection HTML dans la conversation
function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
