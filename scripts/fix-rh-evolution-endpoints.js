const fs = require('fs');
const path = require('path');

// Script pour corriger les endpoints d'évolution RH
async function fixRHEvolutionEndpoints() {
  console.log('🔧 Correction des endpoints d\'évolution RH...\n');
  
  try {
    // 1. Vérifier le fichier collaborateurs.js
    console.log('📁 VÉRIFICATION DU FICHIER COLLABORATEURS.JS:');
    console.log('==============================================');
    
    const collaborateursPath = path.join(__dirname, '../public/js/collaborateurs.js');
    
    if (!fs.existsSync(collaborateursPath)) {
      console.log('❌ Fichier collaborateurs.js non trouvé');
      return;
    }
    
    const content = fs.readFileSync(collaborateursPath, 'utf8');
    console.log(`✅ Fichier trouvé: ${collaborateursPath}`);
    console.log(`📏 Taille: ${(content.length / 1024).toFixed(2)} KB`);
    console.log('');
    
    // 2. Analyser le code pour identifier les endpoints incorrects
    console.log('🔍 ANALYSE DU CODE:');
    console.log('====================');
    
    const lines = content.split('\n');
    let issues = [];
    
    // Chercher les endpoints incorrects
    const incorrectEndpoints = [
      'api/evolution-grades',
      'api/evolution-postes', 
      'api/evolution-organisations'
    ];
    
    incorrectEndpoints.forEach(endpoint => {
      const matches = lines.filter(line => line.includes(endpoint));
      if (matches.length > 0) {
        issues.push(`Endpoint incorrect: ${endpoint} (${matches.length} occurrence(s))`);
        matches.forEach((match, index) => {
          const lineNumber = lines.indexOf(match) + 1;
          console.log(`   Ligne ${lineNumber}: ${match.trim()}`);
        });
      }
    });
    console.log('');
    
    // 3. Identifier les corrections nécessaires
    console.log('🔧 CORRECTIONS NÉCESSAIRES:');
    console.log('=============================');
    
    const corrections = [
      {
        from: 'api/evolution-grades',
        to: 'api/collaborateurs/evolution-grades',
        description: 'Endpoint pour l\'évolution des grades'
      },
      {
        from: 'api/evolution-postes',
        to: 'api/collaborateurs/evolution-postes', 
        description: 'Endpoint pour l\'évolution des postes'
      },
      {
        from: 'api/evolution-organisations',
        to: 'api/collaborateurs/evolution-organisations',
        description: 'Endpoint pour l\'évolution des organisations'
      }
    ];
    
    corrections.forEach(correction => {
      const matches = lines.filter(line => line.includes(correction.from));
      if (matches.length > 0) {
        console.log(`✅ ${correction.description}:`);
        console.log(`   ${correction.from} → ${correction.to}`);
        console.log(`   ${matches.length} occurrence(s) à corriger`);
      }
    });
    console.log('');
    
    // 4. Appliquer les corrections
    console.log('🔧 APPLICATION DES CORRECTIONS:');
    console.log('================================');
    
    let correctedContent = content;
    let correctionsApplied = 0;
    
    corrections.forEach(correction => {
      const originalContent = correctedContent;
      correctedContent = correctedContent.replace(
        new RegExp(correction.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        correction.to
      );
      
      if (correctedContent !== originalContent) {
        correctionsApplied++;
        console.log(`✅ ${correction.description} corrigé`);
      }
    });
    
    // 5. Vérifier les corrections
    console.log('\n🔍 VÉRIFICATION DES CORRECTIONS:');
    console.log('==================================');
    
    const correctedLines = correctedContent.split('\n');
    
    corrections.forEach(correction => {
      const matches = correctedLines.filter(line => line.includes(correction.to));
      if (matches.length > 0) {
        console.log(`✅ ${correction.to}: ${matches.length} occurrence(s) trouvée(s)`);
      } else {
        console.log(`❌ ${correction.to}: Aucune occurrence trouvée`);
      }
    });
    console.log('');
    
    // 6. Créer le fichier corrigé
    if (correctionsApplied > 0) {
      const backupPath = collaborateursPath + '.backup';
      fs.writeFileSync(backupPath, content, 'utf8');
      console.log(`✅ Sauvegarde créée: ${backupPath}`);
      
      fs.writeFileSync(collaborateursPath, correctedContent, 'utf8');
      console.log(`✅ Fichier corrigé: ${collaborateursPath}`);
      console.log(`📊 Corrections appliquées: ${correctionsApplied}`);
    } else {
      console.log('ℹ️  Aucune correction nécessaire');
    }
    console.log('');
    
    // 7. Vérifier les routes backend
    console.log('🔍 VÉRIFICATION DES ROUTES BACKEND:');
    console.log('====================================');
    
    const routesPath = path.join(__dirname, '../src/routes');
    
    if (fs.existsSync(routesPath)) {
      const files = fs.readdirSync(routesPath);
      console.log('📁 Fichiers de routes disponibles:');
      files.forEach(file => {
        if (file.endsWith('.js')) {
          console.log(`   - ${file}`);
        }
      });
      
      // Vérifier le fichier collaborateurs.js dans les routes
      const collaborateursRoutePath = path.join(routesPath, 'collaborateurs.js');
      if (fs.existsSync(collaborateursRoutePath)) {
        const routeContent = fs.readFileSync(collaborateursRoutePath, 'utf8');
        
        const routeLines = routeContent.split('\n');
        const evolutionRoutes = routeLines.filter(line => 
          line.includes('evolution-grades') || 
          line.includes('evolution-postes') || 
          line.includes('evolution-organisations')
        );
        
        if (evolutionRoutes.length > 0) {
          console.log('\n✅ Routes d\'évolution trouvées dans le backend:');
          evolutionRoutes.forEach(route => {
            console.log(`   ${route.trim()}`);
          });
        } else {
          console.log('\n❌ Aucune route d\'évolution trouvée dans le backend');
          console.log('   Il faut créer les routes manquantes');
        }
      } else {
        console.log('\n❌ Fichier de routes collaborateurs.js non trouvé');
      }
    } else {
      console.log('❌ Dossier des routes non trouvé');
    }
    console.log('');
    
    // 8. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    
    console.log('🔧 POUR RÉSOUDRE LES ERREURS 400:');
    console.log('   1. Vérifier que les routes backend existent');
    console.log('   2. Vérifier que les routes acceptent les bonnes données');
    console.log('   3. Vérifier que les tables d\'historique existent');
    console.log('   4. Vérifier que les contraintes de clés étrangères sont respectées');
    console.log('   5. Ajouter des validations côté backend');
    console.log('');
    console.log('🔧 ROUTES BACKEND À CRÉER:');
    console.log('   POST /api/collaborateurs/evolution-grades');
    console.log('   POST /api/collaborateurs/evolution-postes');
    console.log('   POST /api/collaborateurs/evolution-organisations');
    console.log('');
    console.log('🔧 TABLES D\'HISTORIQUE À UTILISER:');
    console.log('   - evolution_grades');
    console.log('   - evolution_postes');
    console.log('   - evolution_organisations');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
  }
  
  console.log('\n✅ Correction terminée !');
}

// Exécuter le script
if (require.main === module) {
  fixRHEvolutionEndpoints();
}

module.exports = { fixRHEvolutionEndpoints };



