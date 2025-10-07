#!/usr/bin/env node

/**
 * Script pour déboguer la validation des mots de passe
 */

console.log('🔍 DÉBOGAGE DE LA VALIDATION DES MOTS DE PASSE');
console.log('==============================================\n');

// Pattern utilisé dans le frontend et backend
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

console.log('📋 PATTERN DE VALIDATION:');
console.log('=========================');
console.log(`Regex: ${passwordPattern}`);
console.log('Exigences:');
console.log('• Au moins une minuscule (a-z)');
console.log('• Au moins une majuscule (A-Z)');
console.log('• Au moins un chiffre (0-9)');
console.log('• Au moins un caractère spécial (@$!%*?&)');
console.log('• Au moins 8 caractères\n');

// Mots de passe de test
const testPasswords = [
    'Test123!',      // Devrait être valide
    'MyPass1!',      // Devrait être valide
    'P@ssw0rd',      // Devrait être valide
    'Admin2024!',    // Devrait être valide
    'NewPass123!',   // Devrait être valide
    'Password1!',    // Devrait être valide
    'Test123',       // Pas de caractère spécial
    'test123!',      // Pas de majuscule
    'TEST123!',      // Pas de minuscule
    'TestABC!',      // Pas de chiffre
    'password',      // Trop simple
    'Password1',     // Pas de caractère spécial
    'P@ssw0rd!',     // Devrait être valide
    'MyNewPass1!',   // Devrait être valide
    'Secure123!',    // Devrait être valide
    'TempPass123!',  // Devrait être valide
    'User123!',      // Devrait être valide
    'Change123!',    // Devrait être valide
    'Update123!',    // Devrait être valide
    'Modify123!'     // Devrait être valide
];

console.log('🧪 TEST DES MOTS DE PASSE:');
console.log('==========================');

let validCount = 0;
let invalidCount = 0;

testPasswords.forEach((password, index) => {
    const isValid = passwordPattern.test(password);
    const status = isValid ? '✅' : '❌';
    const length = password.length;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);
    
    console.log(`${index + 1}. ${status} "${password}"`);
    console.log(`   Longueur: ${length} ${length >= 8 ? '✅' : '❌'}`);
    console.log(`   Minuscule: ${hasLower ? '✅' : '❌'}`);
    console.log(`   Majuscule: ${hasUpper ? '✅' : '❌'}`);
    console.log(`   Chiffre: ${hasDigit ? '✅' : '❌'}`);
    console.log(`   Spécial: ${hasSpecial ? '✅' : '❌'}`);
    console.log('');
    
    if (isValid) validCount++;
    else invalidCount++;
});

console.log('📊 RÉSUMÉ:');
console.log('==========');
console.log(`✅ Mots de passe valides: ${validCount}`);
console.log(`❌ Mots de passe invalides: ${invalidCount}`);
console.log(`📈 Total testé: ${testPasswords.length}`);

console.log('\n💡 MOTS DE PASSE RECOMMANDÉS:');
console.log('==============================');
const validPasswords = testPasswords.filter(p => passwordPattern.test(p));
validPasswords.forEach((password, index) => {
    console.log(`${index + 1}. "${password}"`);
});

console.log('\n🔍 ANALYSE DU PATTERN:');
console.log('======================');
console.log('Le pattern actuel est très strict et peut rejeter certains mots de passe valides.');
console.log('Problèmes potentiels:');
console.log('1. Le pattern exige que TOUS les caractères soient dans [A-Za-z\\d@$!%*?&]');
console.log('2. Cela exclut d\'autres caractères spéciaux comme #, +, -, etc.');
console.log('3. Le pattern pourrait être trop restrictif');

console.log('\n🛠️  SUGGESTIONS D\'AMÉLIORATION:');
console.log('=================================');
console.log('1. Utiliser un pattern plus permissif pour les caractères spéciaux');
console.log('2. Ou utiliser des validations séparées au lieu d\'un seul pattern');
console.log('3. Tester avec le mot de passe exact que vous utilisez');




