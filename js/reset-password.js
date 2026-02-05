// js/reset-password.js
// Réinitialise le mot de passe via token URL
// Attendu backend: POST /auth/reset-password { token, newPassword }
// Réponse idéale: { ok:true, message?:string }

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetPasswordForm");
  if (!form) return;

  const passwordInput = document.getElementById("newPassword");
  const msgEl = document.getElementById("resetMessage");
  const btn = form.querySelector('button[type="submit"]');

  const url = new URL(window.location.href);
  const token = (url.searchParams.get("token") || "").trim();

  const setMsg = (text, type = "info") => {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.color =
      type === "success" ? "#22c55e" :
      type === "error" ? "var(--danger)" :
      "var(--text-muted)";
  };

  // Si pas de token, on bloque
  if (!token) {
    setMsg("Lien invalide : token manquant.", "error");
    if (btn) btn.disabled = true;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const newPassword = (passwordInput?.value || "").trim();
    if (!newPassword || newPassword.length < 8) {
      setMsg("Le mot de passe doit contenir au moins 8 caractères.", "error");
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Mise à jour…";
      }

      const data = await apiRequest("/auth/reset-password", "POST", {
        token,
        newPassword,
      });

      setMsg(data?.message || "Mot de passe mis à jour ✅ Vous pouvez vous connecter.", "success");

      // UX: redirige vers login après 1.2s
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } catch (err) {
      console.error("[reset-password.js] error:", err);

      if (err.status === 404) {
        setMsg("La route /auth/reset-password n’est pas encore active côté serveur (404).", "error");
        return;
      }

      // backend idéal: 400 "Lien invalide ou expiré"
      setMsg(err.message || "Erreur lors de la réinitialisation.", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Mettre à jour";
      }
    }
  });
});
