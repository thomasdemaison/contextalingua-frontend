// js/tarifs.js
(function () {
  function showError(msg) {
    const el = document.getElementById("buyPackError");
    if (el) el.textContent = msg || "";
    else if (msg) alert(msg);
  }

  async function buyPack(packId) {
    showError("");

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "login.html";
      return;
    }

    try {
      // apiRequest vient de js/api.js
      const data = await apiRequest("/payments/mollie/create-checkout", "POST", { packId });

      if (!data || !data.checkoutUrl) {
        showError("Impossible de démarrer le paiement (checkoutUrl manquante).");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error("[tarifs] create-checkout error:", err);
      if (err.status === 401) showError("Votre session a expiré. Reconnectez-vous.");
      else showError(err.message || "Erreur lors du démarrage du paiement.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".js-buy-pack").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const packId = btn.getAttribute("data-pack");
        if (!packId) return;
        buyPack(packId);
      });
    });
  });
})();
