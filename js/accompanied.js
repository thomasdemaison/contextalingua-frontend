// js/accompanied.js
// Assistant pas à pas pour le mode accompagné

document.addEventListener("DOMContentLoaded", () => {
  // On appelle les fonctions du header uniquement si elles existent
  if (typeof setupHeaderNavigation === "function") {
    setupHeaderNavigation();
  }
  if (typeof protectPageIfNeeded === "function") {
    protectPageIfNeeded();
  }

  initAccompaniedMode();
});

// acMode = null tant que l'utilisateur n'a rien choisi
let acMode = null; // "write" ou "interpret"
let acStepIndex = 0;

// Réponses stockées par mode
const acAnswers = {
  write: {
    language: "fr",
    messageType: "",
    recipientProfile: "",
    relation: "",
    goal: "",
    tone: "",
    context: "",
    rawText: "",
    constraints: ""
  },
  interpret: {
    sourceLanguage: "fr",
    summaryLanguage: "fr",
    text: "",
    relation: "",
    importance: "",
    focus: "",
    wantsAnswer: "je ne sais pas",
    format: ""
  }
};

function initAccompaniedMode() {
  const modeWriteBtn = document.getElementById("acModeWriteBtn");
  const modeInterpretBtn = document.getElementById("acModeInterpretBtn");
  const prevBtn = document.getElementById("acPrevBtn");
  const nextBtn = document.getElementById("acNextBtn");
  const launchBtn = document.getElementById("acLaunchBtn");
  const copyBtn = document.getElementById("acCopyBtn");

  if (!modeWriteBtn || !modeInterpretBtn || !prevBtn || !nextBtn || !launchBtn || !copyBtn) {
    console.warn(
      "[Mode accompagné] Certains éléments HTML sont manquants. Vérifiez accompanied.html."
    );
    return;
  }

  // Choix de mode
  modeWriteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setAcMode("write");
  });

  modeInterpretBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setAcMode("interpret");
  });

  // Navigation étapes
  prevBtn.addEventListener("click", () => {
    if (!acMode) {
      showStatus("Choisissez d’abord écrire ou comprendre.", true);
      return;
    }
    saveCurrentStep();
    if (acStepIndex > 0) {
      acStepIndex--;
      renderCurrentStep();
      updateSummary();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (!acMode) {
      showStatus("Choisissez d’abord écrire ou comprendre.", true);
      return;
    }
    if (!saveCurrentStep()) return;
    const maxSteps = getStepsCount();
    if (acStepIndex < maxSteps - 1) {
      acStepIndex++;
      renderCurrentStep();
      updateSummary();
    }
  });

  launchBtn.addEventListener("click", async () => {
    if (!acMode) {
      showStatus("Choisissez d’abord écrire ou comprendre.", true);
      return;
    }
    if (!saveCurrentStep()) return;
    updateSummary();
    await copyBriefToClipboard("Le brief a été copié. Redirection…");
    redirectToTargetPage();
  });

  copyBtn.addEventListener("click", async () => {
    if (!acMode) {
      showStatus("Choisissez d’abord écrire ou comprendre.", true);
      return;
    }
    saveCurrentStep();
    updateSummary();
    await copyBriefToClipboard("Brief copié dans le presse-papiers.");
  });

  // État neutre au chargement (aucun mode choisi)
  renderNeutralState();
  updateSummary();
}

/* -------------------- Mode & étapes -------------------- */

function setAcMode(mode) {
  acMode = mode === "interpret" ? "interpret" : "write";
  acStepIndex = 0;

  const modeWriteBtn = document.getElementById("acModeWriteBtn");
  const modeInterpretBtn = document.getElementById("acModeInterpretBtn");

  // Reset des classes
  if (modeWriteBtn && modeInterpretBtn) {
    modeWriteBtn.classList.remove("btn-primary");
    modeWriteBtn.classList.add("btn-secondary");
    modeInterpretBtn.classList.remove("btn-primary");
    modeInterpretBtn.classList.add("btn-secondary");

    // Application du style actif
    if (acMode === "write") {
      modeWriteBtn.classList.remove("btn-secondary");
      modeWriteBtn.classList.add("btn-primary");
    } else {
      modeInterpretBtn.classList.remove("btn-secondary");
      modeInterpretBtn.classList.add("btn-primary");
    }
  }

  renderCurrentStep();
  updateSummary();
  showStatus("", false);
}

