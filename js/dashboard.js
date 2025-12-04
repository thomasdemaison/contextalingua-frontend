// js/dashboard.js

// On attend que le DOM soit prêt
document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});

async function initDashboard() {
    try {
        // 1) Vérifier qu'on a un token
        const token = localStorage.getItem("token");
        if (!token) {
            // pas connecté → retour login
            window.location.href = "login.html";
            return;
        }

        // 2) Récupérer l'utilisateur courant via /auth/me
        const me = await apiRequest("/auth/me", "GET", null, true);
        const user = me.user;

        // Sauvegarde à jour dans le localStorage
        saveAuth(token, user);

        // Mise à jour de l’email dans le header
        const headerEl = document.getElementById("headerUserEmail");
        if (headerEl && user.email) {
            headerEl.textContent = user.email;
        }

        // 3) Afficher le solde de crédits via /credits/balance
        await loadCreditBalance();

        // 4) Afficher les dernières opérations
        await loadCreditTransactions();

        // 5) Activer le panneau admin si rôle = admin
        setupAdminPanel(user);

    } catch (err) {
        console.error("Erreur initDashboard :", err);
        if (err.status === 401) {
            clearAuth();
            window.location.href = "login.html";
        }
    }
}

// ------------------------------------
// Solde de crédits
// ------------------------------------
async function loadCreditBalance() {
    const el = document.getElementById("creditBalance");
    if (!el) return;

    try {
        const data = await apiRequest("/credits/balance", "GET", null, true);
        if (typeof data.creditBalance === "number") {
            el.textContent = data.creditBalance;
        } else {
            el.textContent = "—";
        }
    } catch (err) {
        console.error("Erreur /credits/balance :", err);
        el.textContent = "—";
    }
}

// ------------------------------------
// Transactions / opérations récentes
// ------------------------------------
async function loadCreditTransactions() {
    const listEl = document.getElementById("transactionsList");
    if (!listEl) return;

    try {
        const data = await apiRequest("/credits/transactions?limit=5", "GET", null, true);
        const transactions = data.transactions || [];

        listEl.innerHTML = "";

        if (!transactions.length) {
            const li = document.createElement("li");
            li.textContent = "Aucune opération récente.";
            listEl.appendChild(li);
            return;
        }

        transactions.forEach((tx) => {
            const li = document.createElement("li");
            const date = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "";
            li.textContent = `${date} – ${tx.type} (${tx.amount}) : ${tx.description || ""}`;
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

// ------------------------------------
// Panneau Admin : ajustement des crédits
// ------------------------------------
function setupAdminPanel(user) {
    const adminPanel = document.getElementById("adminPanel");
    if (!adminPanel) return;

    // Si pas admin → panneau masqué
    if (!user || user.role !== "admin") {
        adminPanel.style.display = "none";
        return;
    }

    adminPanel.style.display = "block";

    const form = document.getElementById("adminCreditForm");
    const msg = document.getElementById("adminMessage");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (msg) {
            msg.textContent = "";
            msg.style.color = "";
        }

        const email = document.getElementById("adminEmail").value.trim();
        const amountStr = document.getElementById("adminAmount").value;
        const description = document.getElementById("adminDescription").value.trim();

        const amount = Number(amountStr);

        if (!email || Number.isNaN(amount) || amount === 0) {
            if (msg) {
                msg.textContent = "Email et montant (non nul) sont obligatoires.";
                msg.style.color = "var(--danger)";
            }
            return;
        }

        try {
            const result = await apiRequest(
                "/admin/credits/grant",
                "POST",
                { email, amount, description: description || undefined },
                true
            );

            if (msg) {
                msg.textContent = `Crédits mis à jour pour ${result.targetUser.email}. Nouveau solde : ${result.newBalance}.`;
                msg.style.color = "#4ade80";
            }

            // Si tu t'es crédité toi-même, on rafraîchit le solde
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.email === email) {
                const balanceEl = document.getElementById("creditBalance");
                if (balanceEl) {
                    balanceEl.textContent = result.newBalance;
                }
            }
        } catch (err) {
            console.error("Erreur /admin/credits/grant :", err);
            if (err.status === 401) {
                clearAuth();
                window.location.href = "login.html";
                return;
            }
            if (msg) {
                msg.textContent = err.message || "Erreur lors de l’ajustement des crédits.";
                msg.style.color = "var(--danger)";
            }
        }
    });
}
