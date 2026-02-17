// js/dashboard.js
// Logique de la page tableau de bord ContextaLingua
// + Toast paiement (success/cancel/failed)
// + Nettoyage de l'URL (suppression du param pay=...)

document.addEventListener("DOMContentLoaded", () => {
  // Tracking conversion retour paiement
  const params = new URLSearchParams(location.search);
  if (params.get("pay") === "success") {
    if (window.umami) window.umami.track("purchase_success");
  }

  initDashboard().catch((err) => {
    console.error("Erreur initDashboard :", err);
  });
});


// -------------------- Toast helpers --------------------

function showToast(message, type = "info", timeoutMs = 4500) {
  const container = document.getElementById("toastContainer");
  if (!container) {
    // fallback minimal
    console.log("[toast]", type, message);
    return;
  }

  const toast = document.createElement("div");
  toast.textContent = message;

  // Styles inline (ne dépend pas du CSS)
  toast.style.pointerEvents = "auto";
  toast.style.padding = "12px 14px";
  toast.style.borderRadius = "12px";
  toast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
  toast.style.color = "var(--text-strong, #111)";
  toast.style.background = "var(--surface, #fff)";
  toast.style.border = "1px solid rgba(0,0,0,0.08)";
  toast.style.fontSize = "0.95rem";
  toast.style.maxWidth = "340px";
  toast.style.lineHeight = "1.25";
  toast.style.transform = "translateY(-6px)";
  toast.style.opacity = "0";
  toast.style.transition = "all 180ms ease";

  // petit indicateur couleur
  const left = document.createElement("span");
  left.style.display = "inline-block";
  left.style.width = "10px";
  left.style.height = "10px";
  left.style.borderRadius = "999px";
  left.style.marginRight = "10px";
  left.style.verticalAlign = "middle";

  if (type === "success") left.style.background = "#22c55e";
  else if (type === "error") left.style.background = "#ef4444";
  else if (type === "warning") left.style.background = "#f59e0b";
  else left.style.background = "#3b82f6";

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";

  const text = document.createElement("div");
  text.textContent = message;

  wrap.appendChild(left);
  wrap.appendChild(text);
  toast.textContent = "";
  toast.appendChild(wrap);

  container.appendChild(toast);

  // animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  // auto close
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 250);
  }, timeoutMs);
}

function consumePayParamAndToast() {
  const url = new URL(window.location.href);
  const pay = (url.searchParams.get("pay") || "").toLowerCase();

  if (!pay) return null;

  // Nettoyage URL (retire pay=... sans recharger)
  url.searchParams.delete("pay");
  window.history.replaceState({}, "", url.toString());

  if (pay === "success" || pay === "paid" || pay === "ok") {
    showToast("Paiement accepté ✅ Vos crédits ont été mis à jour.", "success");
    return "success";
  }

  if (pay === "cancel" || pay === "canceled" || pay === "refused") {
    showToast("Paiement annulé / refusé ❌ Aucun crédit n’a été débité.", "warning");
    return "cancel";
  }

  if (pay === "failed" || pay === "error") {
    showToast("Paiement en échec ❌ Aucun crédit n’a été débité.", "error");
    return "failed";
  }

  // Valeur inconnue
  showToast("Retour de paiement reçu. Vérifiez votre solde de crédits.", "info");
  return pay;
}

// -------------------- Init Dashboard --------------------

async function initDashboard() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // 1) Toast paiement + on garde l'info pour rafraîchir ensuite
  const payStatus = consumePayParamAndToast();

  // 2) On récupère/rafraîchit les infos utilisateur
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
  const adminPanel = document.getElementById("adminPanel");
  if (adminPanel) {
    adminPanel.style.display = (role === "admin" || role === "superadmin") ? "" : "none";
  }

  const rolePanel = document.getElementById("rolePanel");
  if (rolePanel) {
    rolePanel.style.display = (role === "superadmin") ? "" : "none";
  }

  // ----- Chargement des données -----
  await loadCreditBalance();
  await loadCreditTransactions();

  // 3) Si on revient de paiement success, re-check une deuxième fois 1s après
  // (webhook Mollie peut arriver juste après la redirection)
  if (payStatus === "success") {
    setTimeout(async () => {
      await loadCreditBalance();
      await loadCreditTransactions();
    }, 1000);
  }

  setupAdminCreditForm();
  setupAdminRoleForm();
}

// ---------- Solde de crédits ----------

