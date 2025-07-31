const fs = require('fs');
const path = require('path');

console.log('🔧 Correction de l\'erreur de syntaxe JavaScript...');

// Lire le fichier
const filePath = path.join(__dirname, '../public/opportunities.html');
let content = fs.readFileSync(filePath, 'utf8');

// Chercher et corriger la fonction formatCurrency problématique
// Le problème semble être une structure try/catch mal formée

// Remplacer la fonction formatCurrency par une version corrigée
const correctedFunction = `function formatCurrency(value, currency = 'EUR') {
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
        return \`\${value} \${currency}\`;
    }
}`;

// Chercher et remplacer toutes les occurrences de la fonction formatCurrency
const formatCurrencyRegex = /function formatCurrency\([^)]*\)\s*\{[\s\S]*?\}/g;
const matches = content.match(formatCurrencyRegex);

if (matches) {
    console.log(`📝 Trouvé ${matches.length} occurrence(s) de la fonction formatCurrency`);
    content = content.replace(formatCurrencyRegex, correctedFunction);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fonction formatCurrency corrigée !');
} else {
    console.log('⚠️ Fonction formatCurrency non trouvée');
}

console.log('🎯 Correction terminée !'); 