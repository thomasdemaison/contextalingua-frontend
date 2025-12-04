// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});

async function loadDashboard() {
    try {
        // 1. Récupérer l'utilisateur authentifié
        const me = await apiRequest("/auth/me", "GET", null, true);
        const user = me.user;

        // mettre à jour le localStorage avec les infos à jour
        const token = localStorage.getItem("token");
        if (token && user) {
            saveAuth(token, user);
        }

        // 2. Afficher le solde de crédits
        const balanceEl = document.getElementById("creditBalance");
        if (balanceEl && typeof user.creditBalance === "number") {
            balanceEl.textContent = user.creditBalance;
        } else if (balanceEl) {
            balanceEl.textContent = "—";
        }

        // 3. Charger les dernières opérations de crédits (si endpoint dispo)
        await loadCreditTransactions();

        // 4. Activer le panneau admin si besoin
        setupAdminPanel(user);

    } catch (err) {
        console.error("Erreur dashboard :", err);
        if (err.status === 401) {
            clearAuth();
            window.location.href = "login.html";
        }
    }
}

async function loadCreditTransactions() {
    const listEl = document.getElementById("transactionsList");
    if (!listEl) return;

    try {
        const data = await apiRequest("/credits/transactions", "GET", null, true);
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
        console.error("Erreur chargement transactions :", err);
        listEl.innerHTML = "";
        const li = document.createElement("li");
        li.textContent = "Impossible de charger les opérations.";
        listEl.appendChild(li);
    }
}

function setupAdminPanel(user) {
    const adminPanel = document.getElementById("adminPanel");
    if (!adminPanel) return;

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

        try:
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

            // si on se crédite soi-même, on met à jour l'affichage
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.email === email) {
                const balanceEl = document.getElementById("creditBalance");
                if (balanceEl) {
                    balanceEl.textContent = result.newBalance;
                }
            }
        } catch (err) {
            console.error("Erreur admin/credits/grant :", err);
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
