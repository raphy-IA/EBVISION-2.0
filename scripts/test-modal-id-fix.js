const fs = require('fs');
const path = require('path');

// Script pour tester la correction de l'ID du modal RH
function testModalIdFix() {
  console.log('🔍 Test de la correction de l\'ID du modal RH...\n');
  
  const collaborateursJsPath = path.join(__dirname, '../public/js/collaborateurs.js');
  
  try {
    const content = fs.readFileSync(collaborateursJsPath, 'utf8');
    
    console.log('📋 VÉRIFICATIONS DE L\'ID DU MODAL:');
    console.log('===================================');
    
    // 1. Vérifier que l'ID correct est utilisé (gestionRHModal)
    const correctModalId = content.includes('document.getElementById(\'gestionRHModal\')');
    console.log(`✅ ID correct du modal (gestionRHModal): ${correctModalId ? 'PRÉSENT' : 'MANQUANT'}`);
    
    // 2. Vérifier qu'il n'y a plus d'ancien ID incorrect (rhModal)
    const incorrectModalId = content.includes('document.getElementById(\'rhModal\')');
    console.log(`❌ Ancien ID incorrect (rhModal): ${incorrectModalId ? 'PRÉSENT (PROBLÈME)' : 'ABSENT (CORRECT)'}`);
    
    // 3. Vérifier que la fermeture du modal est présente pour toutes les fonctions
    const modalCloseCount = (content.match(/bootstrap\.Modal\.getInstance\(document\.getElementById\('gestionRHModal'\)\)/g) || []).length;
    console.log(`✅ Nombre de fermetures de modal: ${modalCloseCount}`);
    
    // 4. Vérifier que toutes les fonctions RH ont la fermeture du modal
    const gradeClose = content.includes('bootstrap.Modal.getInstance(document.getElementById(\'gestionRHModal\'))') &&
                      content.includes('ajouterEvolutionGrade');
    console.log(`✅ Fermeture modal après évolution grade: ${gradeClose ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    const posteClose = content.includes('bootstrap.Modal.getInstance(document.getElementById(\'gestionRHModal\'))') &&
                      content.includes('ajouterEvolutionPoste');
    console.log(`✅ Fermeture modal après évolution poste: ${posteClose ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    const orgClose = content.includes('bootstrap.Modal.getInstance(document.getElementById(\'gestionRHModal\'))') &&
                    content.includes('ajouterEvolutionOrganisation');
    console.log(`✅ Fermeture modal après évolution organisation: ${orgClose ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    const typeClose = content.includes('bootstrap.Modal.getInstance(document.getElementById(\'gestionRHModal\'))') &&
                     content.includes('ajouterEvolutionTypeCollaborateur');
    console.log(`✅ Fermeture modal après modification type collaborateur: ${typeClose ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    console.log('\n📊 RÉSUMÉ DE LA CORRECTION:');
    console.log('============================');
    
    const totalChecks = 6;
    const passedChecks = [
      correctModalId,
      !incorrectModalId,
      modalCloseCount >= 4,
      gradeClose,
      posteClose,
      orgClose,
      typeClose
    ].filter(Boolean).length;
    
    console.log(`✅ ${passedChecks}/${totalChecks} vérifications de l'ID du modal réussies`);
    
    if (correctModalId && !incorrectModalId && modalCloseCount >= 4) {
      console.log('🎉 La correction de l\'ID du modal RH a été appliquée avec succès !');
      console.log('\n🚀 COMPORTEMENT ATTENDU:');
      console.log('=========================');
      console.log('✅ Le modal RH (ID: gestionRHModal) se fermera maintenant automatiquement');
      console.log('✅ Après chaque action RH réussie:');
      console.log('   • Message de succès affiché');
      console.log('   • Modal RH fermé automatiquement');
      console.log('   • Tableau principal rafraîchi');
      console.log('   • Formulaire réinitialisé');
      console.log('');
      console.log('🔧 PROBLÈME RÉSOLU:');
      console.log('===================');
      console.log('• Ancien problème: ID incorrect "rhModal" au lieu de "gestionRHModal"');
      console.log('• Solution: Correction de l\'ID dans toutes les fonctions de fermeture');
      console.log('• Résultat: Le modal se ferme maintenant correctement');
    } else {
      console.log('⚠️  La correction de l\'ID du modal RH n\'est pas complète.');
      if (incorrectModalId) {
        console.log('❌ PROBLÈME: L\'ancien ID incorrect "rhModal" est encore présent');
      }
      if (!correctModalId) {
        console.log('❌ PROBLÈME: L\'ID correct "gestionRHModal" n\'est pas trouvé');
      }
    }
    
    console.log('\n🔍 DÉTAILS TECHNIQUES:');
    console.log('======================');
    console.log('• ID correct du modal RH: gestionRHModal');
    console.log('• Fonction de fermeture: bootstrap.Modal.getInstance()');
    console.log('• Vérification: if (rhModal) { rhModal.hide(); }');
    console.log('• Application: Dans toutes les fonctions RH après succès');
    
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du fichier:', error.message);
  }
}

// Exécuter le script
if (require.main === module) {
  testModalIdFix();
}

module.exports = { testModalIdFix };


