const PAGE_SIZE = 5;
let pageCourante = 1;
let tousLesFormulaires = [];


async function loadForms() {
    const container = document.getElementById("formulaires");
    if (!container) return;

    showSpinner("Chargement des formulaires...");

    try {
        const res = await fetch(`${API_FORM}/all`, {
            headers: { "Authorization": "Bearer " + getToken() }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        tousLesFormulaires = await res.json();
        pageCourante = 1;
        afficherPage();

    } catch (e) {
        console.error("Erreur chargement formulaires", e);
        showToast("Impossible de charger les formulaires.", "error");
    } finally {
        hideSpinner();
    }
}


function afficherPage() {
    const container = document.getElementById("formulaires");
    const userId = getUtilisateurId();

    // ← plus de filtre — tous les formulaires sont visibles
    const total = tousLesFormulaires.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const debut = (pageCourante - 1) * PAGE_SIZE;
    const page = tousLesFormulaires.slice(debut, debut + PAGE_SIZE);

    container.innerHTML = "";
    page.forEach(form => container.appendChild(createFormCard(form, userId)));

    // Pagination
    let pagination = document.getElementById("pagination");
    if (!pagination) {
        pagination = document.createElement("div");
        pagination.id = "pagination";
        pagination.className = "pagination";
        container.parentElement.appendChild(pagination);
    }

    pagination.innerHTML = "";
    if (totalPages <= 1) return;

    const btnPrev = document.createElement("button");
    btnPrev.textContent = "← Précédent";
    btnPrev.disabled = pageCourante === 1;
    btnPrev.onclick = () => {
        pageCourante--;
        afficherPage();
    };
    pagination.appendChild(btnPrev);

    const info = document.createElement("span");
    info.textContent = `Page ${pageCourante} / ${totalPages}`;
    pagination.appendChild(info);

    const btnNext = document.createElement("button");
    btnNext.textContent = "Suivant →";
    btnNext.disabled = pageCourante === totalPages;
    btnNext.onclick = () => {
        pageCourante++;
        afficherPage();
    };
    pagination.appendChild(btnNext);
}


function createFormCard(form, userId) {
    const div = document.createElement("div");
    div.classList.add("form-card");

    const estMien = form.utilisateur && form.utilisateur.id === userId;
    const auteur = form.utilisateur ?
        (form.utilisateur.nomUtilisateur || form.utilisateur.nom || "Anonyme") :
        "Anonyme";

    div.innerHTML = `
        <div class="form-card-header">
            <h2>${form.titre}</h2>
            ${estMien
                ? '<span class="form-badge-mien">Mon formulaire</span>'
                : ''}
        </div>

        <p class="form-description">${form.description || ""}</p>

        <div class="form-auteur-ligne">
            <span class="form-auteur">${auteur}</span>
        </div>

        <div class="form-actions">
            <button class="btn-analyser">Analyser</button>
        </div>

        <div class="form-content">
            <div class="questions"></div>
            <button class="submit-btn">Envoyer mes réponses</button>
        </div>
    `;

    const btnAnalyser = div.querySelector(".btn-analyser");
    btnAnalyser.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = `/donnees.html?id=${form.id}`;
    });

    const btn = div.querySelector(".submit-btn");
    const formContent = div.querySelector(".form-content");

    formContent.addEventListener("click", (e) => e.stopPropagation());

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        submitReponse(form.id, div);
    });

    div.addEventListener("click", async() => {
        const isActive = div.classList.toggle("active");
        if (isActive) await loadQuestions(form.id, div);
    });

    return div;
}


async function loadQuestions(formId, card) {
    try {
        const res = await fetch(`${API_FORM}/get/${formId}`, {
            headers: { "Authorization": "Bearer " + getToken() }
        });
        const form = await res.json();

        const container = card.querySelector(".questions");
        container.innerHTML = "";

        if (!form.questions || form.questions.length === 0) {
            container.innerHTML = "<p>Aucune question dans ce formulaire.</p>";
            return;
        }

        form.questions.forEach(q => container.appendChild(createQuestion(q)));

    } catch (e) {
        console.error("Erreur questions", e);
    }
}


