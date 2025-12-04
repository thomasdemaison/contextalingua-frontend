// js/dashboard.js
import { apiRequest, clearAuth, getCurrentUser } from "./api.js";

async function loadDashboard() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        const balanceData = await apiRequest("/credits/balance", "GET", null, true);
        const el = document.getElementById("creditBalance");
        if (el) el.textContent = balanceData.creditBalance;

        const transactionsData = await apiRequest("/credits/transactions?limit=5", "GET", null, true);
        const listEl = document.getElementById("transactionsList");
        if (listEl) {
            listEl.innerHTML = "";
            if (!transactionsData.transactions.length) {
                const li = document.createElement("li");
                li.textContent = "Aucune opération récente.";
                listEl.appendChild(li);
            } else {
                transactionsData.transactions.forEach(tx => {
                    const li = document.createElement("li");
                    li.textContent = `${new Date(tx.createdAt).toLocaleString()} – ${tx.type} (${tx.amount}) : ${tx.description || ""}`;
                    listEl.appendChild(li);
                });
            }
        }
    } catch (err) {
        console.error(err);
        if (err.status === 401) {
            clearAuth();
            window.location.href = "login.html";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});
