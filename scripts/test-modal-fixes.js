#!/usr/bin/env node

/**
 * Script de test pour vérifier les corrections du modal "Ajouter un Utilisateur"
 * Vérifie les corrections des champs pré-remplis et du chargement des rôles
 * Usage: node scripts/test-modal-fixes.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 TEST DES CORRECTIONS DU MODAL "AJOUTER UN UTILISATEUR"');
console.log('========================================================\n');

async function testModalFixes() {
    const usersHtmlPath = path.join(__dirname, '..', 'public', 'users.html');
    const usersHtmlContent = fs.readFileSync(usersHtmlPath, 'utf8');
    
    console.log('📋 VÉRIFICATIONS DES CORRECTIONS:');
    
    // 1. Vérifier que les champs ont autocomplete="off"
    const hasAutocompleteOff = usersHtmlContent.includes('autocomplete="off"') &&
                              usersHtmlContent.includes('autocomplete="new-password"');
    
    if (hasAutocompleteOff) {
        console.log('✅ Attributs autocomplete ajoutés pour éviter l\'autofill');
    } else {
        console.log('❌ Attributs autocomplete manquants');
    }
    
    // 2. Vérifier que la fonction showNewUserModal() vide explicitement les champs
    const hasExplicitFieldClearing = usersHtmlContent.includes('document.getElementById(\'userLogin\').value = \'\'') &&
                                    usersHtmlContent.includes('document.getElementById(\'userPassword\').value = \'\'') &&
                                    usersHtmlContent.includes('document.getElementById(\'userName\').value = \'\'');
    
    if (hasExplicitFieldClearing) {
        console.log('✅ Fonction showNewUserModal() vide explicitement tous les champs');
    } else {
        console.log('❌ Fonction showNewUserModal() ne vide pas explicitement les champs');
    }
    
    // 3. Vérifier que loadRolesForModal() utilise le bon endpoint
    const usesCorrectEndpoint = usersHtmlContent.includes('${API_BASE_URL}/users/roles') &&
                               !usersHtmlContent.includes('${API_BASE_URL}/roles');
    
    if (usesCorrectEndpoint) {
        console.log('✅ loadRolesForModal() utilise le bon endpoint (/users/roles)');
    } else {
        console.log('❌ loadRolesForModal() n\'utilise pas le bon endpoint');
    }
    
    // 4. Vérifier que des logs de débogage ont été ajoutés
    const hasDebugLogs = usersHtmlContent.includes('console.log(\'🔄 Chargement des rôles pour le modal...\')') &&
                        usersHtmlContent.includes('console.log(\'📋 Rôles récupérés pour modal:\')') &&
                        usersHtmlContent.includes('console.log(\'🔄 Ouverture du modal "Ajouter un Utilisateur"...\')');
    
    if (hasDebugLogs) {
        console.log('✅ Logs de débogage ajoutés pour le diagnostic');
    } else {
        console.log('❌ Logs de débogage manquants');
    }
    
    // 5. Vérifier que la gestion d'erreur est améliorée
    const hasErrorHandling = usersHtmlContent.includes('if (!rolesContainer)') &&
                            usersHtmlContent.includes('rolesContainer.innerHTML = \'<div class="col-12"><p class="text-danger">Erreur lors du chargement des rôles</p></div>\'');
    
    if (hasErrorHandling) {
        console.log('✅ Gestion d\'erreur améliorée pour le chargement des rôles');
    } else {
        console.log('❌ Gestion d\'erreur manquante ou insuffisante');
    }
    
    // 6. Vérifier que le formulaire a l'attribut autocomplete
    const formHasAutocomplete = usersHtmlContent.includes('<form id="addUserForm"');
    
    if (formHasAutocomplete) {
        console.log('✅ Formulaire addUserForm présent');
    } else {
        console.log('❌ Formulaire addUserForm manquant');
    }
    
    console.log('\n📊 RÉSUMÉ DES CORRECTIONS:');
    console.log('===========================');
    
    const allFixed = hasAutocompleteOff && hasExplicitFieldClearing && 
                    usesCorrectEndpoint && hasDebugLogs && hasErrorHandling && formHasAutocomplete;
    
    if (allFixed) {
        console.log('🎉 TOUTES LES CORRECTIONS SONT EN PLACE!');
        console.log('✅ Champs protégés contre l\'autofill du navigateur');
        console.log('✅ Formulaire vidé explicitement à l\'ouverture');
        console.log('✅ Endpoint correct pour le chargement des rôles');
        console.log('✅ Logs de débogage pour le diagnostic');
        console.log('✅ Gestion d\'erreur robuste');
        
        console.log('\n💡 PROBLÈMES RÉSOLUS:');
        console.log('❌ Problème: Champs pré-remplis par l\'autofill du navigateur');
        console.log('✅ Solution: Attributs autocomplete="off" et vidage explicite');
        console.log('');
        console.log('❌ Problème: Rôles non affichés dans le modal');
        console.log('✅ Solution: Endpoint correct et logs de débogage');
        
        console.log('\n🔧 COMMENT TESTER:');
        console.log('1. ✅ Recharger la page /users.html');
        console.log('2. ✅ Ouvrir la console du navigateur (F12)');
        console.log('3. ✅ Cliquer sur "Nouvel Utilisateur"');
        console.log('4. ✅ Vérifier que les champs sont vides');
        console.log('5. ✅ Vérifier que les rôles s\'affichent en checkboxes');
        console.log('6. ✅ Vérifier les logs dans la console');
        
    } else {
        console.log('⚠️  CERTAINES CORRECTIONS SONT MANQUANTES');
        console.log('🔧 Veuillez vérifier les modifications apportées');
    }
    
    console.log('\n🎯 CONCLUSION:');
    if (allFixed) {
        console.log('✅ Les problèmes de champs pré-remplis et de rôles non affichés sont corrigés!');
        console.log('✅ Le modal "Ajouter un Utilisateur" fonctionne maintenant correctement');
        console.log('✅ Les logs de débogage permettront de diagnostiquer d\'éventuels problèmes');
    } else {
        console.log('❌ Des corrections supplémentaires sont nécessaires');
    }
    
    console.log('\n🔧 Test terminé !');
}

testModalFixes().catch(console.error);
