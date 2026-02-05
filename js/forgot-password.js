// js/forgot-password.js
// Envoie la demande de reset par email
// Attendu backend: POST /auth/forgot-password { email }
// Réponse idéale: { ok:true, message?:string }

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgotPasswordForm");
  if (!form) return;

  const emailInput = document.getElementById("forgotEmail");
  const msgEl = document.getElementById("forgotMessage");
  const btn = form.querySelector('button[type="submit"]');

  const setMsg = (text, type = "info") => {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.color =
      type === "success" ? "#22c55e" :
      type === "error" ? "var(--danger)" :
      "var(--text-muted)";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const email = (emailInput?.value || "").trim().toLowerCase();
    if (!email) {
      setMsg("Veuillez saisir votre email.", "error");
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Envoi…";
      }

      // Important: on ne révèle jamais si le compte existe ou non.
      const data = await apiRequest("/auth/forgot-password", "POST", { email });

      setMsg(
        data?.message ||
          "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
        "success"
      );

      // UX: on peut vider le champ
      if (emailInput) emailInput.value = "";
    } catch (err) {
      console.error("[forgot-password.js] error:", err);

      // 404 = route pas encore en place
      if (err.status === 404) {
        setMsg(
          "La fonctionnalité de réinitialisation n’est pas encore active côté serveur (404).",
          "error"
        );
        return;
      }

      setMsg(err.message || "Erreur lors de la demande.", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Envoyer le lien";
      }
    }
  });
});