function createQuestion(q) {
    const div = document.createElement("div");
    div.classList.add("question");
    div.dataset.questionId = q.id;

    let html = `<p>${q.label}</p>`;

    if (typeof q.options === "string") {
        q.options = q.options.split(",").map(o => o.trim());
    }

    switch (q.type) {
        case "TEXTE":
            html += `<input type="text" class="answer" placeholder="Votre réponse...">`;
            break;

        case "NOMBRE":
            html += `<input
                        type="number"
                        class="answer"
                        placeholder="Entrez un nombre"
                        min="${(q.options && q.options[0]) ? q.options[0] : ''}"
                        max="${(q.options && q.options[1]) ? q.options[1] : ''}"
                        step="1">`;
            break;

        case "CHOIX_UNIQUE":
            html += q.options.map(opt =>
                `<label>
                    <input type="radio" name="q${q.id}" value="${opt}">
                    ${opt}
                </label>`
            ).join("");
            break;

        case "CHOIX_MULTIPLE":
            html += q.options.map(opt =>
                `<label>
                    <input type="checkbox" name="q${q.id}" value="${opt}">
                    ${opt}
                </label>`
            ).join("");
            break;

        case "ECHELLE":
            for (let i = 1; i <= 5; i++) {
                html += `<label>
                    <input type="radio" name="q${q.id}" value="${i}">
                    ${i}
                </label>`;
            }
            break;

        case "VRAI_FAUX":
            html += `
                <label><input type="radio" name="q${q.id}" value="Vrai"> Vrai</label>
                <label><input type="radio" name="q${q.id}" value="Faux"> Faux</label>
            `;
            break;

        default:
            html += `<p style="color:#ef4444">Type inconnu : ${q.type}</p>`;
            break;
    }

    div.innerHTML = html;
    return div;
}


async function submitReponse(formId, card) {
    const utilisateurId = getUtilisateurId();
    if (!utilisateurId) {
        showToast("Vous devez être connecté pour soumettre une réponse.", "warning");
        return;
    }

    const answers = [];
    let reponseValide = true;

    card.querySelectorAll(".question").forEach((qEl) => {
        const questionId = parseInt(qEl.dataset.questionId);
        const inputTexte = qEl.querySelector("input[type='text'], input[type='number']");
        const inputChecked = qEl.querySelector("input:checked");
        const checkboxes = qEl.querySelectorAll("input[type='checkbox']:checked");

        let valeur = null;
        if (checkboxes.length > 0) {
            valeur = Array.from(checkboxes).map(c => c.value).join(", ");
        } else if (inputChecked) {
            valeur = inputChecked.value;
        } else if (inputTexte && inputTexte.value.trim() !== "") {
            valeur = inputTexte.value.trim();
        }

        if (!valeur) { reponseValide = false; return; }
        answers.push({ questionId, valeur });
    });

    if (!reponseValide) {
        showToast("Veuillez répondre à toutes les questions.", "warning");
        return;
    }

    showSpinner("Envoi de la réponse...");

    try {
        const res = await fetch(`${API}/reponses/submit`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + getToken()
            },
            body: JSON.stringify({ formulaireId: formId, utilisateurId, answers })
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Erreur soumission :", err);
            showToast("Erreur lors de l'envoi de la réponse.", "error");
            return;
        }

        showToast("Réponse envoyée avec succès !", "success");
        afficherConfirmation(card);
        card.classList.remove("active");

    } catch (e) {
        console.error("Erreur réseau :", e);
        showToast("Impossible de contacter le serveur.", "error");
    } finally {
        hideSpinner();
    }
}


function afficherConfirmation(card) {
    const confirmation = document.createElement("div");
    confirmation.className = "confirmation-overlay";
    confirmation.innerHTML = `
        <div class="confirmation-boite">
            <span class="confirmation-icone">✅</span>
            <p>Réponse envoyée !</p>
        </div>
    `;
    card.style.position = "relative";
    card.appendChild(confirmation);
    setTimeout(() => confirmation.remove(), 2500);
}


document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("formulaires");
    if (container) loadForms();
});