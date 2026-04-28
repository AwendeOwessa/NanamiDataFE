const COULEURS = [
    "#38bdf8", "#818cf8", "#34d399", "#fb923c",
    "#f472b6", "#a78bfa", "#facc15", "#60a5fa"
];

let chartBarre = null;
let chartSecteur = null;
let chartDistribution = null;
let formulaireIdActuel = null;


document.addEventListener("DOMContentLoaded", () => {
    checkAuth();

    if (typeof Chart !== "undefined") {
        Chart.defaults.animation = { duration: 1200, easing: "easeOutQuart" };
        Chart.defaults.color = "#94a3b8";
        Chart.defaults.font.family = "Inter, sans-serif";
    }

    const params = new URLSearchParams(window.location.search);
    formulaireIdActuel = params.get("id");

    if (!formulaireIdActuel) {
        const main = document.querySelector("main");
        if (main) {
            main.innerHTML = `
                <div class="page_vide">
                    <p>Aucun formulaire sélectionné.</p>
                    <a href="/collecte_donnees.html" class="btn_retour">
                        ← Retour à la liste des formulaires
                    </a>
                </div>
            `;
        }
        return;
    }

    loadAnalytics(formulaireIdActuel);
});


async function loadAnalytics(formulaireId) {
    showSpinner("Chargement de l'analyse...");
    try {
        const [data, evolution] = await Promise.all([
            fetch(`${API}/analyse/analyseFormulaire?formulaireId=${formulaireId}`, {
                headers: { "Authorization": "Bearer " + getToken() }
            }).then(r => r.ok ? r.json() : Promise.reject(r.status)),

            fetch(`${API}/analyse/evolution/${formulaireId}`, {
                headers: { "Authorization": "Bearer " + getToken() }
            }).then(r => r.ok ? r.json() : [])
        ]);

        const questions = Object.values(data);

        afficherTitreFormulaire(formulaireId);
        afficherResume(questions);
        afficherTableauStats(questions);
        afficherGraphiques(questions, evolution);
        afficherDetails(questions);

    } catch (e) {
        console.error("Erreur analytics :", e);
        showToast("Impossible de charger les données d'analyse.", "error");
    } finally {
        hideSpinner();
    }
}


async function afficherTitreFormulaire(formulaireId) {
    try {
        const res = await fetch(`${API}/formulaires/get/${formulaireId}`, {
            headers: { "Authorization": "Bearer " + getToken() }
        });
        const form = await res.json();
        const h1 = document.querySelector("main h1");
        if (h1) h1.textContent = `Analyse — ${form.titre}`;
    } catch (_) {}
}


function afficherResume(questions) {
    const totalReponses = calculerTotalReponses(questions);
    document.getElementById("totalResponses").textContent = totalReponses;
    document.getElementById("totalQuestions").textContent = questions.length;

    let topChoice = "—";
    let topCount = 0;
    questions.forEach(q => {
        if (q.comptage) {
            Object.entries(q.comptage).forEach(([valeur, count]) => {
                if (count > topCount) {
                    topCount = count;
                    topChoice = valeur;
                }
            });
        }
    });
    document.getElementById("topChoice").textContent = topChoice;

    const numeriques = questions.filter(q => q.statistiques);
    let resumeTexte = `${questions.length} question(s) analysée(s) — ${totalReponses} réponse(s) au total. `;

    if (numeriques.length > 0) {
        resumeTexte += "Variables numériques : " + numeriques.map(q => {
            const moy = (q.statistiques.moyenne !== null && q.statistiques.moyenne !== undefined) ?
                Number(q.statistiques.moyenne).toFixed(2) : "N/A";
            return `"${q.texte}" (moy. ${moy})`;
        }).join(", ") + ".";
        document.getElementById("resume").style.color = "#34d399";
    }

    document.getElementById("resume").textContent = resumeTexte;
}

function calculerTotalReponses(questions) {
    let max = 0;
    questions.forEach(q => {
        let n = 0;
        if (q.statistiques && q.statistiques.nValides != null) {
            n = q.statistiques.nValides;
        } else if (q.comptage) {
            n = Object.values(q.comptage).reduce((s, v) => s + v, 0);
        } else if (q.reponses) {
            n = q.reponses.length;
        }
        if (n > max) max = n;
    });
    return max;
}


