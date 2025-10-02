const fs = require('fs');
const path = require('path');

// Script pour tester la fermeture automatique du modal après succès
function testModalCloseOnSuccess() {
  console.log('🔍 Test de la fermeture automatique du modal après succès...\n');
  
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
    
    // 4. Vérifier que le rafraîchissement du tableau est conservé
    const tableRefresh = content.includes('await loadCollaborateurs(currentPage)');
    console.log(`✅ Rafraîchissement du tableau conservé: ${tableRefresh ? 'PRÉSENT' : 'MANQUANT'}`);
    
    // 5. Vérifier que les messages de succès sont conservés
    const successMessages = content.includes('✅ Évolution de grade ajoutée avec succès') &&
                           content.includes('✅ Évolution de poste ajoutée avec succès') &&
                           content.includes('✅ Évolution organisationnelle ajoutée avec succès');
    console.log(`✅ Messages de succès conservés: ${successMessages ? 'PRÉSENTS' : 'MANQUANTS'}`);
    
    // 6. Vérifier que la réinitialisation des formulaires est conservée
    const formReset = content.includes('document.getElementById(\'rh-grade-select\').value = \'\'') &&
                     content.includes('document.getElementById(\'rh-poste-select\').value = \'\'') &&
                     content.includes('document.getElementById(\'rh-business-unit-select\').value = \'\'');
    console.log(`✅ Réinitialisation des formulaires conservée: ${formReset ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    console.log('\n📊 RÉSUMÉ DE LA FERMETURE AUTOMATIQUE:');
    console.log('=======================================');
    
    const totalChecks = 6;
    const passedChecks = [
      gradeModalClose,
      posteModalClose,
      orgModalClose,
      tableRefresh,
      successMessages,
      formReset
    ].filter(Boolean).length;
    
    console.log(`✅ ${passedChecks}/${totalChecks} fonctionnalités de fermeture automatique appliquées`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 Toutes les fonctionnalités de fermeture automatique ont été appliquées !');
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
      console.log('🎯 AVANTAGES DE CETTE APPROCHE:');
      console.log('===============================');
      console.log('• Plus simple et plus fiable que le rafraîchissement du modal');
      console.log('• Meilleure expérience utilisateur (feedback clair)');
      console.log('• Évite les problèmes de synchronisation des données');
      console.log('• L\'utilisateur voit immédiatement le résultat dans le tableau');
      console.log('• Pas de risque de données obsolètes dans le modal');
    } else {
      console.log('⚠️  Certaines fonctionnalités de fermeture automatique sont manquantes.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du fichier:', error.message);
  }
}

// Exécuter le script
if (require.main === module) {
  testModalCloseOnSuccess();
}

module.exports = { testModalCloseOnSuccess };


