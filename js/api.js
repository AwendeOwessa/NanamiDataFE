const API = "https://nanamidata-tpinf232.up.railway.app/api";

const ENDPOINTS = {
    auth: `${API}/utilisateurs`,
    forms: `${API}/formulaires`,
    reponses: `${API}/reponses`,
    analyse: `${API}/analyse`
};

const API_FORM = ENDPOINTS.forms;
const API_REPONSE = ENDPOINTS.reponses;


function getToken() {
    return localStorage.getItem("token");
}

function getUtilisateurId() {
    const id = localStorage.getItem("utilisateurId");
    if (id) return parseInt(id);
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.id) return parseInt(user.id);
    } catch (_) {}
    return null;
}

function getRole() {
    const roleDirecte = localStorage.getItem("role");
    if (roleDirecte) return roleDirecte;
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        return user && user.role ? user.role : null;
    } catch (_) {
        return null;
    }
}

function isAdmin() {
    return getRole() === "ADMIN";
}

function checkAuth() {
    if (!getToken()) {
        window.location.href = "/page-connexion.html";
    }
}

function checkAdmin() {
    const token = getToken();
    const admin = isAdmin();

    console.log("checkAdmin — token  :", token ? "présent" : "ABSENT");
    console.log("checkAdmin — role   :", getRole());
    console.log("checkAdmin — isAdmin:", admin);

    if (!token || !admin) {
        console.warn("Redirection — token:", !!token, "isAdmin:", admin);
        window.location.href = "/page-connexion.html";
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("utilisateurId");
    window.location.href = "/page-connexion.html";
}

function saveSession(result) {
    if (!result) return;

    console.log("saveSession :", JSON.stringify(result));

    if (result.token) localStorage.setItem("token", result.token);
    if (result.role) localStorage.setItem("role", result.role);

    const id = result.id ||
        result.utilisateurId ||
        result.userId ||
        (result.user && result.user.id);
    if (id) localStorage.setItem("utilisateurId", id);

    localStorage.setItem("user", JSON.stringify(result));
}


function afficherUtilisateur() {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        const el = document.getElementById("userNom");
        if (user && el) {
            el.textContent = user.nomUtilisateur || user.nom || "—";
        }
    } catch (_) {}
}

function setLoading(btn, state, text) {
    if (!btn) return;
    btn.disabled = state;
    btn.innerText = text;
}

function showMessage(el, text, success) {
    if (!el) return;
    el.innerText = text;
    el.style.color = success ? "#22c55e" : "#ef4444";
}

async function parseResponse(res) {
    const contentType = res.headers.get("content-type");
    return contentType && contentType.includes("application/json") ?
        await res.json() :
        await res.text();
}

function showToast(message, type = "success", duree = 3000) {
    let conteneur = document.getElementById("toast-conteneur");
    if (!conteneur) {
        conteneur = document.createElement("div");
        conteneur.id = "toast-conteneur";
        document.body.appendChild(conteneur);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icone = type === "success" ? "✅" :
        type === "error" ? "❌" :
        type === "info" ? "ℹ️" :
        "⚠️";

    toast.innerHTML = `
        <span class="toast-icone">${icone}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    conteneur.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-visible"));

    setTimeout(() => {
        toast.classList.remove("toast-visible");
        setTimeout(() => toast.remove(), 400);
    }, duree);
}

function showSpinner(message = "Chargement...") {
    let overlay = document.getElementById("spinner-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "spinner-overlay";
        overlay.innerHTML = `
            <div class="spinner-boite">
                <div class="spinner"></div>
                <p id="spinner-message">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        const msg = document.getElementById("spinner-message");
        if (msg) msg.textContent = message;
    }
    overlay.classList.add("spinner-visible");
}

function hideSpinner() {
    const overlay = document.getElementById("spinner-overlay");
    if (overlay) overlay.classList.remove("spinner-visible");
}

function toggleMenu() {
    const nav = document.getElementById("navBar");
    const burger = document.getElementById("burger");
    if (nav) nav.classList.toggle("nav-ouverte");
    if (burger) burger.classList.toggle("ouvert");
}


async function request(url, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    const res = await fetch(url, {...options, headers });
    const data = await parseResponse(res);

    if (!res.ok) throw new Error(data || "API Error");

    return data;
}


async function getForms() {
    return await request(`${ENDPOINTS.forms}/all`);
}

async function loginAPI(data) {
    return await request(`${ENDPOINTS.auth}/login`, {
        method: "POST",
        body: JSON.stringify(data)
    });
}

async function registerAPI(data) {
    return await request(`${ENDPOINTS.auth}/register`, {
        method: "POST",
        body: JSON.stringify(data)
    });
}

async function getAnalyse(formId) {
    return await request(`${ENDPOINTS.analyse}/formulaire/${formId}`);
}


function mettreAJourHeure() {
    const maintenant = new Date();
    const jours = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
    const mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin",
        "juil.", "août", "sept.", "oct.", "nov.", "déc."
    ];
    const jour = jours[maintenant.getDay()];
    const date = maintenant.getDate();
    const moisNom = mois[maintenant.getMonth()];
    const heures = maintenant.getHours();
    const minutes = String(maintenant.getMinutes()).padStart(2, "0");
    const secondes = String(maintenant.getSeconds()).padStart(2, "0");
    const el = document.getElementById("heure");
    if (el) el.textContent =
        `${jour} ${date} ${moisNom} ${heures}:${minutes}:${secondes}`;
}

setInterval(mettreAJourHeure, 1000);
mettreAJourHeure();

document.addEventListener("DOMContentLoaded", () => {
    afficherUtilisateur();

    const page = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-lien").forEach(lien => {
        if (lien.getAttribute("href").includes(page)) {
            lien.classList.add("active");
        }
    });

    const token = getToken();
    const userEl = document.getElementById("headerUser");
    if (token && userEl) {
        userEl.style.display = "flex";
    }
});

function showConfirm(message, sousTitre = "", type = "danger") {
    return new Promise((resolve) => {

                const existant = document.getElementById("confirm-overlay");
                if (existant) existant.remove();

                const icone = type === "danger" ? "🗑️" :
                    type === "warning" ? "⚠️" :
                    "❓";

                const couleurBtn = type === "danger" ? "#ef4444" :
                    type === "warning" ? "#eab308" :
                    "#38bdf8";

                const overlay = document.createElement("div");
                overlay.id = "confirm-overlay";
                overlay.innerHTML = `
            <div class="confirm-boite">
                <div class="confirm-icone">${icone}</div>
                <h3 class="confirm-titre">${message}</h3>
                ${sousTitre ? `<p class="confirm-sous">${sousTitre}</p>` : ""}
                <div class="confirm-actions">
                    <button class="confirm-btn-annuler" id="confirmAnnuler">
                        Annuler
                    </button>
                    <button class="confirm-btn-valider" id="confirmValider"
                            style="background:${couleurBtn}">
                        Confirmer
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add("confirm-visible"));

        const fermer = (resultat) => {
            overlay.classList.remove("confirm-visible");
            setTimeout(() => overlay.remove(), 300);
            resolve(resultat);
        };

        document.getElementById("confirmValider").onclick  = () => fermer(true);
        document.getElementById("confirmAnnuler").onclick  = () => fermer(false);

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) fermer(false);
        });

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                fermer(false);
                document.removeEventListener("keydown", onKeyDown);
            }
        };
        document.addEventListener("keydown", onKeyDown);
    });
}