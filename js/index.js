async function loadStats() {
    try {
        const forms = await request(`${ENDPOINTS.forms}/all`);

        document.getElementById("nbFormulaires").textContent = forms.length;

        const userId = getUtilisateurId();
        const mesFormulaires = forms.filter(f =>
            f.utilisateur && f.utilisateur.id === userId
        );
        document.getElementById("nbMesFormulaires").textContent = mesFormulaires.length;

        let totalReponses = 0;
        await Promise.all(forms.map(async f => {
            try {
                const count = await request(`${ENDPOINTS.reponses}/count/${f.id}`);
                totalReponses += count;
            } catch (_) {}
        }));
        document.getElementById("nbReponses").textContent = totalReponses;

    } catch (e) {
        console.error("Erreur stats :", e);
    }
}

async function loadFormulairesRecents() {
    const container = document.getElementById("formulairesRecents");
    try {
        const forms = await request(`${ENDPOINTS.forms}/all`);

        const recents = forms
            .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation))
            .slice(0, 5);

        container.innerHTML = "";

        if (recents.length === 0) {
            container.innerHTML = `<p class="vide">Aucun formulaire créé pour l'instant.</p>`;
            return;
        }

        recents.forEach(form => {
                    const div = document.createElement("div");
                    div.className = "recent_carte";

                    const date = new Date(form.dateCreation).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    });

                    const estMien = form.utilisateur && form.utilisateur.id === getUtilisateurId();

                    div.innerHTML = `
                <div class="recent_info">
                    <h4>${form.titre}</h4>
                    <p>${form.description || "Aucune description"}</p>
                    <span class="recent_date">${date}</span>
                    ${estMien ? '<span class="badge_mien">Mon formulaire</span>' : ''}
                </div>
                <div class="recent_actions">
                    <a href="/collecte_donnees.html" class="btn_action btn_remplir">Remplir</a>
                    <a href="/donnees.html?id=${form.id}" class="btn_action btn_analyser">Analyser</a>
                    ${estMien ? `
                        <button onclick="supprimerFormulaire(${form.id}, this)" 
                                class="btn_action btn_supprimer">Supprimer</button>
                    ` : ''}
                </div>
            `;
            container.appendChild(div);
        });

    } catch (e) {
        console.error("Erreur formulaires récents :", e);
        container.innerHTML = `<p class="vide">Impossible de charger les formulaires.</p>`;
    }
}

async function supprimerFormulaire(id, btn) {
    const confirme = await showConfirm(
        "Supprimer ce formulaire ?",
        "Cette action est irréversible. Toutes les réponses associées seront perdues.",
        "danger"
    );

    if (!confirme) return;

    btn.disabled    = true;
    btn.textContent = "...";

    try {
        await request(`${ENDPOINTS.forms}/delete/${id}`, { method: "DELETE" });
        showToast("Formulaire supprimé avec succès.", "success");
        await loadFormulairesRecents();
        await loadStats();
    } catch (e) {
        console.error("Erreur suppression :", e);
        showToast("Erreur lors de la suppression.", "error");
        btn.disabled    = false;
        btn.textContent = "Supprimer";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();                  
    loadDashboard();             
});

async function loadDashboard() {
    await Promise.all([
        loadStats(),
        loadFormulairesRecents()
    ]);
}

document.addEventListener("DOMContentLoaded", loadDashboard);