function getStepsCount() {
  // Pour l’instant : 4 étapes dans les deux modes
  return 4;
}

/* -------------------- Rendu d’étape -------------------- */

function renderNeutralState() {
  const stepLabel = document.getElementById("acStepLabel");
  const stepTitle = document.getElementById("acStepTitle");
  const stepSubtitle = document.getElementById("acStepSubtitle");
  const stepBody = document.getElementById("acStepBody");
  const stepProgress = document.getElementById("acStepProgress");
  const prevBtn = document.getElementById("acPrevBtn");
  const nextBtn = document.getElementById("acNextBtn");
  const launchBtn = document.getElementById("acLaunchBtn");

  if (stepLabel) stepLabel.textContent = "Étape 0";
  if (stepTitle) stepTitle.textContent = "Choisissez votre objectif";
  if (stepSubtitle)
    stepSubtitle.textContent =
      "Sélectionnez d’abord si vous voulez rédiger un message ou comprendre un message reçu.";

  if (stepBody) {
    stepBody.innerHTML = `
      <p style="font-size:0.9rem;color:var(--text-muted);">
        Cliquez sur <strong>Écrire / reformuler un message</strong> ou
        <strong>Comprendre / interpréter un message</strong> ci-dessus pour démarrer.
      </p>
    `;
  }

  if (stepProgress) stepProgress.textContent = "Étape 0 / 4";
  if (prevBtn) prevBtn.style.visibility = "hidden";
  if (nextBtn) nextBtn.style.display = "none";
  if (launchBtn) launchBtn.style.display = "none";
}

