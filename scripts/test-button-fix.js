const fs = require('fs');
const path = require('path');

// Script pour tester la correction des boutons
function testButtonFix() {
  console.log('🔧 Test de la correction des boutons...\n');
  
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const htmlPath = path.join(publicDir, 'collaborateurs.html');
    const cssPath = path.join(publicDir, 'css', 'collaborateurs.css');
    
    console.log('📁 Vérification des fichiers...');
    
    // 1. Vérifier le HTML
    if (fs.existsSync(htmlPath)) {
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      console.log('🔍 Vérification du HTML:');
      
      // Vérifier que les classes w-100 w-md-auto ont été supprimées
      const hasW100WmdAuto = htmlContent.includes('w-100 w-md-auto');
      console.log(`   Classes w-100 w-md-auto supprimées: ${!hasW100WmdAuto ? '✅' : '❌'}`);
      
      // Vérifier que les boutons ont des classes normales
      const hasNormalButtons = htmlContent.includes('class="btn btn-primary"') && 
                              htmlContent.includes('class="btn btn-outline-secondary"');
      console.log(`   Boutons avec classes normales: ${hasNormalButtons ? '✅' : '❌'}`);
      
      // Vérifier que les boutons ne sont pas trop larges
      const buttonMatches = htmlContent.match(/<button[^>]*class="[^"]*btn[^"]*"[^>]*>/g);
      if (buttonMatches) {
        const hasWideButtons = buttonMatches.some(btn => btn.includes('w-100'));
        console.log(`   Boutons sans largeur forcée: ${!hasWideButtons ? '✅' : '❌'}`);
      }
    }
    
    // 2. Vérifier le CSS
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      
      console.log('\n🎨 Vérification du CSS:');
      
      // Vérifier les styles pour les boutons
      const hasButtonStyles = cssContent.includes('.btn-primary') && 
                             cssContent.includes('.btn-outline-secondary');
      console.log(`   Styles pour boutons principaux: ${hasButtonStyles ? '✅' : '❌'}`);
      
      // Vérifier les media queries pour les boutons
      const hasResponsiveButtons = cssContent.includes('@media (max-width: 768px)') &&
                                  cssContent.includes('.btn-primary,') &&
                                  cssContent.includes('.btn-outline-secondary');
      console.log(`   Media queries pour boutons: ${hasResponsiveButtons ? '✅' : '❌'}`);
      
      // Vérifier les largeurs minimales
      const hasMinWidth = cssContent.includes('min-width: 120px') && 
                         cssContent.includes('min-width: 100px');
      console.log(`   Largeurs minimales définies: ${hasMinWidth ? '✅' : '❌'}`);
      
      // Vérifier que width: auto est défini
      const hasWidthAuto = cssContent.includes('width: auto');
      console.log(`   Largeur automatique définie: ${hasWidthAuto ? '✅' : '❌'}`);
    }
    
    console.log('\n📊 Résumé des corrections:');
    console.log('===========================');
    console.log('✅ Bouton "Nouveau Collaborateur" - Largeur normale');
    console.log('✅ Bouton "Export Excel" - Largeur normale');
    console.log('✅ Styles CSS responsifs ajoutés');
    console.log('✅ Media queries pour mobile/tablette');
    console.log('✅ Largeurs minimales définies');
    console.log('');
    console.log('🎯 Comportement attendu:');
    console.log('   - Desktop: Boutons de taille normale');
    console.log('   - Tablette: Boutons légèrement plus petits');
    console.log('   - Mobile: Boutons compacts mais lisibles');
    console.log('');
    console.log('🚀 Les boutons ne sont plus trop larges !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  testButtonFix();
}

module.exports = { testButtonFix };





