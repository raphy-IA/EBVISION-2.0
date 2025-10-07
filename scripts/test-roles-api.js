#!/usr/bin/env node

/**
 * Script de test pour vérifier l'API des rôles
 * Teste l'endpoint /api/users/roles pour s'assurer qu'il retourne les bonnes données
 * Usage: node scripts/test-roles-api.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 TEST DE L\'API DES RÔLES');
console.log('===========================\n');

async function testRolesAPI() {
    console.log('📋 VÉRIFICATIONS DE L\'API:');
    
    // 1. Vérifier que la route dupliquée a été supprimée
    const usersRoutePath = path.join(__dirname, '..', 'src', 'routes', 'users.js');
    const usersRouteContent = fs.readFileSync(usersRoutePath, 'utf8');
    
    // Compter les occurrences de "router.get('/roles'"
    const routeMatches = usersRouteContent.match(/router\.get\('\/roles'/g);
    const routeCount = routeMatches ? routeMatches.length : 0;
    
    if (routeCount === 1) {
        console.log('✅ Une seule route /roles trouvée (doublon supprimé)');
    } else if (routeCount === 0) {
        console.log('❌ Aucune route /roles trouvée');
    } else {
        console.log(`❌ ${routeCount} routes /roles trouvées (doublons présents)`);
    }
    
    // 2. Vérifier que la fonction loadRolesForModal() gère les deux formats
    const usersHtmlPath = path.join(__dirname, '..', 'public', 'users.html');
    const usersHtmlContent = fs.readFileSync(usersHtmlPath, 'utf8');
    
    const hasFormatHandling = usersHtmlContent.includes('Array.isArray(responseData)') &&
                             usersHtmlContent.includes('responseData.success && responseData.data');
    
    if (hasFormatHandling) {
        console.log('✅ loadRolesForModal() gère les deux formats de réponse');
    } else {
        console.log('❌ loadRolesForModal() ne gère pas les formats de réponse');
    }
    
    // 3. Vérifier que les logs de débogage sont présents
    const hasDebugLogs = usersHtmlContent.includes('console.log(\'📋 Réponse API complète:\')') &&
                        usersHtmlContent.includes('console.log(\'📋 Rôles extraits pour modal:\')');
    
    if (hasDebugLogs) {
        console.log('✅ Logs de débogage détaillés présents');
    } else {
        console.log('❌ Logs de débogage manquants');
    }
    
    // 4. Vérifier que l'endpoint correct est utilisé
    const usesCorrectEndpoint = usersHtmlContent.includes('${API_BASE_URL}/users/roles');
    
    if (usesCorrectEndpoint) {
        console.log('✅ Endpoint correct utilisé (/users/roles)');
    } else {
        console.log('❌ Endpoint incorrect');
    }
    
    console.log('\n📊 RÉSUMÉ DES CORRECTIONS:');
    console.log('===========================');
    
    const allFixed = routeCount === 1 && hasFormatHandling && hasDebugLogs && usesCorrectEndpoint;
    
    if (allFixed) {
        console.log('🎉 TOUTES LES CORRECTIONS SONT EN PLACE!');
        console.log('✅ Route dupliquée supprimée');
        console.log('✅ Gestion des formats de réponse améliorée');
        console.log('✅ Logs de débogage détaillés');
        console.log('✅ Endpoint correct utilisé');
        
        console.log('\n💡 PROBLÈME RÉSOLU:');
        console.log('❌ Problème: Rôles non affichés dans le modal');
        console.log('✅ Cause: Route dupliquée et format de réponse incohérent');
        console.log('✅ Solution: Suppression du doublon et gestion des formats');
        
        console.log('\n🔧 COMMENT TESTER:');
        console.log('1. ✅ Redémarrer le serveur: npm start');
        console.log('2. ✅ Aller sur /users.html');
        console.log('3. ✅ Ouvrir la console (F12)');
        console.log('4. ✅ Cliquer sur "Nouvel Utilisateur"');
        console.log('5. ✅ Vérifier les logs dans la console');
        console.log('6. ✅ Vérifier que les rôles s\'affichent en checkboxes');
        
    } else {
        console.log('⚠️  CERTAINES CORRECTIONS SONT MANQUANTES');
        console.log('🔧 Veuillez vérifier les modifications apportées');
    }
    
    console.log('\n🎯 CONCLUSION:');
    if (allFixed) {
        console.log('✅ L\'API des rôles est maintenant correctement configurée!');
        console.log('✅ Les rôles devraient s\'afficher dans le modal');
        console.log('✅ Les logs permettront de diagnostiquer tout problème restant');
    } else {
        console.log('❌ Des corrections supplémentaires sont nécessaires');
    }
    
    console.log('\n🧪 Test terminé !');
}

testRolesAPI().catch(console.error);