function renderCurrentStep() {
  if (!acMode) {
    renderNeutralState();
    return;
  }

  const stepLabel = document.getElementById("acStepLabel");
  const stepTitle = document.getElementById("acStepTitle");
  const stepSubtitle = document.getElementById("acStepSubtitle");
  const stepBody = document.getElementById("acStepBody");
  const stepProgress = document.getElementById("acStepProgress");
  const prevBtn = document.getElementById("acPrevBtn");
  const nextBtn = document.getElementById("acNextBtn");
  const launchBtn = document.getElementById("acLaunchBtn");

  if (!stepBody) return;

  const total = getStepsCount();
  const stepNumber = acStepIndex + 1;

  if (stepLabel) stepLabel.textContent = `Étape ${stepNumber}`;
  if (stepProgress) stepProgress.textContent = `Étape ${stepNumber} / ${total}`;

  if (prevBtn) prevBtn.style.visibility = acStepIndex === 0 ? "hidden" : "visible";
  if (nextBtn) nextBtn.style.display =
    acStepIndex === total - 1 ? "none" : "inline-flex";
  if (launchBtn) launchBtn.style.display =
    acStepIndex === total - 1 ? "inline-flex" : "none";

  const a = acAnswers[acMode];
  let html = "";

  if (acMode === "write") {
    // --------- RÉDACTION ---------
    switch (acStepIndex) {
      case 0:
        if (stepTitle) stepTitle.textContent = "Contexte général du message";
        if (stepSubtitle)
          stepSubtitle.textContent =
            "Quelques éléments sur votre situation et le message à préparer.";
        html = `
          <div class="form-field">
            <span>Langue principale du message final</span>
            <input id="acWriteLanguage" type="text" placeholder="fr, en, es..." value="${escapeHtml(
              a.language || "fr"
            )}">
          </div>
          <div class="form-field">
            <span>Type de message</span>
            <input id="acWriteMessageType" type="text"
              placeholder="email de relance, LinkedIn, WhatsApp, note interne..."
              value="${escapeHtml(a.messageType || "")}">
          </div>
          <div class="form-field">
            <span>Contexte métier / situation</span>
            <textarea id="acWriteContext" rows="3"
              placeholder="Que se passe-t-il ? Dans quel contexte s’inscrit ce message ?">${escapeHtml(
                a.context || ""
              )}</textarea>
          </div>
        `;
        break;

      case 1:
        if (stepTitle) stepTitle.textContent = "Destinataire et relation";
        if (stepSubtitle)
          stepSubtitle.textContent =
            "Camille a besoin de savoir à qui vous écrivez et votre lien avec cette personne.";
        html = `
          <div class="form-field">
            <span>Profil du destinataire</span>
            <textarea id="acWriteRecipientProfile" rows="3"
              placeholder="Dirigeant de PME, client fidèle, prospect froid, collègue RH...">${escapeHtml(
                a.recipientProfile || ""
              )}</textarea>
          </div>
          <div class="form-field">
            <span>Votre relation / historique</span>
            <textarea id="acWriteRelation" rows="3"
              placeholder="1er contact, relation tendue, client en retard de paiement, collaboration de longue date...">${escapeHtml(
                a.relation || ""
              )}</textarea>
          </div>
        `;
        break;

      case 2:
        if (stepTitle) stepTitle.textContent = "Objectif et ton du message";
        if (stepSubtitle)
          stepSubtitle.textContent =
            "Clarifions ce que vous voulez obtenir et comment vous voulez sonner.";
        html = `
          <div class="form-field">
            <span>Objectif principal</span>
            <textarea id="acWriteGoal" rows="2"
              placeholder="obtenir un rendez-vous, relancer un paiement, rassurer un client, dire non sans braquer...">${escapeHtml(
                a.goal || ""
              )}</textarea>
          </div>
          <div class="form-field">
            <span>Ton souhaité</span>
            <input id="acWriteTone" type="text"
              placeholder="professionnel et chaleureux, direct mais diplomate..."
              value="${escapeHtml(a.tone || "")}">
          </div>
          <div class="form-field">
            <span>Contraintes particulières</span>
            <textarea id="acWriteConstraints" rows="2"
              placeholder="éléments à mentionner ou éviter, longueur max, niveau de détail...">${escapeHtml(
                a.constraints || ""
              )}</textarea>
          </div>
        `;
        break;

      case 3:
        if (stepTitle) stepTitle.textContent =
          "Texte brut / éléments à intégrer (facultatif)";
        if (stepSubtitle)
          stepSubtitle.textContent =
            "Collez ici un texte existant ou des puces que Camille devra reprendre ou améliorer.";
        html = `
          <div class="form-field">
            <span>Texte ou notes à intégrer (facultatif)</span>
            <textarea id="acWriteRawText" rows="6"
              placeholder="Collez votre message actuel, vos bullet points ou toute matière première utile...">${escapeHtml(
                a.rawText || ""
              )}</textarea>
          </div>
        `;
        break;
    }
  } else {
    // --------- INTERPRÉTATION ---------
    switch (acStepIndex) {
      case 0:
        if (stepTitle) stepTitle.textContent = "Texte à analyser";
        if (stepSubtitle)
          stepSubtitle.textContent =
            "Collez ici le message, l’email ou l’extrait que vous voulez que Camille analyse.";
        html = `
          <div class="form-field">
            <span>Texte / message reçu</span>
            <textarea id="acIntText" rows="8"
              placeholder="Collez le message tel que vous l’avez reçu (sans le modifier).">${escapeHtml(
                a.text || ""
              )}</textarea>
          </div>
          <div class="form-field">
            <span>Langue du message</span>
            <input id="acIntSourceLanguage" type="text"
              placeholder="fr, en, es..."
              value="${escapeHtml(a.sourceLanguage || "fr")}">
          </div>
        `;
        break;

      case 1:
        if (stepTitle) stepTitle.textContent = "Contexte et relation";
        if (stepSubtitle)
          stepSubtitle.textContent =
            "Pour bien interpréter le sens, le ton et les non-dits, Camille a besoin du contexte.";
        html = `
          <div class="form-field">
            <span>Qui vous a écrit ?</span>
            <textarea id="acIntRelation" rows="3"
              placeholder="client, fournisseur, manager, partenaire, administration...">${escapeHtml(
                a.relation || ""
              )}</textarea>
          </div>
          <div class="form-field">
            <span>Niveau d’enjeu pour vous</span>
            <input id="acIntImportance" type="text"
              placeholder="faible, moyen, très important, risque juridique, enjeu commercial majeur..."
              value="${escapeHtml(a.importance || "")}">
          </div>
        `;
        break;

      case 2:
        if (stepTitle) stepTitle.textContent = "Ce que vous voulez comprendre";
        if (stepSubtitle)
          stepSubtitle.textContent =
            "Précisez ce que vous attendez de l’interprétation de Camille.";
        html = `
          <div class="form-field">
            <span>Points sur lesquels vous voulez de la clarté</span>
            <textarea id="acIntFocus" rows="3"
              placeholder="ton réel, intention, risques, points flous, éléments cachés...">${escapeHtml(
                a.focus || ""
              )}</textarea>
          </div>
          <div class="form-field">
            <span>Souhaitez-vous que Camille prépare aussi une réponse ?</span>
            <input id="acIntWantsAnswer" type="text"
              placeholder="oui, non, je ne sais pas, seulement si nécessaire..."
              value="${escapeHtml(a.wantsAnswer || "je ne sais pas")}">
          </div>
        `;
        break;

      case 3:
        if (stepTitle) stepTitle.textContent =
          "Langue et forme du retour de Camille";
        if (stepSubtitle)
          stepSubtitle.textContent =
            "Dans quelle langue souhaitez-vous le résumé et sous quel format ?";
        html = `
          <div class="form-field">
            <span>Langue de la synthèse</span>
            <input id="acIntSummaryLanguage" type="text"
              placeholder="fr, en, es..."
              value="${escapeHtml(a.summaryLanguage || "fr")}">
          </div>
          <div class="form-field">
            <span>Format souhaité</span>
            <textarea id="acIntFormat" rows="3"
              placeholder="résumé simple, analyse détaillée avec points forts / points faibles, recommandation d’action...">${escapeHtml(
                a.format || ""
              )}</textarea>
          </div>
        `;
        break;
    }
  }

  stepBody.innerHTML = html;
}

