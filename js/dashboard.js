// js/dashboard.js
import { apiRequest, clearAuth, getCurrentUser, saveAuth } from "./api.js";

async function loadDashboard() {
    const storedUser = getCurrentUser();
    if (!storedUser) {
        // Pas de user en localStorage => on renvoie vers login
        window.location.href = "login.html";
        return;
    }

    try {
        // 1) On récupère l'utilisateur à jour depuis le backend
        const me = await apiRequest("/auth/me", "GET", null, true);
        const user = me.user;

        // On met à jour le localStorage avec les infos fraîches (role, creditBalance, etc.)
        const token = localStorage.getItem("token");
        if (token && user) {
            saveAuth(token, user);
        }

        // 2) Affichage du solde de crédits
        const balanceEl = document.getElementById("creditBalance");
        if (balanceEl && typeof user.creditBalance === "number") {
            balanceEl.textContent = user.creditBalance;
        }

        // 3) Chargement des dernières opérations de crédits (optionnel)
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

        // 4) Activation du panneau administrateur si role = admin
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

    if (!user || user.role !== "admin") {
        adminPanel.style.display = "none";
        return;
    }

    // L'utilisateur est admin : on affiche le bloc
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
                msg.style.color = "#4ade80";
            }

            // Si tu t'es crédité toi-même, on met à jour le solde affiché
            if (result.targetUser.email === user.email) {
                const balanceEl = document.getElementById("creditBalance");
                if (balanceEl) {
                    balanceEl.textContent = result.newBalance;
                }
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
