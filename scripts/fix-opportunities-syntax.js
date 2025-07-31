const fs = require('fs');
const path = require('path');

// Lire le fichier opportunities.html
const filePath = path.join(__dirname, '../public/opportunities.html');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔍 Recherche de l\'erreur de syntaxe dans opportunities.html...');

// Chercher la fonction formatCurrency qui semble avoir un problème
const formatCurrencyPattern = /function formatCurrency\(value, currency = 'EUR'\) \{[\s\S]*?\}/g;
const matches = content.match(formatCurrencyPattern);

if (matches) {
    console.log('📝 Fonction formatCurrency trouvée, vérification de la syntaxe...');
    
    // Chercher spécifiquement le problème avec try/catch
    const tryCatchPattern = /try\s*\{[\s\S]*?\}\s*(?!catch|finally)/g;
    const tryWithoutCatch = content.match(tryCatchPattern);
    
    if (tryWithoutCatch) {
        console.log('❌ Bloc try sans catch trouvé !');
        console.log('🔧 Correction en cours...');
        
        // Remplacer la fonction formatCurrency problématique
        const correctedFormatCurrency = `function formatCurrency(value, currency = 'EUR') {
            // Gestion des devises non standard
            const currencyMap = {
                'FCFA': 'XOF',
                'CFA': 'XOF',
                'XAF': 'XOF'
            };
            
            const mappedCurrency = currencyMap[currency] || currency;
            
            try {
                return new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: mappedCurrency 
                }).format(value);
            } catch (error) {
                // Fallback pour les devises non reconnues
                return \`\${value} \${currency}\`;
            }
        }`;
        
        // Remplacer la fonction problématique
        const oldFormatCurrencyPattern = /function formatCurrency\(value, currency = 'EUR'\) \{[\s\S]*?\}/g;
        content = content.replace(oldFormatCurrencyPattern, correctedFormatCurrency);
        
        // Écrire le fichier corrigé
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Fichier opportunities.html corrigé avec succès !');
    } else {
        console.log('✅ Aucun bloc try sans catch trouvé');
    }
} else {
    console.log('⚠️ Fonction formatCurrency non trouvée');
}

console.log('🎯 Correction terminée !'); 