/* -------------------- Sauvegarde / validation -------------------- */

function saveCurrentStep() {
  if (!acMode) return false;

  const a = acAnswers[acMode];
  const step = acStepIndex;

  if (acMode === "write") {
    switch (step) {
      case 0: {
        const lang = document.getElementById("acWriteLanguage")?.value.trim();
        const type = document.getElementById("acWriteMessageType")?.value.trim();
        const ctx = document.getElementById("acWriteContext")?.value.trim();
        a.language = lang || "fr";
        a.messageType = type || "";
        a.context = ctx || "";
        return true;
      }
      case 1: {
        const prof =
          document.getElementById("acWriteRecipientProfile")?.value.trim();
        const rel = document.getElementById("acWriteRelation")?.value.trim();
        a.recipientProfile = prof || "";
        a.relation = rel || "";
        return true;
      }
      case 2: {
        const goal = document.getElementById("acWriteGoal")?.value.trim();
        const tone = document.getElementById("acWriteTone")?.value.trim();
        const cons = document.getElementById("acWriteConstraints")?.value.trim();
        a.goal = goal || "";
        a.tone = tone || "";
        a.constraints = cons || "";
        return true;
      }
      case 3: {
        const raw = document.getElementById("acWriteRawText")?.value.trim();
        a.rawText = raw || "";
        return true;
      }
    }
  } else {
    switch (step) {
      case 0: {
        const text = document.getElementById("acIntText")?.value.trim();
        const lang = document
          .getElementById("acIntSourceLanguage")
          ?.value.trim();
        a.text = text || "";
        a.sourceLanguage = lang || "fr";

        if (!a.text) {
          showStatus("Merci de coller le message à analyser.", true);
          return false;
        }
        return true;
      }
      case 1: {
        const rel = document.getElementById("acIntRelation")?.value.trim();
        const imp = document.getElementById("acIntImportance")?.value.trim();
        a.relation = rel || "";
        a.importance = imp || "";
        return true;
      }
      case 2: {
        const foc = document.getElementById("acIntFocus")?.value.trim();
        const wa = document.getElementById("acIntWantsAnswer")?.value.trim();
        a.focus = foc || "";
        a.wantsAnswer = wa || "je ne sais pas";
        return true;
      }
      case 3: {
        const lang = document
          .getElementById("acIntSummaryLanguage")
          ?.value.trim();
        const fmt = document.getElementById("acIntFormat")?.value.trim();
        a.summaryLanguage = lang || "fr";
        a.format = fmt || "";
        return true;
      }
    }
  }
  return true;
}

