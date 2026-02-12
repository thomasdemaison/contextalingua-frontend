document.addEventListener("DOMContentLoaded", () => {
  const KEY = "cl_cookie_consent_v1";
  const REASK_AFTER_DAYS = 180; // mets 0 si tu ne veux jamais redemander

  function getConsent() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setConsent(value) {
    localStorage.setItem(KEY, JSON.stringify({
      value,                // "accepted" | "declined"
      ts: Date.now()        // timestamp
    }));
  }

  const consent = getConsent();
  if (consent?.value) {
    if (REASK_AFTER_DAYS > 0 && consent.ts) {
      const ageDays = (Date.now() - consent.ts) / (1000 * 60 * 60 * 24);
      if (ageDays <= REASK_AFTER_DAYS) return; // choix encore valable
    } else {
      return; // pas d'expiration : ne jamais réafficher
    }
  }

  const banner = document.createElement("div");
  banner.innerHTML = `
    <div style="
      position:fixed; bottom:0; left:0; right:0;
      background:#0f172a; border-top:1px solid #334155;
      padding:16px; z-index:9999;
      display:flex; flex-wrap:wrap; gap:12px;
      align-items:center; justify-content:space-between;
      font-size:.9rem;
    ">
      <div style="max-width:680px; line-height:1.4;">
        Nous utilisons des cookies pour assurer le fonctionnement du site et, si vous l’acceptez, mesurer l’audience.
        <a href="confidentialite.html" style="text-decoration:underline;color:#e2e8f0;">En savoir plus</a>
      </div>
      <div style="display:flex; gap:8px;">
        <button id="cookieDecline" class="btn btn-ghost">Refuser</button>
        <button id="cookieAccept" class="btn btn-primary">Accepter</button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("cookieAccept").onclick = () => {
    setConsent("accepted");
    banner.remove();
  };

  document.getElementById("cookieDecline").onclick = () => {
    setConsent("declined");
    banner.remove();
  };
});
