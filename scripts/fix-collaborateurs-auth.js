const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/collaborateurs.html');

async function fixCollaborateursAuth() {
    console.log('🔧 Correction des appels API dans collaborateurs.html...\n');

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Liste des patterns à corriger
        const patterns = [
            // Appels fetch simples
            {
                from: /await fetch\(`\${API_BASE_URL}\/([^`]+)`\)/g,
                to: 'await authenticatedFetch(`${API_BASE_URL}/$1`)'
            },
            // Appels fetch avec options
            {
                from: /await fetch\(`\${API_BASE_URL}\/([^`]+)`,\s*\{/g,
                to: 'await authenticatedFetch(`${API_BASE_URL}/$1`, {'
            },
            // Appels fetch avec options et headers
            {
                from: /await fetch\(`\${API_BASE_URL}\/([^`]+)`,\s*\{\s*headers:\s*\{/g,
                to: 'await authenticatedFetch(`${API_BASE_URL}/$1`, {\n                    headers: {'
            }
        ];

        let modified = false;
        patterns.forEach((pattern, index) => {
            const matches = content.match(pattern.from);
            if (matches) {
                console.log(`✅ Pattern ${index + 1}: ${matches.length} remplacements`);
                content = content.replace(pattern.from, pattern.to);
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('\n✅ Fichier collaborateurs.html mis à jour avec succès');
        } else {
            console.log('\nℹ️ Aucun changement nécessaire');
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixCollaborateursAuth(); 