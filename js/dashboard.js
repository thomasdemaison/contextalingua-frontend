// js/dashboard.js
import { apiRequest, clearAuth, getCurrentUser } from "./api.js";

async function loadDashboard() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        // Solde
        const balanceData = await apiRequest("/credits/balance", "GET", null, true);
        const el = document.getElementById("creditBalance");
        if (el) el.textContent = balanceData.creditBalance;

        // Transactions récentes
        let transactionsData;
        try {
            transactionsData = await apiRequest("/credits/transactions", "GET", null, true);
        } catch {
            transactionsData = { transactions: [] };
        }

        const listEl = document.getElementById("transactionsList");
        if (listEl) {
            listEl.innerHTML = "";
            const txs = transactionsData.transactions || [];
            if (!txs.length) {
                const li = document.createElement("li");
                li.textContent = "Aucune opération récente.";
                listEl.appendChild(li);
            } else {
                txs.forEach(tx => {
                    const li = document.createElement("li");
                    const date = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "";
                    li.textContent = `${date} – ${tx.type} (${tx.amount}) : ${tx.description || ""}`;
                    listEl.appendChild(li);
                });
            }
        }

        // Activer le panneau admin si besoin
        setupAdminPanel(user);

    } catch (err) {
        console.error(err);
        if (err.status === 401) {
            clearAuth();
            window.location.href = "login.html";
        }
    }
}

function setupAdminPanel(user) {
    const adminPanel = document.getElementById("adminPanel");
    if (!adminPanel) return;

    // Afficher le panneau seulement si l'utilisateur est admin
    if (user.role !== "admin") {
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
                {
                    email,
                    amount,
                    description: description || undefined
                },
                true
            );

            if (msg) {
                msg.textContent = `Crédits mis à jour pour ${result.targetUser.email}. Nouveau solde : ${result.newBalance}.`;
                msg.style.color = "#4ade80"; // vert doux
            }

            // Si tu as crédité ton propre compte, on recharge le solde
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.email === email) {
                const balanceData = await apiRequest("/credits/balance", "GET", null, true);
                const el = document.getElementById("creditBalance");
                if (el) el.textContent = balanceData.creditBalance;
            }

        } catch (err) {
            console.error(err);
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

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});