async function loadCreditBalance() {
  const valueEl = document.getElementById("creditBalance");
  if (!valueEl) {
    console.warn("[Dashboard] Élément de solde de crédits introuvable (id=creditBalance).");
    return;
  }

  try {
    const data = await apiRequest("/credits/balance", "GET");
    console.log("[Dashboard] /credits/balance →", data);

    const balance = ((data && (data.balance ?? data.creditBalance)) ?? 0);
    valueEl.textContent = balance;
  } catch (err) {
    console.error("Erreur /credits/balance :", err);
    valueEl.textContent = "—";
  }
}

async function loadPacks() {
  const grid = document.getElementById("packsGrid");
  const errEl = document.getElementById("packsError");
  if (!grid) return;

  errEl.textContent = "";
  grid.innerHTML = "Chargement…";

  try {
    const r = await apiRequest("/payments/packs", "GET");
    const packs = r?.packs || [];

    if (!packs.length) {
      grid.innerHTML = "";
      errEl.textContent = "Aucun pack disponible.";
      return;
    }

    grid.innerHTML = packs.map(p => `
      <div class="card" style="padding:16px;border:1px solid rgba(148,163,184,.25);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
          <div>
            <div style="font-weight:700;font-size:1.05rem;">${escapeHtml(p.name)}</div>
            <div style="margin-top:6px;opacity:.85;">${escapeHtml(p.credits)} crédits</div>
          </div>
          <div style="font-weight:800;font-size:1.1rem;">${escapeHtml(p.amountEUR)} €</div>
        </div>

        <button class="btn btn-primary" style="width:100%;margin-top:14px;"
          data-pack-id="${escapeHtml(p.id)}">
          Acheter
        </button>
      </div>
    `).join("");

    grid.querySelectorAll("button[data-pack-id]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const packId = btn.getAttribute("data-pack-id");
        btn.disabled = true;
        btn.textContent = "Redirection…";
        try {
          const out = await apiRequest("/payments/mollie/create-checkout", "POST", { packId });
          if (!out?.checkoutUrl) throw new Error("checkoutUrl manquante");
          window.location.href = out.checkoutUrl;
        } catch (e) {
          btn.disabled = false;
          btn.textContent = "Acheter";
          errEl.textContent = "Impossible de démarrer le paiement. Réessayez.";
        }
      });
    });

  } catch (e) {
    grid.innerHTML = "";
    errEl.textContent = "Erreur de chargement des packs.";
  }
}

// Petit helper anti-XSS si tu n’en as pas déjà un
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ---------- Dernières opérations ----------

async function loadCreditTransactions() {
  const listEl = document.getElementById("transactionsList");
  if (!listEl) {
    console.warn("[Dashboard] Élément transactionsList introuvable.");
    return;
  }

  listEl.innerHTML = "";
  const loadingLi = document.createElement("li");
  loadingLi.textContent = "Chargement en cours…";
  listEl.appendChild(loadingLi);

  try {
    const data = await apiRequest("/credits/transactions?limit=5", "GET");
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
      const dateStr = date ? date.toLocaleString("fr-FR") : "";

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
        messageEl.textContent = "Email et montant sont obligatoires.";
      }
      return;
    }

    try {
      const data = await apiRequest("/admin/credits/adjust", "POST", { email, amount, reason });
      console.log("[Dashboard] /admin/credits/adjust →", data);

      if (messageEl) {
        messageEl.style.color = "#22c55e";
        messageEl.textContent = data.message || "Crédits mis à jour.";
      }

      await loadCreditBalance();
      await loadCreditTransactions();
    } catch (err) {
      console.error("Erreur /admin/credits/adjust :", err);
      if (messageEl) {
        messageEl.style.color = "var(--danger)";
        messageEl.textContent = err.message || "Erreur lors de l'ajustement.";
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
        messageEl.textContent = "Email et rôle sont obligatoires.";
      }
      return;
    }

    try {
      const data = await apiRequest("/admin/users/role", "POST", { email, role });
      console.log("[Dashboard] /admin/users/role →", data);

      if (messageEl) {
        messageEl.style.color = "#22c55e";
        messageEl.textContent = data.message || "Rôle mis à jour.";
      }
    } catch (err) {
      console.error("Erreur /admin/users/role :", err);
      if (messageEl) {
        messageEl.style.color = "var(--danger)";
        messageEl.textContent = err.message || "Erreur lors de la mise à jour du rôle.";
      }
    }
  });
}
