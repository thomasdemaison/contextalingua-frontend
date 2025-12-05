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

  // On récupère/rafraîchit les infos utilisateur
  let user = getCurrentUser();

  try {
    const me = await apiRequest("/auth/me", "GET");
    if (me && me.user) {
      saveAuth(token, me.user);
      user = me.user;
    }
  } catch (err) {
    console.error("Erreur /auth/me :", err);
    if (err.status === 401) {
      clearAuth();
      window.location.href = "login.html";
      return;
    }
  }

  const role = (user && user.role) || "user";
  console.log("[Dashboard] rôle utilisateur :", role);

  // ----- Affichage / masquage des blocs admin -----

  // Bloc "Administration – Gestion des crédits"
  const adminPanel = document.getElementById("adminPanel");
  if (adminPanel) {
    if (role === "admin" || role === "superadmin") {
      adminPanel.style.display = "";
    } else {
      adminPanel.style.display = "none";
    }
  }

  // Bloc "Administration – Rôles des utilisateurs"
  const rolePanel = document.getElementById("rolePanel");
  if (rolePanel) {
    if (role === "superadmin") {
      rolePanel.style.display = "";
    } else {
      rolePanel.style.display = "none";
    }
  }

  // ----- Chargement des données -----
  await loadCreditBalance();
  await loadCreditTransactions();

  setupAdminCreditForm();
  setupAdminRoleForm();
}

// ---------- Solde de crédits ----------

async function loadCreditBalance() {
  // HTML : <strong id="creditBalance">…</strong>
  const valueEl = document.getElementById("creditBalance");

  if (!valueEl) {
    console.warn(
      "[Dashboard] Élément de solde de crédits introuvable (id=creditBalance)."
    );
    return;
  }

  try {
    const data = await apiRequest("/credits/balance", "GET");
    console.log("[Dashboard] /credits/balance →", data);

    const balance =
      (data && (data.balance ?? data.creditBalance)) ?? 0;

    valueEl.textContent = balance;
  } catch (err) {
    console.error("Erreur /credits/balance :", err);
    valueEl.textContent = "—";
  }
}

// ---------- Dernières opérations ----------

async function loadCreditTransactions() {
  // HTML : <ul id="transactionsList"><li>Chargement en cours…</li></ul>
  const listEl = document.getElementById("transactionsList");
  if (!listEl) {
    console.warn(
      "[Dashboard] Élément transactionsList introuvable."
    );
    return;
  }

  // On vide la liste et on met un état "chargement"
  listEl.innerHTML = "";
  const loadingLi = document.createElement("li");
  loadingLi.textContent = "Chargement en cours…";
  listEl.appendChild(loadingLi);

  try {
    const data = await apiRequest(
      "/credits/transactions?limit=5",
      "GET"
    );
    console.log("[Dashboard] /credits/transactions →", data);

    const transactions = Array.isArray(data) ? data : data?.transactions;

    listEl.innerHTML = "";

    if (!transactions || transactions.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Aucune opération récente.";
      listEl.appendChild(li);
      return;
    }

    transactions.forEach((tx) => {
      const li = document.createElement("li");

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
    listEl.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = "Impossible de charger les opérations.";
    listEl.appendChild(li);
  }
}

// ---------- Formulaire admin : ajustement de crédits ----------

function setupAdminCreditForm() {
  const form = document.getElementById("adminCreditForm");
  if (!form) return;

  const emailInput = document.getElementById("adminEmail");
  const amountInput = document.getElementById("adminAmount");
  const reasonInput = document.getElementById("adminDescription");
  const messageEl = document.getElementById("adminMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (messageEl) {
      messageEl.textContent = "";
      messageEl.style.color = "";
    }

    const email = emailInput ? emailInput.value.trim() : "";
    const amount = amountInput ? Number(amountInput.value) : 0;
    const reason = reasonInput ? reasonInput.value.trim() : "";

    if (!email || !amount) {
      if (messageEl) {
        messageEl.style.color = "var(--danger)";
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

      console.log("[Dashboard] /admin/credits/adjust →", data);

      if (messageEl) {
        messageEl.style.color = "#22c55e";
        messageEl.textContent =
          data.message || "Crédits mis à jour.";
      }

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
  const form = document.getElementById("roleForm");
  if (!form) return;

  const emailInput = document.getElementById("roleEmail");
  const roleSelect = document.getElementById("roleSelect");
  const messageEl = document.getElementById("roleMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (messageEl) {
      messageEl.textContent = "";
      messageEl.style.color = "";
    }

    const email = emailInput ? emailInput.value.trim() : "";
    const role = roleSelect ? roleSelect.value : "";

    if (!email || !role) {
      if (messageEl) {
        messageEl.style.color = "var(--danger)";
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

      console.log("[Dashboard] /admin/users/role →", data);

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
