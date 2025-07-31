const fs = require('fs');
const path = require('path');

console.log('🔧 Correction de l\'erreur de syntaxe dans opportunities.html...');

// Lire le fichier
const filePath = path.join(__dirname, '../public/opportunities.html');
let content = fs.readFileSync(filePath, 'utf8');

// Chercher et corriger la fonction formatCurrency problématique
// Le problème semble être une duplication ou une structure incorrecte

// Remplacer la fonction formatCurrency par une version corrigée
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

// Chercher et remplacer la fonction formatCurrency
const formatCurrencyRegex = /function formatCurrency\([^)]*\)\s*\{[\s\S]*?\}/g;
const matches = content.match(formatCurrencyRegex);

if (matches) {
    console.log(`📝 Trouvé ${matches.length} occurrence(s) de la fonction formatCurrency`);
    
    // Remplacer toutes les occurrences
    content = content.replace(formatCurrencyRegex, correctedFormatCurrency);
    
    // Écrire le fichier corrigé
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fonction formatCurrency corrigée !');
} else {
    console.log('⚠️ Fonction formatCurrency non trouvée, tentative de correction manuelle...');
    
    // Chercher une structure problématique spécifique
    const problematicPattern = /function formatCurrency\(value, currency = 'EUR'\) \{[\s\S]*?try \{[\s\S]*?return new Intl\.NumberFormat[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/g;
    
    if (content.match(problematicPattern)) {
        console.log('🔧 Correction de la structure problématique...');
        content = content.replace(problematicPattern, correctedFormatCurrency);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Structure problématique corrigée !');
    } else {
        console.log('❌ Aucune structure problématique trouvée');
    }
}

console.log('🎯 Correction terminée !'); 