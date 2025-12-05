// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});

async function initDashboard() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "login.html";
            return;
        }

        const me = await apiRequest("/auth/me", "GET", null, true);
        const user = me.user;

        saveAuth(token, user);

        const headerEl = document.getElementById("headerUserEmail");
        if (headerEl && user.email) {
            headerEl.textContent = user.email;
        }

        await loadCreditBalance();
        await loadCreditTransactions();

        setupAdminPanel(user);
        setupRolePanel(user);
    } catch (err) {
        console.error("Erreur initDashboard :", err);
        if (err.status === 401) {
            clearAuth();
            window.location.href = "login.html";
        }
    }
}

// ---------- Solde de crédits ----------
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

// ---------- Transactions ----------
async function loadCreditTransactions() {
    const listEl = document.getElementById("transactionsList");
    if (!listEl) return;

    try {
        const data = await apiRequest(
            "/credits/transactions?limit=5",
            "GET",
            null,
            true
        );
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
            const date = tx.createdAt
                ? new Date(tx.createdAt).toLocaleString()
                : "";
            li.textContent = `${date} – ${tx.type} (${tx.amount}) : ${
                tx.description || ""
            }`;
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

// ---------- Panneau crédits admin (admin + superadmin) ----------
function setupAdminPanel(user) {
    const adminPanel = document.getElementById("adminPanel");
    if (!adminPanel) return;

    if (
        !user ||
        (user.role !== "admin" && user.role !== "superadmin")
    ) {
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
        const description = document
            .getElementById("adminDescription")
            .value.trim();

        const amount = Number(amountStr);

        if (!email || Number.isNaN(amount) || amount === 0) {
            if (msg) {
                msg.textContent =
                    "Email et montant (non nul) sont obligatoires.";
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
                msg.textContent = `Crédits mis à jour pour ${
                    result.targetUser.email
                }. Nouveau solde : ${result.newBalance}.`;
                msg.style.color = "#4ade80";
            }

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
                msg.textContent =
                    err.message || "Erreur lors de l’ajustement des crédits.";
                msg.style.color = "var(--danger)";
            }
        }
    });
}

// ---------- Panneau gestion des rôles (superadmin uniquement) ----------
function setupRolePanel(user) {
    const panel = document.getElementById("rolePanel");
    if (!panel) return;

    if (!user || user.role !== "superadmin") {
        panel.style.display = "none";
        return;
    }

    panel.style.display = "block";

    const form = document.getElementById("roleForm");
    const msg = document.getElementById("roleMessage");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (msg) {
            msg.textContent = "";
            msg.style.color = "";
        }

        const email = document.getElementById("roleEmail").value.trim();
        const role = document.getElementById("roleSelect").value;

        if (!email || !role) {
            if (msg) {
                msg.textContent = "Email et rôle sont obligatoires.";
                msg.style.color = "var(--danger)";
            }
            return;
        }

        try {
            const result = await apiRequest(
                "/admin/users/set-role",
                "POST",
                { email, role },
                true
            );

            if (msg) {
                msg.textContent = `Rôle mis à jour pour ${
                    result.user.email
                } : ${result.user.role}.`;
                msg.style.color = "#4ade80";
            }
        } catch (err) {
            console.error("Erreur /admin/users/set-role :", err);
            if (err.status === 401) {
                clearAuth();
                window.location.href = "login.html";
                return;
            }
            if (msg) {
                msg.textContent =
                    err.message ||
                    "Erreur lors de la mise à jour du rôle.";
                msg.style.color = "var(--danger)";
            }
        }
    });
}
