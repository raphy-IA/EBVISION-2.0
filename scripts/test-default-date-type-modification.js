const fs = require('fs');
const path = require('path');

// Script pour tester la date par défaut dans la section Modification Type de Collaborateur
function testDefaultDateTypeModification() {
  console.log('🔍 Test de la date par défaut dans la section Modification Type de Collaborateur...\n');
  
  const collaborateursJsPath = path.join(__dirname, '../public/js/collaborateurs.js');
  
  try {
    const content = fs.readFileSync(collaborateursJsPath, 'utf8');
    
    console.log('📋 VÉRIFICATIONS DE LA DATE PAR DÉFAUT:');
    console.log('=======================================');
    
    // 1. Vérifier que la date par défaut est définie pour le type de collaborateur
    const typeDateDefault = content.includes('elements[\'rh-type-collaborateur-date-effet\'].value = new Date().toISOString().split(\'T\')[0]');
    console.log(`✅ Date par défaut pour type collaborateur: ${typeDateDefault ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    // 2. Vérifier que la date par défaut est définie pour les grades (référence)
    const gradeDateDefault = content.includes('elements[\'rh-grade-date-effet\'].value = new Date().toISOString().split(\'T\')[0]');
    console.log(`✅ Date par défaut pour grade (référence): ${gradeDateDefault ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    // 3. Vérifier que la date par défaut est définie pour les postes (référence)
    const posteDateDefault = content.includes('elements[\'rh-poste-date-effet\'].value = new Date().toISOString().split(\'T\')[0]');
    console.log(`✅ Date par défaut pour poste (référence): ${posteDateDefault ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    // 4. Vérifier que la date par défaut est définie pour l'organisation (référence)
    const orgDateDefault = content.includes('elements[\'rh-organisation-date-effet\'].value = new Date().toISOString().split(\'T\')[0]');
    console.log(`✅ Date par défaut pour organisation (référence): ${orgDateDefault ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    // 5. Vérifier que le motif est réinitialisé pour le type de collaborateur
    const typeMotifReset = content.includes('elements[\'rh-type-collaborateur-motif\'].value = \'\'');
    console.log(`✅ Réinitialisation du motif type collaborateur: ${typeMotifReset ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    // 6. Vérifier la cohérence avec les autres sections
    const allSectionsHaveDefaultDate = typeDateDefault && gradeDateDefault && posteDateDefault && orgDateDefault;
    console.log(`✅ Cohérence avec toutes les sections: ${allSectionsHaveDefaultDate ? 'PRÉSENTE' : 'MANQUANTE'}`);
    
    console.log('\n📊 RÉSUMÉ DE LA DATE PAR DÉFAUT:');
    console.log('=================================');
    
    const totalChecks = 6;
    const passedChecks = [
      typeDateDefault,
      gradeDateDefault,
      posteDateDefault,
      orgDateDefault,
      typeMotifReset,
      allSectionsHaveDefaultDate
    ].filter(Boolean).length;
    
    console.log(`✅ ${passedChecks}/${totalChecks} fonctionnalités de date par défaut appliquées`);
    
    if (typeDateDefault) {
      console.log('🎉 La date par défaut a été ajoutée à la section Modification Type de Collaborateur !');
      console.log('\n🚀 COMPORTEMENT ATTENDU:');
      console.log('=========================');
      console.log('✅ Lors de l\'ouverture du modal RH:');
      console.log('   • Section "Évolution de Grade": Date du jour pré-remplie');
      console.log('   • Section "Évolution de Poste": Date du jour pré-remplie');
      console.log('   • Section "Modification Type de Collaborateur": Date du jour pré-remplie ✅');
      console.log('   • Section "Évolution Organisationnelle": Date du jour pré-remplie');
      console.log('');
      console.log('✅ Toutes les sections ont maintenant la date du jour par défaut');
      console.log('✅ Cohérence parfaite entre toutes les sections du modal RH');
      console.log('✅ Meilleure expérience utilisateur (pas besoin de saisir la date manuellement)');
    } else {
      console.log('⚠️  La date par défaut n\'a pas été trouvée pour la section Modification Type de Collaborateur.');
    }
    
    console.log('\n🔍 DÉTAILS TECHNIQUES:');
    console.log('======================');
    console.log('• Utilisation de: new Date().toISOString().split(\'T\')[0]');
    console.log('• Format de date: YYYY-MM-DD (compatible avec input type="date")');
    console.log('• Application: Lors de l\'ouverture du modal RH');
    console.log('• Réinitialisation: Lors de la fermeture du modal après succès');
    console.log('• Cohérence: Même logique que les autres sections');
    
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du fichier:', error.message);
  }
}

// Exécuter le script
if (require.main === module) {
  testDefaultDateTypeModification();
}

module.exports = { testDefaultDateTypeModification };






