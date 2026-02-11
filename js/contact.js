// js/contact.js
// Envoi du formulaire vers le backend (Brevo SMTP côté serveur)
// Route attendue: POST /api/contact
// Body: { name, company, email, subject, message }

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const msgEl = document.getElementById("contactMsg");
  const btn = document.getElementById("contactSubmit");

  const setMsg = (text, type = "info") => {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.color =
      type === "success" ? "#22c55e" :
      type === "error" ? "var(--danger)" :
      "var(--text-muted)";
  };

  let isSending = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSending) return;
    setMsg("");

    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      company: String(fd.get("company") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      subject: String(fd.get("subject") || "").trim(),
      message: String(fd.get("message") || "").trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setMsg("Merci de renseigner votre nom, email et message.", "error");
      return;
    }

    // anti double submit
    isSending = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Envoi…";
    }
    setMsg("Envoi en cours…");

    try {
      // utilise apiRequest si disponible (ton api.js)
      const data = await (window.apiRequest
        ? window.apiRequest("/contact", "POST", payload)
        : fetch((window.API_BASE_URL || "/api") + "/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).then(async (r) => {
            const t = await r.text();
            const j = t ? JSON.parse(t) : {};
            if (!r.ok) throw new Error(j.message || "Erreur lors de l’envoi.");
            return j;
          })
      );

      setMsg(data?.message || "Message envoyé ✅ Je reviens vers vous rapidement.", "success");
      form.reset();
    } catch (err) {
      console.error("[contact.js] error:", err);
      setMsg(err.message || "Impossible d’envoyer le message. Réessayez plus tard.", "error");
    } finally {
      isSending = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Envoyer le message";
      }
    }
  });
});
