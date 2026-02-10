// js/forgot-password.js
// 1 submit => 1 requête => 1 mail
// Anti double-click / double-submit robuste

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgotPasswordForm");
  if (!form) return;

  const emailInput = document.getElementById("forgotEmail");
  const msgEl = document.getElementById("forgotMessage");
  const btn = form.querySelector('button[type="submit"]');

  let isSending = false;

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
    e.stopPropagation();

    if (isSending) return; // ✅ empêche double submit
    isSending = true;

    setMsg("");

    const email = (emailInput?.value || "").trim();
    if (!email) {
      setMsg("Email requis.", "error");
      isSending = false;
      return;
    }

    const original = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;      // ✅ bloque double clic immédiatement
      btn.textContent = "Envoi…";
    }

    try {
      const data = await apiRequest("/auth/forgot-password", "POST", { email });
      setMsg(
        data?.message ||
          "Si cet email existe, un lien de réinitialisation a été envoyé.",
        "success"
      );
    } catch (err) {
      console.error("[forgot-password.js] error:", err);
      setMsg(err?.message || "Impossible d’envoyer le lien pour le moment.", "error");
    } finally {
      isSending = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = original || "Envoyer le lien";
      }
    }
  });
});
