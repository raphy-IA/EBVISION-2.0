// Script de correction complète pour opportunities.html
// Corrige tous les problèmes et recrée le fichier proprement

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION COMPLÈTE OPPORTUNITIES.HTML');
console.log('==========================================');

const filePath = path.join(__dirname, '../public/opportunities.html');

try {
    // Lire le fichier
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('📁 Fichier lu avec succès');
    
    // Supprimer les caractères BOM au début
    content = content.replace(/^\uFEFF/, '');
    console.log('✅ Caractères BOM supprimés');
    
    // Corriger la fonction formatCurrency qui a des erreurs de syntaxe
    const oldFormatCurrency = /function formatCurrency\(value, currency = 'EUR', value, currency = 'EUR'\.devise \|\| "EUR"\) \{[\s\S]*?\}/;
    
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
    
    if (oldFormatCurrency.test(content)) {
        content = content.replace(oldFormatCurrency, newFormatCurrency);
        console.log('✅ Fonction formatCurrency corrigée');
    } else {
        console.log('⚠️ Fonction formatCurrency non trouvée avec le pattern attendu');
        
        // Essayer une approche plus simple
        const simpleReplace = content.replace(
            /function formatCurrency\([^)]*\)\s*\{[^}]*\}/,
            newFormatCurrency
        );
        
        if (simpleReplace !== content) {
            content = simpleReplace;
            console.log('✅ Fonction formatCurrency corrigée (approche simple)');
        } else {
            console.log('⚠️ Impossible de trouver la fonction formatCurrency');
        }
    }
    
    // Corriger les appels à formatCurrency dans displayOpportunities
    content = content.replace(
        /formatCurrency\(opp\.montant_estime, opp\.montant_estime\.devise \|\| "EUR"\)/g,
        'formatCurrency(opp.montant_estime, opp.devise || "EUR")'
    );
    
    // Corriger les appels à formatCurrency dans updateSummary
    content = content.replace(
        /formatCurrency\(amount, amount\.devise \|\| "EUR"\)/g,
        'formatCurrency(amount, currency)'
    );
    
    content = content.replace(
        /formatCurrency\(amount \* \(probability \/ 100, amount \* \(probability \/ 100\.devise \|\| "EUR"\)\)/g,
        'formatCurrency(amount * (probability / 100), currency)'
    );
    
    // Corriger les appels à formatCurrency dans viewOpportunity
    content = content.replace(
        /formatCurrency\(opp\.montant_estime, opp\.montant_estime\.devise \|\| "EUR"\)/g,
        'formatCurrency(opp.montant_estime, opp.devise || "EUR")'
    );
    
    // Écrire le fichier corrigé
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fichier corrigé et sauvegardé');
    
    console.log('\n🎯 CORRECTIONS APPLIQUÉES:');
    console.log('   - Caractères BOM supprimés');
    console.log('   - Fonction formatCurrency corrigée');
    console.log('   - Appels à formatCurrency corrigés');
    console.log('   - Gestion d\'erreur pour les devises non reconnues');
    
} catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
} 