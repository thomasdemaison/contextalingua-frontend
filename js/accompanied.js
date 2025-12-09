// js/accompanied.js
// Logique du "mode accompagné" (rédaction / interprétation) sans appel IA

document.addEventListener("DOMContentLoaded", () => {
  setupHeaderNavigation(); // vient de auth.js
  initAccompaniedMode();
});

function initAccompaniedMode() {
  const modeWriteBtn = document.getElementById("modeWriteBtn");
  const modeInterpretBtn = document.getElementById("modeInterpretBtn");
  const startBtn = document.getElementById("acStartBtn");
  const convoEl = document.getElementById("acConversation");
  const answerInput = document.getElementById("acAnswerInput");
  const answerBtn = document.getElementById("acAnswerSendBtn");
  const briefText = document.getElementById("acBriefText");
  const generateBtn = document.getElementById("acGenerateBtn");

  if (
    !modeWriteBtn ||
    !modeInterpretBtn ||
    !startBtn ||
    !convoEl ||
    !answerInput ||
    !answerBtn ||
    !briefText ||
    !generateBtn
  ) {
    console.warn(
      "[Mode accompagné] Certains éléments HTML sont manquants. Vérifiez les id : " +
        "modeWriteBtn, modeInterpretBtn, acStartBtn, acConversation, acAnswerInput, " +
        "acAnswerSendBtn, acBriefText, acGenerateBtn."
    );
    return;
  }

  // --- État interne ---
  let currentMode = "write"; // "write" ou "interpret"
  let stepIndex = 0;
  let answers = [];

  // Flots de questions différents selon le mode
  const flows = {
    write: [
      {
        id: "destinataire",
        label:
          "À qui est destiné ce message ? Décrivez le profil du ou des destinataires et votre lien avec eux.",
      },
      {
        id: "contexte",
        label:
          "Quel est le contexte de ce message ? Y a-t-il un historique important à connaître (échanges précédents, tension, enjeu business) ?",
      },
      {
        id: "objectif",
        label:
          "Quel résultat concret souhaitez-vous obtenir après l’envoi de ce message ?",
      },
      {
        id: "ton",
        label:
          "Quel ton souhaitez-vous ? (ex. très diplomate, ferme mais courtois, chaleureux, neutre, etc.)",
      },
      {
        id: "contraintes",
        label:
          "Y a-t-il des éléments à éviter absolument (mots, formulations, sujets sensibles) ou au contraire à mentionner obligatoirement ?",
      },
    ],
    interpret: [
      {
        id: "source",
        label:
          "Qui est à l’origine du message ou du texte à analyser ? Quel est votre lien avec cette personne / organisation ?",
      },
      {
        id: "texteOrigine",
        label:
          "Pouvez-vous résumer brièvement le contenu ou le sujet du texte reçu ?",
      },
      {
        id: "ressenti",
        label:
          "Quel est votre ressenti spontané en lisant ce texte ? Y voyez-vous des zones d’inconfort, de doute ou de tension ?",
      },
      {
        id: "enjeux",
        label:
          "Quels sont, selon vous, les enjeux derrière ce texte (relationnels, financiers, juridiques, réputation, etc.) ?",
      },
      {
        id: "besoin",
        label:
          "Qu’attendez-vous de Camille pour cette interprétation ? (ex. décryptage du sous-texte, suggestion de réponse, analyse des risques…) ",
      },
    ],
  };

  function setMode(newMode) {
    currentMode = newMode;
    console.log("[Mode accompagné] mode =", currentMode);

    // gestion des styles boutons
    if (currentMode === "write") {
      modeWriteBtn.classList.add("btn-secondary");
      modeWriteBtn.classList.remove("btn-ghost");
      modeInterpretBtn.classList.add("btn-ghost");
      modeInterpretBtn.classList.remove("btn-secondary");
    } else {
      modeInterpretBtn.classList.add("btn-secondary");
      modeInterpretBtn.classList.remove("btn-ghost");
      modeWriteBtn.classList.add("btn-ghost");
      modeWriteBtn.classList.remove("btn-secondary");
    }
  }

  function resetConversation() {
    stepIndex = 0;
    answers = [];
    convoEl.innerHTML = "";

    const intro = document.createElement("p");
    intro.innerHTML =
      "<strong>Camille :</strong> Parfait, nous allons clarifier la situation ensemble. " +
      "Je vais vous poser quelques questions ciblées, puis je préparerai un brief très précis.";
    convoEl.appendChild(intro);

    askNextQuestion();
    updateBrief();
  }

  function askNextQuestion() {
    const flow = flows[currentMode];
    if (!flow || stepIndex >= flow.length) {
      const done = document.createElement("p");
      done.innerHTML =
        "<strong>Camille :</strong> Merci, j’ai toutes les informations nécessaires. " +
        "Vous pouvez maintenant relire le brief à droite avant de lancer la génération.";
      convoEl.appendChild(done);
      convoEl.scrollTop = convoEl.scrollHeight;
      return;
    }

    const q = flow[stepIndex];
    const p = document.createElement("p");
    p.style.marginTop = "8px";
    p.innerHTML = `<strong>Camille :</strong> ${q.label}`;
    convoEl.appendChild(p);
    convoEl.scrollTop = convoEl.scrollHeight;
  }

  function handleAnswer() {
    const text = answerInput.value.trim();
    if (!text) return;

    // Affichage côté utilisateur
    const p = document.createElement("p");
    p.style.marginTop = "4px";
    p.innerHTML = `<strong>Vous :</strong> ${escapeHtml(text)}`;
    convoEl.appendChild(p);
    convoEl.scrollTop = convoEl.scrollHeight;

    // Enregistrement
    const flow = flows[currentMode];
    if (flow && flow[stepIndex]) {
      answers.push({
        mode: currentMode,
        id: flow[stepIndex].id,
        question: flow[stepIndex].label,
        answer: text,
      });
    }

    answerInput.value = "";
    stepIndex += 1;
    updateBrief();
    askNextQuestion();
  }

  function updateBrief() {
    const lang = document.getElementById("acMainLanguage")?.value || "fr";
    const audience = document.getElementById("acAudienceType")?.value || "unknown";
    const goal = document.getElementById("acMainGoal")?.value || "";

    let brief = "";
    brief += `Mode : ${currentMode === "write" ? "Rédaction accompagnée" : "Interprétation accompagnée"}\n`;
    brief += `Langue principale du texte final : ${lang}\n`;
    brief += `Type de destinataire : ${audience}\n`;
    if (goal) {
      brief += `Objectif principal : ${goal}\n`;
    }
    brief += "\n--- Détails issus de l’accompagnement ---\n";

    answers.forEach((a, idx) => {
      brief += `\n${idx + 1}. ${a.question}\n`;
      brief += `   → Réponse : ${a.answer}\n`;
    });

    briefText.value = brief;
  }

  // ——— LISTENERS ———
  modeWriteBtn.addEventListener("click", () => setMode("write"));
  modeInterpretBtn.addEventListener("click", () => setMode("interpret"));

  startBtn.addEventListener("click", () => {
    resetConversation();
  });

  answerBtn.addEventListener("click", () => {
    handleAnswer();
  });

  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAnswer();
    }
  });

  generateBtn.addEventListener("click", () => {
    // Pour l’instant : simple log + mise à jour du brief
    updateBrief();
    alert(
      "Le brief est prêt dans la colonne de droite.\n" +
        "Dans la V1, ce bouton appelera l’API d’IA en utilisant ce brief."
    );
  });

  // Mode par défaut
  setMode("write");
}

// utilitaire très simple pour éviter d’injecter du HTML brut
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
