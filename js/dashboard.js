// -------------------------
// Dashboard.js (Frontend)
// -------------------------

const API_URL = "http://localhost:4000/api";

// Vérifier connexion et récupérer profil
document.addEventListener("DOMContentLoaded", async () => {
    console.log("📌 Dashboard chargé");

    const token = localStorage.getItem("token");
    if (!token) {
        console.warn("⚠ Aucun token → redirection vers login");
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await response.json();
        console.log("👤 Profil utilisateur :", data);

        if (!data.user) {
            console.warn("⚠ Token expiré ou invalide");
            window.location.href = "login.html";
            return;
        }

        // 👉 Affichage du solde de crédits
        document.getElementById("creditBalance").textContent = data.user.creditBalance;

        // 👉 Si ADMIN → afficher panneau admin
        if (data.user.role === "admin") {
            document.getElementById("adminSection").style.display = "block";
        }

        loadCreditHistory();

    } catch (err) {
        console.error("❌ Erreur lors de /auth/me :", err);
    }
});


// -------------------------
// Charger l'historique des crédits
// -------------------------

async function loadCreditHistory() {
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_URL}/credits/history`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const operations = await res.json();
        const container = document.getElementById("creditHistory");
        container.innerHTML = "";

        if (!operations || operations.length === 0) {
            container.innerHTML = "<p>Aucune opération enregistrée.</p>";
            return;
        }

        operations.forEach(op => {
            const div = document.createElement("div");
            div.classList.add("card");
            div.style.marginBottom = "10px";
            div.innerHTML = `
                <p><strong>${op.change > 0 ? "Ajout" : "Déduction"} :</strong> ${op.change} crédits</p>
                <p><small>${new Date(op.created_at).toLocaleString()}</small></p>
            `;
            container.appendChild(div);
        });

    } catch (err) {
        console.error("❌ Erreur chargement historique :", err);
    }
}

// -------------------------
// ADMIN : Ajouter des crédits
// -------------------------

async function addCreditsToUser() {
    const email = document.getElementById("creditUserEmail").value;
    const amount = parseInt(document.getElementById("creditAmount").value);

    if (!email || !amount) return alert("Email et montant requis.");

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_URL}/admin/credits/add`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ email, amount })
        });

        const result = await res.json();
        alert(result.message || "Opération effectuée");

        window.location.reload();

    } catch (err) {
        console.error("❌ Erreur ajout crédits :", err);
    }
}
