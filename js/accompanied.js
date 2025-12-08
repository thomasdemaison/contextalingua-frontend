// js/accompanied.js
// Mode accompagné avec Camille (front-only, pas de nouvel endpoint pour l'instant)

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    // accès réservé aux utilisateurs connectés
    window.location.href = "login.html";
    return;
  }

  initGuidedMode();
});

function initGuidedMode() {
  const stepsContainer = document.getElementById("wizardSteps");
  const prevBtn = document.getElementById("prevStepBtn");
  const nextBtn = document.getElementById("nextStepBtn");
  const statusEl = document.getElementById("wizardStatus");

  if (!stepsContainer || !prevBtn || !nextBtn) {
    console.error("[Accompanied] éléments de wizard introuvables.");
    return;
  }

  const state = {
    currentStep: 0,
    mode: "generate", // "generate" ou "interpret"
    language: "fr",
    domain: "",
    recipient: "",
    objective: "",
    tone: "professionnel mais vivant",
    extraContext: "",
    sourceText: ""
  };

  const totalSteps = 7; // 1: mode, 2: langue, 3: domaine, 4: destinataire, 5: objectif, 6: ton, 7: contexte + texte source si interprétation

  function renderStep() {
    const step = state.currentStep;
    let html = "";

    if (step === 0) {
      html = `
        <div>
          <p class="camille-quote" style="margin-bottom:10px;">
            « Commençons simplement : avez-vous besoin que je <strong>rédige</strong> un texte
            ou que j’<strong>interprète</strong> un message que vous avez reçu ? »
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">
            <button type="button" class="btn btn-secondary guided-mode-btn" data-mode="generate">
              ✍ Rédaction
            </button>
            <button type="button" class="btn btn-secondary guided-mode-btn" data-mode="interpret">
              🔎 Interprétation
            </button>
          </div>
        </div>
      `;
    } else if (step === 1) {
      html = `
        <div>
          <p class="camille-quote" style="margin-bottom:10px;">
            « Dans quelle langue souhaitez-vous le résultat final ? »
          </p>
          <div class="form-field">
            <span>Langue cible</span>
            <select id="guidedLanguage">
              <option value="fr" ${state.language === "fr" ? "selected" : ""}>Français</option>
              <option value="en" ${state.language === "en" ? "selected" : ""}>Anglais</option>
              <option value="es" ${state.language === "es" ? "selected" : ""}>Espagnol</option>
              <option value="de" ${state.language === "de" ? "selected" : ""}>Allemand</option>
              <option value="it" ${state.language === "it" ? "selected" : ""}>Italien</option>
              <option value="pt" ${state.language === "pt" ? "selected" : ""}>Portugais</option>
            </select>
          </div>
        </div>
      `;
    } else if (step === 2) {
      html = `
        <div>
          <p class="camille-quote" style="margin-bottom:10px;">
            « Dites-m’en un peu plus sur le contexte métier. Dans quel environnement évoluez-vous ? »
          </p>
          <div class="form-field">
            <span>Contexte métier</span>
            <textarea id="guidedDomain" rows="3" placeholder="Ex. : cabinet de conseil en finance, BTP, logiciel SaaS, école de langues...">${state.domain || ""}</textarea>
          </div>
        </div>
      `;
    } else if (step === 3) {
      html = `
        <div>
          <p class="camille-quote" style="margin-bottom:10px;">
            « Qui est votre destinataire principal ? »
          </p>
          <div class="form-field">
            <span>Destinataire</span>
            <textarea id="guidedRecipient" rows="3" placeholder="Ex. : dirigeant de PME déjà client, prospect froid, RH d’un grand groupe, équipe interne...">${state.recipient || ""}</textarea>
          </div>
        </div>
      `;
    } else if (step === 4) {
      html = `
        <div>
          <p class="camille-quote" style="margin-bottom:10px;">
            « Quel est l’objectif précis de votre message ? »
          </p>
          <div class="form-field">
            <span>Objectif du message</span>
            <textarea id="guidedObjective" rows="3" placeholder="Ex. : obtenir un rendez-vous, clarifier un malentendu, faire accepter une proposition, expliquer une situation délicate...">${state.objective || ""}</textarea>
          </div>
        </div>
      `;
    } else if (step === 5) {
      html = `
        <div>
          <p class="camille-quote" style="margin-bottom:10px;">
            « Quel ton souhaitez-vous que j’adopte ? »
          </p>
          <div class="form-field">
            <span>Ton souhaité</span>
            <select id="guidedTone">
              <option value="professionnel mais vivant" ${state.tone === "professionnel mais vivant" ? "selected" : ""}>Professionnel mais vivant</option>
              <option value="formel et très poli" ${state.tone === "formel et très poli" ? "selected" : ""}>Formel et très poli</option>
              <option value="direct et efficace" ${state.tone === "direct et efficace" ? "selected" : ""}>Direct et efficace</option>
              <option value="chaleureux et rassurant" ${state.tone === "chaleureux et rassurant" ? "selected" : ""}>Chaleureux et rassurant</option>
            </select>
          </div>
        </div>
      `;
    } else if (step === 6) {
      html = `
        <div>
          <p class="camille-quote" style="margin-bottom:10px;">
            « Y a-t-il des contraintes ou précisions à respecter ? »
          </p>
          <div class="form-field">
            <span>Précisions supplémentaires</span>
            <textarea id="guidedExtra" rows="3" placeholder="Ex. : longueur maximale, éléments à éviter, vocabulaire à privilégier...">${state.extraContext || ""}</textarea>
          </div>

          ${
            state.mode === "interpret"
              ? `
          <div class="form-field" style="margin-top:12px;">
            <span>Texte à interpréter (copiez-collez votre message reçu)</span>
            <textarea id="guidedSourceText" rows="5" placeholder="Collez ici l’email ou le message dont vous souhaitez une interprétation fine.">${state.sourceText || ""}</textarea>
          </div>
          `
              : ""
          }
        </div>
      `;
    } else {
      // Étape finale : affichage du brief
      const brief = buildBrief(state);
      html = `
        <div>
          <p class="camille-quote" style="margin-bottom:10px;">
            « Voici le brief que j’ai préparé pour vous. Vous pouvez le copier et le coller dans le mode ${
              state.mode === "generate" ? "rédaction" : "interprétation"
            }. »
          </p>
          <div class="form-field">
            <span>Brief généré</span>
            <textarea id="guidedBriefOutput" rows="10" readonly>${brief}</textarea>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px;">
            <button type="button" class="btn btn-secondary" id="copyBriefBtn">
              Copier le brief
            </button>
            ${
              state.mode === "generate"
                ? `<a href="generate.html" class="btn btn-primary">Ouvrir le mode rédaction</a>`
                : `<a href="interpret.html" class="btn btn-primary">Ouvrir le mode interprétation</a>`
            }
          </div>
        </div>
      `;
    }

    stepsContainer.innerHTML = html;

    // Gestion des boutons mode (étape 0)
    if (state.currentStep === 0) {
      const modeButtons = document.querySelectorAll(".guided-mode-btn");
      modeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.getAttribute("data-mode");
          if (mode === "generate" || mode === "interpret") {
            state.mode = mode;
          }
          // Feedback visuel
          modeButtons.forEach((b) => {
            b.classList.remove("btn-primary");
            b.classList.add("btn-secondary");
          });
          btn.classList.remove("btn-secondary");
          btn.classList.add("btn-primary");
        });
      });
    }

    // Bouton copier le brief (étape finale)
    if (state.currentStep > totalSteps - 1) {
      const copyBtn = document.getElementById("copyBriefBtn");
      const briefOutput = document.getElementById("guidedBriefOutput");
      if (copyBtn && briefOutput) {
        copyBtn.addEventListener("click", async () => {
          const text = briefOutput.value;
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(text);
            } else {
              briefOutput.select();
              document.execCommand("copy");
            }
            copyBtn.textContent = "Brief copié ✔";
          } catch (err) {
            console.error("[Accompanied] Erreur copie presse-papiers :", err);
            copyBtn.textContent = "Impossible de copier";
          }
        });
      }
    }

    // Mettre à jour boutons précédent / suivant
    if (state.currentStep === 0) {
      prevBtn.disabled = true;
    } else {
      prevBtn.disabled = false;
    }

    if (state.currentStep <= totalSteps - 1) {
      nextBtn.style.display = "";
      nextBtn.textContent =
        state.currentStep === totalSteps - 1
          ? "Générer le brief"
          : "Étape suivante ➝";
    } else {
      nextBtn.style.display = "none";
    }

    const stepNumber =
      state.currentStep <= totalSteps - 1
        ? state.currentStep + 1
        : totalSteps + 1;
    if (statusEl) {
      statusEl.textContent =
        state.currentStep <= totalSteps - 1
          ? `Étape ${stepNumber} / ${totalSteps + 1}`
          : `Étape finale – brief généré`;
    }
  }

  function persistCurrentStepInputs() {
    const step = state.currentStep;
    if (step === 1) {
      const langSelect = document.getElementById("guidedLanguage");
      if (langSelect) state.language = langSelect.value;
    } else if (step === 2) {
      const domainEl = document.getElementById("guidedDomain");
      if (domainEl) state.domain = domainEl.value.trim();
    } else if (step === 3) {
      const recEl = document.getElementById("guidedRecipient");
      if (recEl) state.recipient = recEl.value.trim();
    } else if (step === 4) {
      const objEl = document.getElementById("guidedObjective");
      if (objEl) state.objective = objEl.value.trim();
    } else if (step === 5) {
      const toneEl = document.getElementById("guidedTone");
      if (toneEl) state.tone = toneEl.value;
    } else if (step === 6) {
      const extraEl = document.getElementById("guidedExtra");
      if (extraEl) state.extraContext = extraEl.value.trim();
      const srcEl = document.getElementById("guidedSourceText");
      if (srcEl) state.sourceText = srcEl.value.trim();
    }
  }

  prevBtn.addEventListener("click", () => {
    if (state.currentStep > 0) {
      state.currentStep -= 1;
      renderStep();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (state.currentStep <= totalSteps - 1) {
      persistCurrentStepInputs();
      state.currentStep += 1;
      renderStep();
    } else {
      // déjà sur la dernière étape "brief généré"
    }
  });

  // Render initial
  renderStep();
}

