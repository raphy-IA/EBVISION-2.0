const fs = require('fs');
const path = require('path');

// Lire le fichier opportunities.html
const filePath = path.join(__dirname, '../public/opportunities.html');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔍 Analyse du fichier opportunities.html...');

// Chercher spécifiquement les blocs try sans catch
const tryWithoutCatchPattern = /try\s*\{[^}]*\}\s*(?!catch|finally)/g;
const matches = content.match(tryWithoutCatchPattern);

if (matches) {
    console.log(`❌ Trouvé ${matches.length} bloc(s) try sans catch !`);
    matches.forEach((match, index) => {
        console.log(`Bloc ${index + 1}:`, match.substring(0, 100) + '...');
    });
    
    // Chercher la fonction formatCurrency spécifiquement
    const formatCurrencyPattern = /function formatCurrency\([^)]*\)\s*\{[\s\S]*?\}/g;
    const formatCurrencyMatches = content.match(formatCurrencyPattern);
    
    if (formatCurrencyMatches) {
        console.log('🔧 Correction de la fonction formatCurrency...');
        
        // Remplacer par une version corrigée
        const correctedFunction = `function formatCurrency(value, currency = 'EUR') {
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
        
        // Remplacer toutes les occurrences de la fonction formatCurrency
        content = content.replace(formatCurrencyPattern, correctedFunction);
        
        // Écrire le fichier corrigé
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Fonction formatCurrency corrigée !');
    }
} else {
    console.log('✅ Aucun bloc try sans catch trouvé');
}

// Vérifier s'il y a d'autres erreurs de syntaxe
const syntaxErrors = [
    /try\s*\{[^}]*\}[^}]*\}/g,  // try avec accolade fermante en double
    /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}[^}]*\}/g  // fonction avec accolade fermante en double
];

syntaxErrors.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
        console.log(`⚠️ Erreur de syntaxe potentielle ${index + 1} trouvée`);
    }
});

console.log('🎯 Analyse terminée !'); 