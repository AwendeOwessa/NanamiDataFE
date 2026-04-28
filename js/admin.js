let tousUtilisateurs = [];
let tousFormulaires = [];

document.addEventListener("DOMContentLoaded", () => {

    console.log("=== DEBUG ADMIN ===");
    console.log("token     :", localStorage.getItem("token"));
    console.log("role      :", localStorage.getItem("role"));
    console.log("user      :", localStorage.getItem("user"));
    console.log("isAdmin() :", isAdmin());
    console.log("===================");

    checkAdmin();

    const userEl = document.getElementById("headerUser");
    if (userEl) userEl.style.display = "flex";

    afficherUtilisateur();
    loadDashboard();
});


async function loadDashboard() {
    showSpinner("Chargement du tableau de bord...");
    try {
        const data = await request(`${API}/admin/dashboard`);

        document.getElementById("totalUtilisateurs").textContent =
            data.totalUtilisateurs;
        document.getElementById("totalFormulaires").textContent =
            data.totalFormulaires;
        document.getElementById("totalReponses").textContent =
            data.totalReponses;

        tousUtilisateurs = data.utilisateurs || [];
        tousFormulaires = data.formulaires || [];

        afficherUtilisateurs(tousUtilisateurs);
        afficherFormulaires(tousFormulaires);

    } catch (e) {
        console.error("Erreur dashboard :", e);
        showToast("Impossible de charger le tableau de bord.", "error");
    } finally {
        hideSpinner();
    }
}


function afficherOnglet(nom, btn) {
    document.querySelectorAll(".admin-section").forEach(s => {
        s.style.display = "none";
    });
    document.querySelectorAll(".onglet").forEach(o => {
        o.classList.remove("actif");
    });

    document.getElementById(`section-${nom}`).style.display = "block";
    btn.classList.add("actif");
}


function afficherUtilisateurs(liste) {
    const tbody = document.getElementById("tableUtilisateurs");
    tbody.innerHTML = "";

    if (liste.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"
            style="text-align:center;color:#475569;padding:24px">
            Aucun utilisateur trouvé.</td></tr>`;
        return;
    }

    liste.forEach(u => {
                const tr = document.createElement("tr");
                const estAdmin = u.role === "ADMIN";

                tr.innerHTML = `
            <td style="color:#475569">#${u.id}</td>
            <td style="font-weight:600">${u.nom}</td>
            <td style="color:#64748b">${u.email}</td>
            <td style="color:#64748b">@${u.nomUtilisateur}</td>
            <td>
                <span class="role-badge ${estAdmin ? "admin" : "user"}">
                    ${u.role}
                </span>
            </td>
            <td>
                ${estAdmin
                    ? `<button class="btn-table retrograder"
                          onclick="changerRole(${u.id}, 'USER')">
                          Rétrograder
                       </button>`
                    : `<button class="btn-table promouvoir"
                          onclick="changerRole(${u.id}, 'ADMIN')">
                          Promouvoir
                       </button>`
                }
                <button class="btn-table supprimer"
                        onclick="supprimerUtilisateur(${u.id}, '${u.nom}')">
                    Supprimer
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrerUtilisateurs(terme) {
    const t = terme.toLowerCase();
    const filtres = tousUtilisateurs.filter(u =>
        u.nom.toLowerCase().includes(t)         ||
        u.email.toLowerCase().includes(t)       ||
        u.nomUtilisateur.toLowerCase().includes(t)
    );
    afficherUtilisateurs(filtres);
}

async function changerRole(id, role) {
    const estPromotion = role === "ADMIN";

    const confirme = await showConfirm(
        estPromotion
            ? "Promouvoir cet utilisateur en admin ?"
            : "Rétrograder cet utilisateur en utilisateur ?",
        estPromotion
            ? "Cet utilisateur aura accès au tableau de bord administrateur."
            : "Cet utilisateur perdra ses droits d'administration.",
        estPromotion ? "warning" : "danger"
    );

    if (!confirme) return;

    try {
        await request(`${API}/admin/utilisateurs/${id}/role`, {
            method: "PUT",
            body: JSON.stringify({ role })
        });
        showToast(`Rôle mis à jour : ${role}`, "success");
        await loadDashboard();
    } catch (e) {
        console.error(e);
        showToast("Erreur lors du changement de rôle.", "error");
    }
}

async function supprimerUtilisateur(id, nom) {
    const confirme = await showConfirm(
        `Supprimer "${nom}" ?`,
        "Ce compte sera définitivement supprimé. Cette action est irréversible.",
        "danger"
    );

    if (!confirme) return;

    try {
        await request(`${API}/admin/utilisateurs/${id}`, { method: "DELETE" });
        showToast(`Utilisateur "${nom}" supprimé.`, "success");
        await loadDashboard();
    } catch (e) {
        console.error(e);
        showToast("Erreur lors de la suppression.", "error");
    }
}


function afficherFormulaires(liste) {
    const tbody = document.getElementById("tableFormulaires");
    tbody.innerHTML = "";

    if (liste.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"
            style="text-align:center;color:#475569;padding:24px">
            Aucun formulaire trouvé.</td></tr>`;
        return;
    }

    liste.forEach(f => {
        const date = f.dateCreation
            ? new Date(f.dateCreation).toLocaleDateString("fr-FR", {
                day: "2-digit", month: "short", year: "numeric"
              })
            : "—";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="color:#475569">#${f.id}</td>
            <td style="font-weight:600">${f.titre}</td>
            <td style="color:#64748b;max-width:200px;
                       overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${f.description || "—"}
            </td>
            <td style="color:#64748b;white-space:nowrap">${date}</td>
            <td>
                <button class="btn-table analyser"
                        onclick="window.location.href='/donnees.html?id=${f.id}'">
                    Analyser
                </button>
                <button class="btn-table supprimer"
                        onclick="supprimerFormulaire(${f.id}, '${f.titre}')">
                    Supprimer
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrerFormulaires(terme) {
    const t = terme.toLowerCase();
    const filtres = tousFormulaires.filter(f =>
        f.titre.toLowerCase().includes(t) ||
        (f.description && f.description.toLowerCase().includes(t))
    );
    afficherFormulaires(filtres);
}

async function supprimerFormulaire(id, titre) {
    const confirme = await showConfirm(
        `Supprimer "${titre}" ?`,
        "Toutes les questions et réponses associées seront perdues définitivement.",
        "danger"
    );

    if (!confirme) return;

    try {
        await request(`${API}/admin/formulaires/${id}`, { method: "DELETE" });
        showToast(`Formulaire supprimé.`, "success");
        await loadDashboard();
    } catch (e) {
        console.error(e);
        showToast("Erreur lors de la suppression.", "error");
    }
}