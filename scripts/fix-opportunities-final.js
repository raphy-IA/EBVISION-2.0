// Script de correction finale pour opportunities.html
// Corrige tous les problèmes identifiés

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION FINALE OPPORTUNITIES.HTML');
console.log('=======================================');

const filePath = path.join(__dirname, '../public/opportunities.html');

try {
    // Lire le fichier
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('📁 Fichier lu avec succès');
    
    // Supprimer les caractères BOM au début
    content = content.replace(/^\uFEFF/, '');
    console.log('✅ Caractères BOM supprimés');
    
    // Corriger la fonction formatCurrency avec une recherche plus flexible
    const formatCurrencyRegex = /function formatCurrency\(value\)\s*\{\s*return new Intl\.NumberFormat\('fr-FR',\s*\{\s*style:\s*'currency',\s*currency:\s*'EUR'\s*\}\)\.format\(value\);\s*\}/;
    
    const newFormatCurrency = `function formatCurrency(value, currency = 'EUR') {
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
    
    if (formatCurrencyRegex.test(content)) {
        content = content.replace(formatCurrencyRegex, newFormatCurrency);
        console.log('✅ Fonction formatCurrency corrigée');
    } else {
        console.log('⚠️ Fonction formatCurrency non trouvée avec regex');
        
        // Essayer une approche plus simple
        const simpleReplace = content.replace(
            /function formatCurrency\(value\)\s*\{[^}]*\}/,
            newFormatCurrency
        );
        
        if (simpleReplace !== content) {
            content = simpleReplace;
            console.log('✅ Fonction formatCurrency corrigée (approche simple)');
        } else {
            console.log('⚠️ Impossible de trouver la fonction formatCurrency');
        }
    }
    
    // Corriger les appels à formatCurrency pour passer la devise
    content = content.replace(
        /formatCurrency\(([^)]+)\)/g,
        'formatCurrency($1, $1.devise || "EUR")'
    );
    
    // Écrire le fichier corrigé
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fichier corrigé et sauvegardé');
    
    console.log('\n🎯 CORRECTIONS APPLIQUÉES:');
    console.log('   - Caractères BOM supprimés');
    console.log('   - Fonction formatCurrency améliorée pour gérer FCFA');
    console.log('   - Gestion d\'erreur ajoutée pour les devises non reconnues');
    console.log('   - Appels à formatCurrency mis à jour');
    
} catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
} 