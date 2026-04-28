async function envoyerContact(event) {
    event.preventDefault();

    const nom = document.getElementById("nom").value.trim();
    const email = document.getElementById("email").value.trim();
    const sujet = document.getElementById("sujet").value;
    const message = document.getElementById("message").value.trim();
    const copie = document.getElementById("copie").checked;
    const btn = document.getElementById("btnEnvoyer");

    if (!nom || !email || !sujet || !message) {
        showToast("Veuillez remplir tous les champs.", "warning");
        return;
    }

    const confirme = await showConfirm(
        "Envoyer ce message ?",
        `Destinataire : contact@nanamidata.com`,
        "info"
    );

    if (!confirme) return;

    btn.disabled = true;
    btn.querySelector("span").textContent = "Envoi en cours...";

    try {
        const res = await fetch(`${API}/contact/envoyer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nom, email, sujet, message, copie })
        });

        const data = await res.text();

        if (!res.ok) {
            console.error("Erreur backend :", data);
            showToast(data || "Erreur lors de l'envoi.", "error");
            return;
        }

        showToast("Message envoyé avec succès ! Nous vous répondrons bientôt.", "success", 5000);
        document.getElementById("formContact").reset();

    } catch (e) {
        console.error("Erreur réseau :", e);
        showToast("Impossible de contacter le serveur.", "error");

    } finally {
        btn.disabled = false;
        btn.querySelector("span").textContent = "Envoyer le message";
    }
}