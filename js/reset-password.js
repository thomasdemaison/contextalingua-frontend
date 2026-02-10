// js/reset-password.js
// Réinitialise le mot de passe via token + email (URL)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetPasswordForm");
  if (!form) return;

  const passwordInput = document.getElementById("newPassword");
  const msgEl = document.getElementById("resetMessage");
  const btn = form.querySelector('button[type="submit"]');

  const url = new URL(window.location.href);
  const token = (url.searchParams.get("token") || "").trim();
  const email = (url.searchParams.get("email") || "").trim();

  const setMsg = (text, type = "info") => {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.color =
      type === "success" ? "#22c55e" :
      type === "error" ? "var(--danger)" :
      "var(--text-muted)";
  };

  // Sécurité minimale
  if (!token || !email) {
    setMsg("Lien invalide ou incomplet.", "error");
    if (btn) btn.disabled = true;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const password = (passwordInput?.value || "").trim();
    if (!password || password.length < 8) {
      setMsg("Le mot de passe doit contenir au moins 8 caractères.", "error");
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Mise à jour…";
      }

      const data = await apiRequest("/auth/reset-password", "POST", {
        email,
        token,
        password,
      });

      setMsg(
        data?.message ||
        "Mot de passe mis à jour ✅ Vous pouvez vous connecter.",
        "success"
      );

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } catch (err) {
      console.error("[reset-password.js] error:", err);
      setMsg(
        err.message || "Lien invalide ou expiré.",
        "error"
      );
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Mettre à jour";
      }
    }
  });
});