/* -------------------- Récapitulatif -------------------- */

function updateSummary() {
  const summaryEl = document.getElementById("acSummary");
  if (!summaryEl) return;

  if (!acMode) {
    summaryEl.value =
      "Choisissez d’abord votre objectif :\n\n" +
      "• Écrire / reformuler un message (rédaction)\n" +
      "• Comprendre / interpréter un message reçu\n\n" +
      "Le brief se construira ici, étape par étape, à partir de vos réponses.";
    return;
  }

  const a = acAnswers[acMode];
  let summary = "";

  if (acMode === "write") {
    summary += "🎯 Mode : rédaction accompagnée\n\n";
    summary += `• Langue finale : ${a.language || "non précisé"}\n`;
    summary += `• Type de message : ${a.messageType || "non précisé"}\n\n`;
    summary += "Contexte :\n" + (a.context || "—") + "\n\n";
    summary += "Destinataire / relation :\n";
    summary += `• Profil : ${a.recipientProfile || "—"}\n`;
    summary += `• Historique / relation : ${a.relation || "—"}\n\n`;
    summary += "Objectif et ton :\n";
    summary += `• Objectif principal : ${a.goal || "—"}\n`;
    summary += `• Ton souhaité : ${a.tone || "—"}\n`;
    summary += `• Contraintes : ${a.constraints || "—"}\n\n`;
    summary += "Texte brut / matière première :\n";
    summary += (a.rawText || "aucun texte fourni pour l’instant") + "\n";
  } else {
    summary += "🔎 Mode : interprétation accompagnée\n\n";
    summary += `• Langue du message : ${a.sourceLanguage || "non précisé"}\n`;
    summary += `• Langue de la synthèse : ${
      a.summaryLanguage || "non précisé"
    }\n\n`;
    summary += "Texte à analyser :\n" + (a.text || "—") + "\n\n";
    summary += "Contexte :\n";
    summary += `• Relation avec l’auteur : ${a.relation || "—"}\n`;
    summary += `• Niveau d’enjeu : ${a.importance || "—"}\n\n`;
    summary += "Ce que vous attendez de Camille :\n";
    summary += `• Points à éclairer : ${a.focus || "—"}\n`;
    summary += `• Préparation d’une réponse ? ${a.wantsAnswer || "—"}\n`;
    summary += `• Format : ${a.format || "—"}\n`;
  }

  summaryEl.value = summary;
}

/* -------------------- Copie + redirection -------------------- */

async function copyBriefToClipboard(messageOnSuccess) {
  const summaryEl = document.getElementById("acSummary");
  if (!summaryEl) return;

  const text = summaryEl.value || "";
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showStatus(messageOnSuccess || "Brief copié.", false);
  } catch (err) {
    console.error("Erreur lors de la copie dans le presse-papiers :", err);
    showStatus(
      "Impossible de copier automatiquement. Vous pouvez copier le brief manuellement.",
      true
    );
  }
}

function redirectToTargetPage() {
  if (acMode === "write") {
    window.location.href = "generate.html";
  } else if (acMode === "interpret") {
    window.location.href = "interpret.html";
  }
}

/* -------------------- Utilitaires -------------------- */

function showStatus(msg, isError) {
  const el = document.getElementById("acStatusMessage");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isError ? "var(--danger)" : "var(--accent-strong)";
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
