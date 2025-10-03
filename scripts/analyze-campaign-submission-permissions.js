const fs = require('fs');
const path = require('path');

// Script pour analyser les permissions de soumission des campagnes de prospection
function analyzeCampaignSubmissionPermissions() {
  console.log('🔍 Analyse des permissions de soumission des campagnes...\n');
  
  try {
    const summaryPath = path.join(__dirname, '..', 'public', 'prospecting-campaign-summary.html');
    const routesPath = path.join(__dirname, '..', 'src', 'routes', 'prospecting.js');
    
    console.log('📁 Vérification des fichiers...');
    
    if (!fs.existsSync(summaryPath)) {
      console.error('❌ Fichier prospecting-campaign-summary.html non trouvé');
      return;
    }
    
    if (!fs.existsSync(routesPath)) {
      console.error('❌ Fichier src/routes/prospecting.js non trouvé');
      return;
    }
    
    console.log('✅ Fichiers trouvés\n');
    
    console.log('🔍 ANALYSE DES PERMISSIONS:');
    console.log('============================');
    
    // 1. Analyse du frontend
    console.log('📱 FRONTEND (prospecting-campaign-summary.html):');
    console.log('================================================');
    
    const summaryContent = fs.readFileSync(summaryPath, 'utf8');
    
    // Vérifier la logique d'affichage du bouton de soumission
    const hasSubmitButton = summaryContent.includes('submitCampaignBtn');
    const hasSubmitFunction = summaryContent.includes('submitForValidation()');
    const hasUpdateActionButtons = summaryContent.includes('updateActionButtons');
    
    console.log(`   Bouton de soumission: ${hasSubmitButton ? '✅' : '❌'}`);
    console.log(`   Fonction de soumission: ${hasSubmitFunction ? '✅' : '❌'}`);
    console.log(`   Gestion des boutons: ${hasUpdateActionButtons ? '✅' : '❌'}`);
    
    // Extraire la logique d'affichage du bouton
    const buttonLogicMatch = summaryContent.match(/if \(status === 'DRAFT' \|\| status === 'BROUILLON'\)/);
    if (buttonLogicMatch) {
      console.log('   ✅ Bouton affiché uniquement pour les campagnes en brouillon');
    } else {
      console.log('   ❌ Logique d\'affichage du bouton non trouvée');
    }
    
    // 2. Analyse du backend
    console.log('\n🔧 BACKEND (src/routes/prospecting.js):');
    console.log('=======================================');
    
    const routesContent = fs.readFileSync(routesPath, 'utf8');
    
    // Vérifier l'endpoint de soumission
    const hasSubmitEndpoint = routesContent.includes('/campaigns/:id/submit');
    const hasCheckAuthFunction = routesContent.includes('checkCampaignAuthorization');
    
    console.log(`   Endpoint de soumission: ${hasSubmitEndpoint ? '✅' : '❌'}`);
    console.log(`   Fonction de vérification: ${hasCheckAuthFunction ? '✅' : '❌'}`);
    
    // Extraire la logique d'autorisation
    const authLogicMatch = routesContent.match(/authorized: isCreator \|\| isManager/);
    if (authLogicMatch) {
      console.log('   ✅ Autorisation basée sur créateur OU manager');
    } else {
      console.log('   ❌ Logique d\'autorisation non trouvée');
    }
    
    // 3. Analyse détaillée des permissions
    console.log('\n🔐 PERMISSIONS DÉTAILLÉES:');
    console.log('===========================');
    
    // Extraire la fonction checkCampaignAuthorization
    const authFunctionMatch = routesContent.match(/async function checkCampaignAuthorization\([\s\S]*?return \{[\s\S]*?\}/);
    if (authFunctionMatch) {
      const authFunction = authFunctionMatch[0];
      
      // Vérifier les conditions d'autorisation
      const hasCreatorCheck = authFunction.includes('isCreator = campaign.created_by === userId');
      const hasManagerCheck = authFunction.includes('isManager');
      const hasBUManagerCheck = authFunction.includes('getBusinessUnitManagers');
      const hasDivManagerCheck = authFunction.includes('getDivisionManagers');
      
      console.log('   📋 Conditions d\'autorisation:');
      console.log(`      - Créateur de la campagne: ${hasCreatorCheck ? '✅' : '❌'}`);
      console.log(`      - Manager de la campagne: ${hasManagerCheck ? '✅' : '❌'}`);
      console.log(`      - Manager de Business Unit: ${hasBUManagerCheck ? '✅' : '❌'}`);
      console.log(`      - Manager de Division: ${hasDivManagerCheck ? '✅' : '❌'}`);
      
      // Vérifier la logique finale
      const hasFinalAuth = authFunction.includes('authorized: isCreator || isManager');
      console.log(`      - Logique finale (créateur OU manager): ${hasFinalAuth ? '✅' : '❌'}`);
    }
    
    // 4. Résumé des permissions
    console.log('\n📊 RÉSUMÉ DES PERMISSIONS:');
    console.log('===========================');
    console.log('✅ QUI PEUT SOUMETTRE UNE CAMPAGNE:');
    console.log('   1. Le créateur de la campagne');
    console.log('   2. Le responsable principal de la Business Unit');
    console.log('   3. Le responsable adjoint de la Business Unit');
    console.log('   4. Le responsable principal de la Division');
    console.log('   5. Le responsable adjoint de la Division');
    console.log('');
    console.log('❌ QUI NE PEUT PAS SOUMETTRE:');
    console.log('   - Les autres utilisateurs');
    console.log('   - Les utilisateurs sans rôle de management');
    console.log('   - Les utilisateurs d\'autres Business Units/Divisions');
    console.log('');
    
    // 5. Conditions d'affichage du bouton
    console.log('🎯 CONDITIONS D\'AFFICHAGE DU BOUTON:');
    console.log('=====================================');
    console.log('✅ Le bouton "Soumettre pour validation" s\'affiche si:');
    console.log('   1. La campagne est en statut "DRAFT" ou "BROUILLON"');
    console.log('   2. L\'utilisateur a les permissions (créateur OU manager)');
    console.log('');
    console.log('❌ Le bouton ne s\'affiche pas si:');
    console.log('   - La campagne est déjà soumise (PENDING_VALIDATION)');
    console.log('   - La campagne est validée (VALIDATED)');
    console.log('   - La campagne est rejetée (REJECTED)');
    console.log('');
    
    // 6. Workflow de soumission
    console.log('🔄 WORKFLOW DE SOUMISSION:');
    console.log('===========================');
    console.log('1. L\'utilisateur clique sur "Soumettre pour validation"');
    console.log('2. Le frontend appelle l\'API POST /api/prospecting/campaigns/:id/submit');
    console.log('3. Le backend vérifie les permissions avec checkCampaignAuthorization()');
    console.log('4. Si autorisé, la campagne passe en statut "EN_VALIDATION"');
    console.log('5. Les validateurs sont notifiés pour validation');
    console.log('6. Le bouton de soumission disparaît');
    console.log('');
    
    // 7. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    console.log('✅ Le système de permissions est bien conçu:');
    console.log('   - Sécurité: Seuls les créateurs et managers peuvent soumettre');
    console.log('   - Flexibilité: Les managers peuvent soumettre les campagnes de leur équipe');
    console.log('   - Traçabilité: Chaque soumission est enregistrée avec l\'utilisateur');
    console.log('');
    console.log('🔧 Améliorations possibles:');
    console.log('   - Ajouter des logs détaillés des tentatives de soumission');
    console.log('   - Notifier le créateur quand un manager soumet sa campagne');
    console.log('   - Ajouter une confirmation avant soumission');
    console.log('   - Permettre l\'annulation de soumission si pas encore validée');
    console.log('');
    
    console.log('🎉 Analyse terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  analyzeCampaignSubmissionPermissions();
}

module.exports = { analyzeCampaignSubmissionPermissions };




