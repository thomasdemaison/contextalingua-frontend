document.addEventListener("DOMContentLoaded", () => {
  const KEY = "cl_cookie_consent_v1";

  const saved = localStorage.getItem(KEY);
  if (saved) return;

  const banner = document.createElement("div");
  banner.innerHTML = `
    <div style="
      position:fixed;
      bottom:0;
      left:0;
      right:0;
      background:#0f172a;
      border-top:1px solid #334155;
      padding:16px;
      z-index:9999;
      display:flex;
      flex-wrap:wrap;
      gap:12px;
      align-items:center;
      justify-content:space-between;
      font-size:.9rem;
    ">
      <div style="max-width:600px;">
        Nous utilisons des cookies pour assurer le fonctionnement du site,
        améliorer votre expérience et mesurer l’audience.
        <a href="confidentialite.html" style="text-decoration:underline;">En savoir plus</a>
      </div>
      <div style="display:flex; gap:8px;">
        <button id="cookieDecline" class="btn btn-ghost">Refuser</button>
        <button id="cookieAccept" class="btn btn-primary">Accepter</button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("cookieAccept").onclick = () => {
    localStorage.setItem(KEY, "accepted");
    banner.remove();
  };

  document.getElementById("cookieDecline").onclick = () => {
    localStorage.setItem(KEY, "declined");
    banner.remove();
  };
});
