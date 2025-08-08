const fs = require('fs');
const path = require('path');

// Liste des fichiers HTML principaux à modifier (basée sur les fichiers existants)
const htmlFiles = [
    'public/collaborateurs.html',
    'public/clients.html',
    'public/analytics.html',
    'public/mission-types.html',
    'public/opportunities.html',
    'public/business-units.html',
    'public/postes.html',
    'public/grades.html',
    'public/divisions.html',
    'public/fiscal-years.html',
    'public/invoices.html',
    'public/invoice-details.html',
    'public/missions.html',
    'public/mission-details.html',
    'public/opportunity-details.html',
    'public/opportunity-stages.html',
    'public/opportunity-types.html',
    'public/task-templates.html',
    'public/taux-horaires.html',
    'public/reports.html',
    'public/secteurs-activite.html',
    'public/pays.html',
    'public/users.html',
    'public/dashboard.html',
                'public/activites-internes.html',
            'public/validation.html',
            'public/time-sheet-approvals.html',
            'public/time-sheet-supervisors.html',
            'public/profile.html'
];

function addSessionManagerToHTML(filePath) {
    try {
        console.log(`🔧 Traitement de ${filePath}...`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Fichier non trouvé: ${filePath}`);
            return;
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Vérifier si le SessionManager est déjà inclus
        if (content.includes('session-manager.js')) {
            console.log(`✅ SessionManager déjà présent dans ${filePath}`);
            return;
        }
        
        // Chercher le pattern pour ajouter le SessionManager après les autres scripts
        const patterns = [
            /<script src="js\/sidebar\.js"[^>]*><\/script>/,
            /<script src="js\/auth\.js"[^>]*><\/script>/,
            /<script src="js\/user-header\.js"[^>]*><\/script>/,
            /<script src="js\/user-modals\.js"[^>]*><\/script>/
        ];
        
        let inserted = false;
        
        for (const pattern of patterns) {
            if (pattern.test(content)) {
                const replacement = `$&\n    <!-- SessionManager pour la gestion centralisée des sessions -->\n    <script src="js/session-manager.js"></script>`;
                content = content.replace(pattern, replacement);
                inserted = true;
                break;
            }
        }
        
        // Si aucun pattern trouvé, chercher la fin du body
        if (!inserted) {
            const bodyEndPattern = /<\/body>/;
            if (bodyEndPattern.test(content)) {
                const sessionManagerScript = `
    <!-- SessionManager pour la gestion centralisée des sessions -->
    <script src="js/session-manager.js"></script>
</body>`;
                content = content.replace('</body>', sessionManagerScript);
                inserted = true;
            }
        }
        
        if (inserted) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ SessionManager ajouté à ${filePath}`);
        } else {
            console.log(`⚠️ Impossible d'ajouter le SessionManager à ${filePath} - pattern non trouvé`);
        }
        
    } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    }
}

// Traiter tous les fichiers
console.log('🚀 Ajout du SessionManager aux fichiers HTML...\n');

let processedCount = 0;
let skippedCount = 0;
let errorCount = 0;

htmlFiles.forEach(filePath => {
    try {
        if (fs.existsSync(filePath)) {
            addSessionManagerToHTML(filePath);
            processedCount++;
        } else {
            console.log(`⚠️ Fichier non trouvé: ${filePath}`);
            skippedCount++;
        }
    } catch (error) {
        console.error(`❌ Erreur avec ${filePath}:`, error.message);
        errorCount++;
    }
});

console.log('\n✅ Traitement terminé !');
console.log(`📊 Statistiques :`);
console.log(`- Fichiers traités : ${processedCount}`);
console.log(`- Fichiers ignorés : ${skippedCount}`);
console.log(`- Erreurs : ${errorCount}`);
console.log('\n📋 Résumé des modifications :');
console.log('- SessionManager ajouté aux fichiers HTML principaux');
console.log('- Les fichiers existants avec SessionManager ont été ignorés');
console.log('- Les fichiers non trouvés ont été signalés');
