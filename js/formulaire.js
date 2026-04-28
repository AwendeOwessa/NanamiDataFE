function ajouterQuestion() {
    const container = document.getElementById("questions");
    const div = document.createElement("div");
    div.classList.add("question");

    div.innerHTML = `
        <input type="text" placeholder="Question" class="q-texte">
        <select class="q-type">
            <option value="TEXTE">Texte</option>
            <option value="NOMBRE">Nombre</option>
            <option value="CHOIX_UNIQUE">Choix unique</option>
            <option value="CHOIX_MULTIPLE">Choix multiple</option>
            <option value="ECHELLE">Échelle (1-5)</option>
            <option value="VRAI_FAUX">Vrai ou Faux</option>
        </select>
        <input type="text"
               placeholder="Options (ex : Taxi, Bus, Moto)"
               class="q-options"
               style="display:none;">
        <button type="button" class="btn-supprimer-question" onclick="supprimerQuestion(this)">
            Supprimer
        </button>
    `;

    const select = div.querySelector(".q-type");
    select.addEventListener("change", () => changerType(select));
    container.appendChild(div);
}

function supprimerQuestion(btn) {
    btn.closest(".question").remove();
}

function changerType(select) {
    const options = select.parentElement.querySelector(".q-options");

    switch (select.value) {
        case "CHOIX_UNIQUE":
        case "CHOIX_MULTIPLE":
            options.style.display = "block";
            options.placeholder = "Ex : Taxi, Bus, Moto";
            options.value = "";
            break;
        case "VRAI_FAUX":
            options.style.display = "block";
            options.value = "Vrai, Faux";
            break;
        case "NOMBRE":
            options.style.display = "block";
            options.placeholder = "Min, Max (ex : 0, 100) — optionnel";
            options.value = "";
            break;
        default:
            options.style.display = "none";
            options.value = "";
            break;
    }
}

async function creerFormulaire() {
    const titre = document.getElementById("titre").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!titre) {
        showToast("Veuillez saisir un titre pour le formulaire.", "warning");
        return;
    }

    const utilisateurId = getUtilisateurId();
    if (!utilisateurId) {
        showToast("Session expirée. Veuillez vous reconnecter.", "error");
        window.location.href = "page-connexion.html";
        return;
    }

    const questions = [];
    let questionValide = true;

    document.querySelectorAll(".question").forEach((q, index) => {
        const texte = q.querySelector(".q-texte").value.trim();
        const type = q.querySelector(".q-type").value;
        const rawOptions = q.querySelector(".q-options").value;

        if (!texte) {
            showToast(`La question n°${index + 1} est vide.`, "warning");
            questionValide = false;
            return;
        }

        const options = rawOptions ?
            rawOptions.split(",").map(o => o.trim()).filter(o => o !== "") : [];

        questions.push({ label: texte, type, options });
    });

    if (!questionValide) return;

    if (questions.length === 0) {
        showToast("Ajoutez au moins une question avant de créer le formulaire.", "warning");
        return;
    }

    showSpinner("Création du formulaire...");

    try {
        const res = await fetch(`${API}/formulaires/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + getToken()
            },
            body: JSON.stringify({ titre, description, utilisateurId, questions })
        });

        if (!res.ok) {
            const erreur = await res.text();
            console.error("Erreur backend :", erreur);
            showToast("Erreur lors de la création du formulaire.", "error");
            return;
        }

        showToast("Formulaire créé avec succès !", "success");
        setTimeout(() => nouveauFormulaire(), 1000);

    } catch (err) {
        console.error("Erreur réseau :", err);
        showToast("Impossible de contacter le serveur.", "error");
    } finally {
        hideSpinner();
    }
}

function nouveauFormulaire() {
    const questions = document.querySelectorAll(".question");
    questions.forEach((q, i) => {
        setTimeout(() => q.classList.add("animation_nouveau"), i * 80);
    });
    setTimeout(() => {
        document.getElementById("titre").value = "";
        document.getElementById("description").value = "";
        document.getElementById("questions").innerHTML = "";
    }, questions.length * 80 + 400);
}