function afficherTableauStats(questions) {
    const tbody = document.getElementById("tableStatsBody");
    tbody.innerHTML = "";
    const numeriques = questions.filter(q => q.statistiques);

    if (numeriques.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9"
            style="text-align:center;color:#64748b;padding:20px">
            Aucune variable numérique dans ce formulaire.</td></tr>`;
        return;
    }

    numeriques.forEach(q => {
        const s = q.statistiques;
        const cv = s.cv != null ? s.cv : 0;
        const interp = s.interpretation || interpreterCV(cv);
        const badgeClass = interp === "Homogène" ? "homogene" :
            interp === "Modérément variable" ? "moderement" :
            "tres_variable";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${q.texte}</td>
            <td>${s.nValides != null ? s.nValides : "—"}</td>
            <td>${fmt(s.min)}</td>
            <td>${fmt(s.max)}</td>
            <td>${fmt(s.moyenne)}</td>
            <td>${fmt(s.mediane)}</td>
            <td>${fmt(s.ecartType)}</td>
            <td>${fmt(cv)}%</td>
            <td><span class="badge ${badgeClass}">${interp}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function fmt(val) {
    if (val === null || val === undefined) return "—";
    return typeof val === "number" ? val.toFixed(2) : val;
}

function interpreterCV(cv) {
    if (cv < 15) return "Homogène";
    if (cv < 30) return "Modérément variable";
    return "Très variable";
}


function afficherGraphiques(questions, evolution = []) {

    const categorielle = questions.filter(q => q.comptage);
    if (categorielle.length > 0) {
        const labels = [],
            values = [];
        categorielle.forEach(q => {
            Object.entries(q.comptage).forEach(([k, v]) => {
                labels.push(`${q.texte} — ${k}`);
                values.push(v);
            });
        });
        creerChart("chartBarre", "graphique_barre", "bar", {
            labels,
            datasets: [{
                label: "Nombre de réponses",
                data: values,
                backgroundColor: COULEURS.slice(0, values.length),
                borderRadius: 6
            }]
        }, {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            animation: { delay: ctx => ctx.dataIndex * 80 }
        });
    }

    const avecPct = questions.filter(q => q.pourcentages);
    if (avecPct.length > 0) {
        const labels = [],
            values = [];
        avecPct.forEach(q => {
            Object.entries(q.pourcentages).forEach(([k, v]) => {
                labels.push(k);
                values.push(v);
            });
        });
        creerChart("chartSecteur", "graphique_secteur", "doughnut", {
            labels,
            datasets: [{
                data: values,
                backgroundColor: COULEURS,
                borderWidth: 2,
                borderColor: "#0f172a"
            }]
        }, {
            plugins: {
                legend: { position: "right" },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label} : ${ctx.parsed.toFixed(1)}%`
                    }
                }
            },
            animation: { animateRotate: true, animateScale: true, duration: 1400 }
        });
    }

    const avecDist = questions.filter(q => q.distribution);
    if (avecDist.length > 0) {
        const q = avecDist[0];
        const labels = Object.keys(q.distribution).sort();
        creerChart("chartDistribution", "graphique_distribution", "bar", {
            labels,
            datasets: [{
                label: q.texte,
                data: labels.map(k => q.distribution[k]),
                backgroundColor: "rgba(56,189,248,0.5)",
                borderColor: "#38bdf8",
                borderWidth: 1,
                borderRadius: 4
            }]
        }, {
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        });
    }

    if (evolution && evolution.length > 0) {
        creerChart("chartEvolution", "graphique_evolution", "line", {
            labels: evolution.map(e => e.date),
            datasets: [{
                label: "Réponses par jour",
                data: evolution.map(e => e.count),
                borderColor: "#34d399",
                backgroundColor: "rgba(52, 211, 153, 0.1)",
                tension: 0.4,
                fill: true,
                pointBackgroundColor: "#34d399",
                pointRadius: 5
            }]
        }, {
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { ticks: { maxTicksLimit: 10 } }
            },
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} réponse(s)`
                    }
                }
            }
        });
    }
}

function creerChart(varName, canvasId, type, data, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (window[varName]) window[varName].destroy();
    window[varName] = new Chart(canvas, {
        type,
        data,
        options: { responsive: true, ...options }
    });
}


function afficherDetails(questions) {
    const container = document.getElementById("details");
    container.innerHTML = "";

    questions.forEach((q, index) => {
        const div = document.createElement("div");
        div.className = "detail_carte";
        div.style.animation = `fadeIn 0.5s forwards ${index * 0.1}s`;

        let contenu = `
            <span class="type_badge">${q.type}</span>
            <h3>${q.texte}</h3>
        `;

        if (q.statistiques) {
            const s = q.statistiques;
            contenu += `
                <div class="stat_ligne"><span>N valides</span>
                    <span>${s.nValides != null ? s.nValides : "—"}</span></div>
                <div class="stat_ligne"><span>Minimum</span><span>${fmt(s.min)}</span></div>
                <div class="stat_ligne"><span>Maximum</span><span>${fmt(s.max)}</span></div>
                <div class="stat_ligne"><span>Moyenne</span><span>${fmt(s.moyenne)}</span></div>
                <div class="stat_ligne"><span>Médiane</span><span>${fmt(s.mediane)}</span></div>
                <div class="stat_ligne"><span>Écart-type</span><span>${fmt(s.ecartType)}</span></div>
                <div class="stat_ligne"><span>CV%</span><span>${fmt(s.cv)}%</span></div>
            `;
        }

        if (q.comptage) {
            Object.entries(q.comptage).forEach(([valeur, count]) => {
                let pct = "—";
                if (q.pourcentages && q.pourcentages[valeur] != null) {
                    pct = Number(q.pourcentages[valeur]).toFixed(1);
                }
                contenu += `
                    <div class="stat_ligne">
                        <span>${valeur}</span>
                        <span>${count} (${pct}%)</span>
                    </div>
                `;
            });
        }

        if (q.reponses) {
            contenu += `<p style="font-size:13px;color:#64748b;margin-bottom:6px">
                ${q.reponses.length} réponse(s) :</p>`;
            q.reponses.slice(0, 5).forEach(r => {
                contenu += `<div class="reponse_item">"${r}"</div>`;
            });
            if (q.reponses.length > 5) {
                contenu += `<p style="font-size:12px;color:#64748b;margin-top:6px">
                    + ${q.reponses.length - 5} autre(s)…</p>`;
            }
        }

        div.innerHTML = contenu;
        container.appendChild(div);
    });
}