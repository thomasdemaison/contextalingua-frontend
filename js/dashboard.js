// js/dashboard.js
// Logique de la page tableau de bord ContextaLingua

document.addEventListener("DOMContentLoaded", () => {
  initDashboard().catch((err) => {
    console.error("Erreur initDashboard :", err);
  });
});

async function initDashboard() {
  const token = localStorage.getItem("token");
  if (!token) {
    // Pas connecté → retour à la page de login
    window.location.href = "login.html";
    return;
  }

  // On tente de rafraîchir les infos user via /auth/me
  try {
    const me = await apiRequest("/auth/me", "GET");
    if (me && me.user) {
      saveAuth(token, me.user);
    }
  } catch (err) {
    console.error("Erreur /auth/me :", err);
    if (err.status === 401) {
      clearAuth();
      window.location.href = "login.html";
      return;
    }
  }

  await loadCreditBalance();
  await loadCreditTransactions();

  setupAdminCreditForm();
  setupAdminRoleForm();
}

// ---------- Solde de crédits ----------

async function loadCreditBalance() {
  const valueEl = document.getElementById("creditBalanceValue");
  if (!valueEl) return;

  try {
    const data = await apiRequest("/credits/balance", "GET");
    const balance =
      (data && (data.balance ?? data.creditBalance)) ?? 0;

    valueEl.textContent = balance;
  } catch (err) {
    console.error("Erreur /credits/balance :", err);
    valueEl.textContent = "--";
  }
}

// ---------- Dernières opérations ----------

async function loadCreditTransactions() {
  const listEl = document.getElementById("creditTransactionsList");
  const statusEl = document.getElementById("creditTransactionsStatus");

  if (!listEl) return;

  if (statusEl) {
    statusEl.textContent = "Chargement en cours...";
  }

  try {
    const data = await apiRequest(
      "/credits/transactions?limit=5",
      "GET"
    );

    const transactions = Array.isArray(data) ? data : data?.transactions;

    listEl.innerHTML = "";

    if (!transactions || transactions.length === 0) {
      if (statusEl) statusEl.textContent = "Aucune opération récente.";
      return;
    }

    if (statusEl) statusEl.textContent = "";

    transactions.forEach((tx) => {
      const li = document.createElement("div");
      li.style.fontSize = "0.9rem";

      const createdAt = tx.createdAt || tx.created_at;
      const date = createdAt ? new Date(createdAt) : null;
      const dateStr = date
        ? date.toLocaleString("fr-FR")
        : "";

      const amount = tx.amount ?? tx.delta ?? 0;
      const reason = tx.reason || tx.description || "";
      const source = tx.source || tx.type || "";

      li.textContent = `${dateStr} — ${source} (${amount > 0 ? "+" : ""}${amount}) : ${reason}`;
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error("Erreur /credits/transactions :", err);
    if (statusEl) {
      statusEl.textContent =
        "Impossible de charger les opérations.";
    }
  }
}

// ---------- Formulaire admin : ajustement de crédits ----------

function setupAdminCreditForm() {
  const form = document.getElementById("adminCreditForm");
  if (!form) return;

  const emailInput = document.getElementById("adminCreditEmail");
  const amountInput = document.getElementById("adminCreditAmount");
  const reasonInput = document.getElementById("adminCreditReason");
  const messageEl = document.getElementById("adminCreditMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (messageEl) messageEl.textContent = "";

    const email = emailInput ? emailInput.value.trim() : "";
    const amount = amountInput ? Number(amountInput.value) : 0;
    const reason = reasonInput ? reasonInput.value.trim() : "";

    if (!email || !amount) {
      if (messageEl) {
        messageEl.textContent =
          "Email et montant sont obligatoires.";
      }
      return;
    }

    try {
      const data = await apiRequest(
        "/admin/credits/adjust",
        "POST",
        { email, amount, reason }
      );

      if (messageEl) {
        messageEl.style.color = "#22c55e";
        messageEl.textContent =
          data.message || "Crédits mis à jour.";
      }

      // On rafraîchit solde + opérations si l'admin s'ajuste lui-même
      await loadCreditBalance();
      await loadCreditTransactions();
    } catch (err) {
      console.error("Erreur /admin/credits/adjust :", err);
      if (messageEl) {
        messageEl.style.color = "var(--danger)";
        messageEl.textContent =
          err.message || "Erreur lors de l'ajustement.";
      }
    }
  });
}

// ---------- Formulaire admin : gestion des rôles ----------

function setupAdminRoleForm() {
  const form = document.getElementById("adminRoleForm");
  if (!form) return;

  const emailInput = document.getElementById("adminRoleEmail");
  const roleSelect = document.getElementById("adminRoleSelect");
  const messageEl = document.getElementById("adminRoleMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (messageEl) messageEl.textContent = "";

    const email = emailInput ? emailInput.value.trim() : "";
    const role = roleSelect ? roleSelect.value : "";

    if (!email || !role) {
      if (messageEl) {
        messageEl.textContent =
          "Email et rôle sont obligatoires.";
      }
      return;
    }

    try {
      const data = await apiRequest(
        "/admin/users/role",
        "POST",
        { email, role }
      );

      if (messageEl) {
        messageEl.style.color = "#22c55e";
        messageEl.textContent =
          data.message || "Rôle mis à jour.";
      }
    } catch (err) {
      console.error("Erreur /admin/users/role :", err);
      if (messageEl) {
        messageEl.style.color = "var(--danger)";
        messageEl.textContent =
          err.message || "Erreur lors de la mise à jour du rôle.";
      }
    }
  });
}
