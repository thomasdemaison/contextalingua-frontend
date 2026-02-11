// js/contact.js
// Envoi du formulaire vers le backend (SMTP côté serveur)
// Route attendue: POST /api/contact
// Body: { name, company, email, subject, message }

document.addEventListener("DOMContentLoaded", () => {
  // IMPORTANT : mets bien id="contactForm" sur <form> dans contact.html
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

  const setBtn = (disabled, label) => {
    if (!btn) return;
    btn.disabled = !!disabled;
    if (label) btn.textContent = label;
  };

  let isSending = false;

  // fetch avec timeout + fallback JSON safe
  async function postJson(url, payload, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      const raw = await res.text();
      let data = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = { message: raw };
        }
      }

      if (!res.ok) {
        throw new Error(data?.message || "Erreur lors de l’envoi.");
      }

      return data;
    } catch (e) {
      if (e?.name === "AbortError") {
        throw new Error("Temps d’attente dépassé. Réessayez dans quelques secondes.");
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

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

    isSending = true;
    setBtn(true, "Envoi…");
    setMsg("Envoi en cours…");

    try {
      // Priorité à apiRequest (api.js)
      const data = await (window.apiRequest
        ? window.apiRequest("/contact", "POST", payload)
        : postJson((window.API_BASE_URL || "/api") + "/contact", payload)
      );

      setMsg(data?.message || "Message envoyé ✅ Je reviens vers vous rapidement.", "success");

      form.reset();

      // UX : remettre le focus sur le premier champ
      const first = form.querySelector('input[name="name"]');
      if (first) first.focus();

      // UX : bouton "Envoyé ✓" temporaire
      if (btn) {
        btn.textContent = "Envoyé ✓";
        setTimeout(() => {
          if (!isSending) btn.textContent = "Envoyer le message";
        }, 1200);
      }
    } catch (err) {
      console.error("[contact.js] error:", err);
      setMsg(err.message || "Impossible d’envoyer le message. Réessayez plus tard.", "error");
    } finally {
      isSending = false;
      setBtn(false, "Envoyer le message");
    }
  });
});
