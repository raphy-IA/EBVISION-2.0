// Script de correction pour opportunities.html
// Corrige la fonction formatCurrency et les caractères BOM

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION OPPORTUNITIES.HTML');
console.log('================================');

const filePath = path.join(__dirname, '../public/opportunities.html');

try {
    // Lire le fichier
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('📁 Fichier lu avec succès');
    
    // Supprimer les caractères BOM au début
    content = content.replace(/^\uFEFF/, '');
    console.log('✅ Caractères BOM supprimés');
    
    // Corriger la fonction formatCurrency
    const oldFormatCurrency = `function formatCurrency(value) {
            return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
        }`;
    
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
    
    if (content.includes(oldFormatCurrency)) {
        content = content.replace(oldFormatCurrency, newFormatCurrency);
        console.log('✅ Fonction formatCurrency corrigée');
    } else {
        console.log('⚠️ Fonction formatCurrency non trouvée dans le format attendu');
    }
    
    // Écrire le fichier corrigé
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fichier corrigé et sauvegardé');
    
    console.log('\n🎯 CORRECTIONS APPLIQUÉES:');
    console.log('   - Caractères BOM supprimés');
    console.log('   - Fonction formatCurrency améliorée pour gérer FCFA');
    console.log('   - Gestion d\'erreur ajoutée pour les devises non reconnues');
    
} catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
} 