document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("formRegister");
    const loginForm = document.getElementById("formLogin");
    const btnAdmin = document.getElementById("btnAdmin");

    if (registerForm) registerForm.addEventListener("submit", register);
    if (loginForm) loginForm.addEventListener("submit", login);
    if (btnAdmin) btnAdmin.addEventListener("click", connexionAdmin);
});


function connexionAdmin() {
    const emailInput = document.getElementById("loginEmail");
    const pwdInput = document.getElementById("loginPassword");
    const carte = document.querySelector(".auth-carte");

    if (carte) {
        carte.style.borderColor = "rgba(129, 140, 248, 0.4)";
        carte.style.boxShadow = "0 0 0 3px rgba(129, 140, 248, 0.1)";
        setTimeout(() => {
            carte.style.borderColor = "";
            carte.style.boxShadow = "";
        }, 2000);
    }

    if (emailInput) {
        emailInput.placeholder = "admin@nanamidata.com";
        emailInput.focus();
    }

    const message = document.getElementById("loginMessage");
    if (message) {
        message.textContent = "Entrez vos identifiants administrateur.";
        message.style.color = "#818cf8";
    }
}


async function register(event) {
    event.preventDefault();

    const btn = event.target.querySelector("button[type='submit']");
    const message = document.getElementById("registerMessage");

    setLoading(btn, true, "Chargement...");

    const data = {
        nom: document.getElementById("nom").value,
        email: document.getElementById("email").value,
        nomUtilisateur: document.getElementById("nomUtilisateur").value,
        motDePasse: document.getElementById("password").value
    };

    try {
        const res = await fetch(`${API}/utilisateurs/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await parseResponse(res);

        if (!res.ok) {
            showMessage(message, result || "Échec de l'inscription", false);
            return;
        }

        const success = await loginAfterRegister(data);
        if (!success) {
            showMessage(message, "Compte créé mais connexion échouée", false);
            return;
        }

        showMessage(message, "Inscription réussie !", true);
        setTimeout(() => window.location.href = "page-connexion.html", 1000);

    } catch (err) {
        console.error(err);
        showMessage(message, "Erreur serveur", false);
    } finally {
        setLoading(btn, false, "Créer mon compte");
    }
}


async function login(event) {
    event.preventDefault();

    const btn = event.target.querySelector("button[type='submit']");
    const message = document.getElementById("loginMessage");

    setLoading(btn, true, "Connexion...");

    const data = {
        email: document.getElementById("loginEmail").value,
        motDePasse: document.getElementById("loginPassword").value
    };

    try {
        const res = await fetch(`${API}/utilisateurs/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await parseResponse(res);

        console.log("=== RÉSULTAT LOGIN ===");
        console.log("status :", res.status);
        console.log("result :", JSON.stringify(result));
        console.log("role   :", result.role);
        console.log("token  :", result.token);
        console.log("======================");


        if (!res.ok) {
            showMessage(message, "Email ou mot de passe incorrect", false);
            return;
        }

        saveSession(result);

        if (result.role === "ADMIN") {
            showMessage(message, "Connexion admin réussie !", true);
            setTimeout(() => window.location.href = "admin.html", 1000);
        } else {
            showMessage(message, "Connexion réussie !", true);
            setTimeout(() => window.location.href = "index.html", 1000);
        }

    } catch (err) {
        console.error(err);
        showMessage(message, "Erreur serveur", false);
    } finally {
        setLoading(btn, false, "Se connecter");
    }
}


async function loginAfterRegister(data) {
    try {
        const res = await fetch(`${API}/utilisateurs/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: data.email,
                motDePasse: data.motDePasse
            })
        });

        if (!res.ok) return false;

        const result = await res.json();
        saveSession(result);
        return true;

    } catch (e) {
        console.error(e);
        return false;
    }
}

function toggleMdp(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        btn.style.color = "#38bdf8";
    } else {
        input.type = "password";
        btn.style.color = "#475569";
    }
}