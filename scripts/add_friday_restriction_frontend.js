const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    let content = fs.readFileSync(filePath, 'utf16le');

    // 1. Ajouter les fonctions helper à la fin
    const helperFunctions = `

// --- RESTRICTION VENDREDI ---
function canSubmitTimesheet(weekStart) {
    if (!weekStart) return true;
    const start = new Date(weekStart);
    const today = new Date();
    
    // Calculer le lundi de la semaine actuelle
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - today.getDay() + 1);
    mondayThisWeek.setHours(0,0,0,0);
    
    // Normaliser weekStart
    const weekStartNormalized = new Date(start);
    weekStartNormalized.setHours(0,0,0,0);
    
    // Si semaine passée : OK
    if (weekStartNormalized.getTime() < mondayThisWeek.getTime()) {
        return true;
    }
    
    // Si semaine actuelle/future : Vendredi ou plus tard
    const currentDay = today.getDay();
    // 0=Dimanche, 5=Vendredi, 6=Samedi. Donc OK si 0, 5, 6.
    // Bloqué si 1, 2, 3, 4.
    return !(currentDay >= 1 && currentDay < 5);
}

function updateSubmitButton(weekStart, status) {
    const submitBtn = document.querySelector('button[onclick="submitTimeSheet()"]');
    if (!submitBtn) return;
    
    if (status !== 'saved' && status !== 'draft' && status !== 'rejected') {
        submitBtn.disabled = true;
        submitBtn.textContent = \`Statut: \${status}\`;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else if (!canSubmitTimesheet(weekStart)) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Soumission possible vendredi';
        submitBtn.title = 'Les feuilles de la semaine en cours ne peuvent être soumises qu\\'à partir de vendredi';
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Soumettre la feuille';
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        submitBtn.title = '';
    }
}
`;

    if (!content.includes('function canSubmitTimesheet')) {
        content += helperFunctions;
        console.log('✅ Helper functions added');
    }

    // 2. Injecter l'appel dans displayTimeSheet ou similaire
    // On cherche où le statut est affiché ou mis à jour
    // "updateTimeSheetStatus" semble être une bonne cible si elle existe

    // Cherchons une fonction qui charge les données
    // On va chercher "function displayTimeSheet" ou l'endroit où currentTimeSheet est utilisé

    // Injection générique à la fin de loadTimeSheetData ou équivalent
    // On va chercher "async function loadTimeSheetData"

    const injectionTarget = 'async function loadTimeSheetData(';
    const injectionPoint = content.indexOf(injectionTarget);

    if (injectionPoint !== -1) {
        // On cherche la fin de la fonction (c'est risqué), ou mieux, on cherche là où on met à jour l'UI
        // On va chercher "updateUI()" ou similaire si ça existe.
        // Sinon, on va chercher là où on set currentTimeSheet

        // Essayons de trouver "currentTimeSheet ="
        // Et on ajoute l'appel après

        // Mieux : on injecte dans updateTimeSheetStatus si elle existe
        const updateStatusTarget = 'function updateTimeSheetStatus(';
        const updateStatusIndex = content.indexOf(updateStatusTarget);

        if (updateStatusIndex !== -1) {
            // On cherche la fin de la fonction
            const closingBrace = content.indexOf('}', updateStatusIndex);
            // On insère avant l'accolade fermante
            const codeToInsert = `
    if (currentTimeSheet) {
        updateSubmitButton(currentTimeSheet.week_start, status);
    }
`;
            content = content.slice(0, closingBrace) + codeToInsert + content.slice(closingBrace);
            console.log('✅ updateSubmitButton call injected into updateTimeSheetStatus');
        } else {
            console.log('⚠️ updateTimeSheetStatus not found, trying generic injection');
            // Fallback : on ajoute un observer ou on modifie loadTimeSheet
        }
    }

    fs.writeFileSync(filePath, content, 'utf16le');
    console.log('✅ Frontend modification complete');

} catch (e) {
    console.error('Error modifying frontend:', e);
}
