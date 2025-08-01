const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

async function fixAllPagesAuth() {
    console.log('🔧 Correction de l\'authentification dans toutes les pages HTML...\n');

    try {
        // Lire tous les fichiers HTML dans le dossier public
        const files = fs.readdirSync(publicDir).filter(file => file.endsWith('.html'));
        
        console.log(`📁 ${files.length} fichiers HTML trouvés:`);
        files.forEach(file => console.log(`  - ${file}`));
        console.log('');

        let totalFixed = 0;

        for (const file of files) {
            const filePath = path.join(publicDir, file);
            console.log(`🔧 Traitement de ${file}...`);
            
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;

            // Vérifier si le fichier contient des appels API
            const hasApiCalls = content.includes('API_BASE_URL') && content.includes('fetch(');
            
            if (!hasApiCalls) {
                console.log(`  ⏭️  Aucun appel API trouvé dans ${file}`);
                continue;
            }

            // Ajouter la fonction authenticatedFetch si elle n'existe pas
            if (!content.includes('authenticatedFetch')) {
                const apiBaseUrlMatch = content.match(/const API_BASE_URL = ['"]\/api['"];/);
                if (apiBaseUrlMatch) {
                    const authenticatedFetchFunction = `
        // Fonction utilitaire pour les appels API authentifiés
        async function authenticatedFetch(url, options = {}) {
            const token = localStorage.getItem('authToken');
            const defaultHeaders = {
                'Authorization': \`Bearer \${token}\`,
                'Content-Type': 'application/json'
            };
            
            return fetch(url, {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...options.headers
                }
            });
        }
`;
                    
                    // Insérer après la déclaration de API_BASE_URL
                    content = content.replace(
                        /(const API_BASE_URL = ['"]\/api['"];)/,
                        `$1${authenticatedFetchFunction}`
                    );
                    modified = true;
                    console.log(`  ✅ Fonction authenticatedFetch ajoutée`);
                }
            }

            // Remplacer les appels fetch par authenticatedFetch
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

            let fileFixed = 0;
            patterns.forEach((pattern, index) => {
                const matches = content.match(pattern.from);
                if (matches) {
                    console.log(`    Pattern ${index + 1}: ${matches.length} remplacements`);
                    content = content.replace(pattern.from, pattern.to);
                    fileFixed += matches.length;
                    modified = true;
                }
            });

            if (modified) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`  ✅ ${file} mis à jour (${fileFixed} corrections)`);
                totalFixed += fileFixed;
            } else {
                console.log(`  ℹ️  ${file} - Aucun changement nécessaire`);
            }
            
            console.log('');
        }

        console.log(`🎉 Correction terminée !`);
        console.log(`📊 Total: ${totalFixed} appels API corrigés dans ${files.length} fichiers`);

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixAllPagesAuth(); 