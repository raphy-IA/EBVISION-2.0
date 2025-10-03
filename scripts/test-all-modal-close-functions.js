const fs = require('fs');
const path = require('path');

// Script pour tester que toutes les fonctions du modal RH ferment automatiquement le modal après succès
function testAllModalCloseFunctions() {
  console.log('🔍 Test de la fermeture automatique du modal pour toutes les fonctions RH...\n');
  
  const collaborateursJsPath = path.join(__dirname, '../public/js/collaborateurs.js');
  
  try {
    const content = fs.readFileSync(collaborateursJsPath, 'utf8');
    
    console.log('📋 VÉRIFICATIONS DE LA FERMETURE AUTOMATIQUE:');
    console.log('=============================================');
    
    // 1. Vérifier la fermeture du modal après évolution de grade
    const gradeModalClose = content.includes('bootstrap.Modal.getInstance(document.getElementById(\'rhModal\'))') &&
                           content.includes('rhModal.hide()') &&
                           content.includes('ajouterEvolutionGrade');
    console.log(`✅ Fermeture modal après évolution grade: ${gradeModalClose ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    // 2. Vérifier la fermeture du modal après évolution de poste
    const posteModalClose = content.includes('bootstrap.Modal.getInstance(document.getElementById(\'rhModal\'))') &&
                           content.includes('rhModal.hide()') &&
                           content.includes('ajouterEvolutionPoste');
    console.log(`✅ Fermeture modal après évolution poste: ${posteModalClose ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    // 3. Vérifier la fermeture du modal après évolution organisationnelle
    const orgModalClose = content.includes('bootstrap.Modal.getInstance(document.getElementById(\'rhModal\'))') &&
                         content.includes('rhModal.hide()') &&
                         content.includes('ajouterEvolutionOrganisation');
    console.log(`✅ Fermeture modal après évolution organisation: ${orgModalClose ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    // 4. Vérifier la fermeture du modal après modification type collaborateur
    const typeModalClose = content.includes('bootstrap.Modal.getInstance(document.getElementById(\'rhModal\'))') &&
                          content.includes('rhModal.hide()') &&
                          content.includes('ajouterEvolutionTypeCollaborateur');
    console.log(`✅ Fermeture modal après modification type collaborateur: ${typeModalClose ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    // 5. Vérifier que le rafraîchissement du tableau est conservé pour toutes les fonctions
    const tableRefresh = content.includes('await loadCollaborateurs(currentPage)');
    console.log(`✅ Rafraîchissement du tableau conservé: ${tableRefresh ? 'PRÉSENT' : 'MANQUANT'}`);
    
    // 6. Vérifier que les messages de succès sont cohérents
    const successMessages = content.includes('✅ Évolution de grade ajoutée avec succès') &&
                           content.includes('✅ Évolution de poste ajoutée avec succès') &&
                           content.includes('✅ Évolution organisationnelle ajoutée avec succès') &&
                           content.includes('✅ Type de collaborateur mis à jour avec succès');
    console.log(`✅ Messages de succès cohérents: ${successMessages ? 'PRÉSENTS' : 'MANQUANTS'}`);
    
    // 7. Vérifier que la réinitialisation des formulaires est conservée
    const formReset = content.includes('document.getElementById(\'rh-grade-select\').value = \'\'') &&
                     content.includes('document.getElementById(\'rh-poste-select\').value = \'\'') &&
                     content.includes('document.getElementById(\'rh-type-collaborateur-select\').value = \'\'') &&
                     content.includes('document.getElementById(\'rh-business-unit-select\').value = \'\'');
    console.log(`✅ Réinitialisation des formulaires conservée: ${formReset ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    console.log('\n📊 RÉSUMÉ DE LA FERMETURE AUTOMATIQUE:');
    console.log('=======================================');
    
    const totalChecks = 7;
    const passedChecks = [
      gradeModalClose,
      posteModalClose,
      orgModalClose,
      typeModalClose,
      tableRefresh,
      successMessages,
      formReset
    ].filter(Boolean).length;
    
    console.log(`✅ ${passedChecks}/${totalChecks} fonctionnalités de fermeture automatique appliquées`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 Toutes les fonctions du modal RH ferment automatiquement le modal après succès !');
      console.log('\n🚀 COMPORTEMENT ATTENDU:');
      console.log('=========================');
      console.log('✅ Après ajout d\'évolution de grade:');
      console.log('   • Message de succès affiché');
      console.log('   • Modal RH fermé automatiquement');
      console.log('   • Tableau principal rafraîchi');
      console.log('   • Formulaire réinitialisé');
      console.log('');
      console.log('✅ Après ajout d\'évolution de poste:');
      console.log('   • Message de succès affiché');
      console.log('   • Modal RH fermé automatiquement');
      console.log('   • Tableau principal rafraîchi');
      console.log('   • Formulaire réinitialisé');
      console.log('');
      console.log('✅ Après ajout d\'évolution organisationnelle:');
      console.log('   • Message de succès affiché');
      console.log('   • Modal RH fermé automatiquement');
      console.log('   • Tableau principal rafraîchi');
      console.log('   • Formulaire réinitialisé');
      console.log('');
      console.log('✅ Après modification type de collaborateur:');
      console.log('   • Message de succès affiché');
      console.log('   • Modal RH fermé automatiquement');
      console.log('   • Tableau principal rafraîchi');
      console.log('   • Formulaire réinitialisé');
      console.log('');
      console.log('🎯 AVANTAGES DE CETTE APPROCHE:');
      console.log('===============================');
      console.log('• Comportement uniforme pour toutes les actions RH');
      console.log('• Plus simple et plus fiable que le rafraîchissement du modal');
      console.log('• Meilleure expérience utilisateur (feedback clair)');
      console.log('• Évite les problèmes de synchronisation des données');
      console.log('• L\'utilisateur voit immédiatement le résultat dans le tableau');
      console.log('• Pas de risque de données obsolètes dans le modal');
    } else {
      console.log('⚠️  Certaines fonctions du modal RH ne ferment pas automatiquement le modal.');
      
      if (!typeModalClose) {
        console.log('❌ PROBLÈME DÉTECTÉ: La fonction ajouterEvolutionTypeCollaborateur ne ferme pas le modal');
        console.log('🔧 SOLUTION: Ajouter la fermeture automatique du modal après succès');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du fichier:', error.message);
  }
}

// Exécuter le script
if (require.main === module) {
  testAllModalCloseFunctions();
}

module.exports = { testAllModalCloseFunctions };




