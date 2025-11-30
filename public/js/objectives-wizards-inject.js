// ============================================
// SCRIPT D'INJECTION DES WIZARDS
// ============================================

// Ce script injecte les wizards dans la page objectives-management.html
// sans modifier directement le fichier HTML principal

document.addEventListener('DOMContentLoaded', async function () {
    // 1. Charger et injecter les modaux
    await injectWizardModals();

    // 2. Remplacer le bouton "Nouvel Objectif" par les deux nouveaux boutons
    replaceObjectiveButton();
});

async function injectWizardModals() {
    try {
        const response = await fetch('/objectives-wizards-modals.html');
        if (response.ok) {
            const html = await response.text();

            // Créer un conteneur temporaire
            const container = document.createElement('div');
            container.innerHTML = html;

            // Ajouter les modaux au body
            document.body.appendChild(container);

            console.log('✅ Wizards modals injected successfully');
        } else {
            console.error('❌ Failed to load wizard modals');
        }
    } catch (error) {
        console.error('❌ Error injecting wizard modals:', error);
    }
}

function replaceObjectiveButton() {
    // Trouver le bouton "Nouvel Objectif"
    const buttons = Array.from(document.querySelectorAll('button'));
    const targetButton = buttons.find(btn => btn.textContent.includes('Nouvel Objectif'));

    if (targetButton) {
        // Créer le groupe de boutons
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'btn-group';
        buttonGroup.setAttribute('role', 'group');

        // Bouton 1 : Objectif Autonome
        const autonomousBtn = document.createElement('button');
        autonomousBtn.className = 'btn btn-primary';
        autonomousBtn.onclick = openAutonomousObjectiveWizard;
        autonomousBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Créer Objectif Autonome';

        // Bouton 2 : Distribuer
        const distributeBtn = document.createElement('button');
        distributeBtn.className = 'btn btn-success';
        distributeBtn.onclick = openDistributeObjectiveWizard;
        distributeBtn.innerHTML = '<i class="fas fa-share-nodes me-2"></i>Distribuer Objectif';

        // Ajouter les boutons au groupe
        buttonGroup.appendChild(autonomousBtn);
        buttonGroup.appendChild(distributeBtn);

        // Remplacer l'ancien bouton
        targetButton.parentNode.replaceChild(buttonGroup, targetButton);

        console.log('✅ Objective buttons replaced successfully');
    } else {
        console.warn('⚠️ Original "Nouvel Objectif" button not found');
    }
}
