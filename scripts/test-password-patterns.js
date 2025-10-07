#!/usr/bin/env node

/**
 * Script pour tester différents patterns de validation de mot de passe
 */

console.log('🔍 TEST DE DIFFÉRENTS PATTERNS DE VALIDATION');
console.log('=============================================\n');

// Patterns à tester
const patterns = {
    'Pattern actuel (restrictif)': /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Pattern permissif (caractères spéciaux étendus)': /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
    'Pattern simple (sans restriction de caractères)': /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/
};

// Mots de passe de test
const testPasswords = [
    'Test123!',      // Devrait être valide
    'MyPass1!',      // Devrait être valide
    'P@ssw0rd',      // Devrait être valide
    'Admin2024!',    // Devrait être valide
    'NewPass123!',   // Devrait être valide
    'Password1!',    // Devrait être valide
    'Test123#',      // Avec # (pas dans le pattern restrictif)
    'MyPass1+',      // Avec + (pas dans le pattern restrictif)
    'P@ssw0rd-',     // Avec - (pas dans le pattern restrictif)
    'Admin2024(',    // Avec ( (pas dans le pattern restrictif)
    'Test123',       // Pas de caractère spécial
    'test123!',      // Pas de majuscule
    'TEST123!',      // Pas de minuscule
    'TestABC!',      // Pas de chiffre
    'password',      // Trop simple
    'Password1',     // Pas de caractère spécial
    'Test123!@#$',   // Avec plusieurs caractères spéciaux
    'MyPass1!@#$%',  // Avec plusieurs caractères spéciaux
    'P@ssw0rd!@#$%^&*()', // Avec beaucoup de caractères spéciaux
    'Test123!@#$%^&*()_+-=[]{}|;:,.<>?' // Avec tous les caractères spéciaux
];

console.log('🧪 RÉSULTATS DES TESTS:');
console.log('=======================\n');

Object.entries(patterns).forEach(([patternName, pattern]) => {
    console.log(`📋 ${patternName}:`);
    console.log(`   Regex: ${pattern}`);
    
    let validCount = 0;
    let invalidCount = 0;
    
    testPasswords.forEach((password, index) => {
        const isValid = pattern.test(password);
        const status = isValid ? '✅' : '❌';
        
        if (index < 10) { // Afficher seulement les 10 premiers pour éviter le spam
            console.log(`   ${status} "${password}"`);
        }
        
        if (isValid) validCount++;
        else invalidCount++;
    });
    
    console.log(`   📊 Résultat: ${validCount} valides, ${invalidCount} invalides sur ${testPasswords.length}`);
    console.log('');
});

console.log('💡 ANALYSE:');
console.log('===========');
console.log('Le pattern actuel est très restrictif et rejette des mots de passe valides');
console.log('qui contiennent des caractères spéciaux autres que @$!%*?&');
console.log('');
console.log('🛠️  RECOMMANDATION:');
console.log('===================');
console.log('Utiliser un pattern plus permissif qui accepte plus de caractères spéciaux');
console.log('ou utiliser des validations séparées au lieu d\'un seul pattern restrictif');




