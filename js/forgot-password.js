// js/forgot-password.js
// Envoie l'email de réinitialisation

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgotPasswordForm");
  if (!form) return;

  const emailInput = document.getElementById("forgotEmail");
  const msgEl = document.getElementById("forgotMessage");
  const btn = form.querySelector('button[type="submit"]');

  const setMsg = (text, type = "info") => {
    msgEl.textContent = text || "";
    msgEl.style.color =
      type === "success" ? "#22c55e" :
      type === "error" ? "var(--danger)" :
      "var(--text-muted)";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const email = (emailInput?.value || "").trim();
    if (!email) {
      setMsg("Email requis.", "error");
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = "Envoi…";

      const data = await apiRequest("/auth/forgot-password", "POST", { email });

      setMsg(
        data?.message ||
        "Si cet email existe, un lien de réinitialisation a été envoyé.",
        "success"
      );
    } catch (err) {
      console.error("[forgot-password.js] error:", err);
      setMsg(
        err.message || "Impossible d’envoyer le lien pour le moment.",
        "error"
      );
    } finally {
      btn.disabled = false;
      btn.textContent = "Envoyer le lien";
    }
  });
});
