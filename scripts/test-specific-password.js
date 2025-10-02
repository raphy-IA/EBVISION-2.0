#!/usr/bin/env node

/**
 * Script pour tester un mot de passe spécifique
 */

console.log('🔍 TEST D\'UN MOT DE PASSE SPÉCIFIQUE');
console.log('=====================================\n');

// Demander à l'utilisateur de saisir son mot de passe
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Veuillez saisir le mot de passe que vous essayez d\'utiliser: ', (password) => {
    console.log(`\n🧪 TEST DU MOT DE PASSE: "${password}"`);
    console.log('=====================================\n');

    // Pattern utilisé dans le frontend et backend
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

    // Tests détaillés
    const length = password.length;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);
    const isValidPattern = passwordPattern.test(password);

    console.log('📋 ANALYSE DÉTAILLÉE:');
    console.log('=====================');
    console.log(`Mot de passe: "${password}"`);
    console.log(`Longueur: ${length} caractères ${length >= 8 ? '✅' : '❌'} (minimum 8)`);
    console.log(`Contient minuscule: ${hasLower ? '✅' : '❌'}`);
    console.log(`Contient majuscule: ${hasUpper ? '✅' : '❌'}`);
    console.log(`Contient chiffre: ${hasDigit ? '✅' : '❌'}`);
    console.log(`Contient caractère spécial (@$!%*?&): ${hasSpecial ? '✅' : '❌'}`);
    console.log(`Pattern complet: ${isValidPattern ? '✅ VALIDE' : '❌ INVALIDE'}\n`);

    // Vérifier les caractères spéciaux présents
    const specialChars = password.match(/[@$!%*?&]/g);
    if (specialChars) {
        console.log(`Caractères spéciaux trouvés: ${specialChars.join(', ')}`);
    } else {
        console.log('❌ Aucun caractère spécial autorisé trouvé');
    }

    // Vérifier s'il y a d'autres caractères spéciaux
    const otherSpecialChars = password.match(/[^A-Za-z\d@$!%*?&]/g);
    if (otherSpecialChars) {
        console.log(`⚠️  Autres caractères spéciaux trouvés: ${otherSpecialChars.join(', ')}`);
        console.log('   Ces caractères ne sont pas autorisés par le pattern actuel');
    }

    // Test avec un pattern plus permissif
    const permissivePattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
    const isValidPermissive = permissivePattern.test(password);
    
    console.log(`\n🔍 TEST AVEC PATTERN PERMISSIF:`);
    console.log('===============================');
    console.log(`Pattern permissif: ${isValidPermissive ? '✅ VALIDE' : '❌ INVALIDE'}`);

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (isValidPattern) {
        console.log('✅ Votre mot de passe respecte toutes les exigences !');
        console.log('   Le problème pourrait venir d\'ailleurs (frontend, backend, etc.)');
    } else {
        console.log('❌ Votre mot de passe ne respecte pas toutes les exigences.');
        console.log('   Voici ce qui manque:');
        
        if (length < 8) console.log('   • Longueur insuffisante (minimum 8 caractères)');
        if (!hasLower) console.log('   • Pas de minuscule');
        if (!hasUpper) console.log('   • Pas de majuscule');
        if (!hasDigit) console.log('   • Pas de chiffre');
        if (!hasSpecial) console.log('   • Pas de caractère spécial (@$!%*?&)');
        
        console.log('\n   Exemples de mots de passe valides:');
        console.log('   • Test123!');
        console.log('   • MyPass1!');
        console.log('   • P@ssw0rd');
        console.log('   • Admin2024!');
    }

    rl.close();
});