function buildBrief(state) {
  const modeLabel =
    state.mode === "interpret"
      ? "INTERPRÉTATION d'un message reçu"
      : "RÉDACTION d'un message";

  let brief = "";
  brief += `Type de demande : ${modeLabel}\n`;
  brief += `Langue cible : ${state.language || "fr"}\n\n`;

  if (state.domain) {
    brief += `Contexte métier : ${state.domain}\n\n`;
  }

  if (state.recipient) {
    brief += `Destinataire : ${state.recipient}\n\n`;
  }

  if (state.objective) {
    brief += `Objectif du message : ${state.objective}\n\n`;
  }

  if (state.tone) {
    brief += `Ton souhaité : ${state.tone}\n\n`;
  }

  if (state.extraContext) {
    brief += `Précisions supplémentaires : ${state.extraContext}\n\n`;
  }

  if (state.mode === "interpret" && state.sourceText) {
    brief += `Texte à interpréter :\n${state.sourceText}\n\n`;
    brief += `Consigne : fournissez une interprétation claire et nuancée de ce message, en explicitant les sous-entendus éventuels, le niveau de formalité, les risques et les pistes de réponse possibles.`;
  } else {
    brief += `Consigne : rédigez le message complet à ma place, en respectant le ton et l'objectif décrits ci-dessus.`;
  }

  return brief;
}
