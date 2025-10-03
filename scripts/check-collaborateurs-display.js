const fs = require('fs');
const path = require('path');

// Script pour vérifier et corriger les problèmes d'affichage de la page collaborateurs
function checkCollaborateursDisplay() {
  console.log('🔍 Vérification de l\'affichage de la page collaborateurs...\n');
  
  try {
    const filePath = path.join(__dirname, '..', 'public', 'collaborateurs.html');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Fichier collaborateurs.html non trouvé');
      return;
    }
    
    console.log('📁 Lecture du fichier collaborateurs.html...');
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log('🔍 Vérification des éléments critiques...\n');
    
    // 1. Vérifier la structure de base
    console.log('📋 STRUCTURE DE BASE:');
    console.log('====================');
    
    const hasViewport = content.includes('viewport');
    const hasBootstrap = content.includes('bootstrap');
    const hasModernSidebar = content.includes('modern-sidebar.css');
    const hasPageWrapper = content.includes('page-wrapper');
    const hasMainContent = content.includes('main-content-area');
    
    console.log(`   Viewport meta: ${hasViewport ? '✅' : '❌'}`);
    console.log(`   Bootstrap CSS: ${hasBootstrap ? '✅' : '❌'}`);
    console.log(`   Modern Sidebar: ${hasModernSidebar ? '✅' : '❌'}`);
    console.log(`   Page Wrapper: ${hasPageWrapper ? '✅' : '❌'}`);
    console.log(`   Main Content Area: ${hasMainContent ? '✅' : '❌'}`);
    
    // 2. Vérifier les classes responsives
    console.log('\n📱 CLASSES RESPONSIVES:');
    console.log('========================');
    
    const responsiveClasses = [
      'col-lg-', 'col-md-', 'col-sm-', 'col-',
      'd-flex', 'flex-column', 'flex-md-row',
      'w-100', 'w-md-auto',
      'nav-fill', 'g-2', 'g-md-3'
    ];
    
    responsiveClasses.forEach(cls => {
      const hasClass = content.includes(cls);
      console.log(`   ${cls}: ${hasClass ? '✅' : '❌'}`);
    });
    
    // 3. Vérifier les media queries
    console.log('\n📺 MEDIA QUERIES:');
    console.log('==================');
    
    const mediaQueries = [
      '@media (max-width: 1200px)',
      '@media (max-width: 992px)',
      '@media (max-width: 768px)',
      '@media (max-width: 576px)'
    ];
    
    mediaQueries.forEach(mq => {
      const hasMQ = content.includes(mq);
      console.log(`   ${mq}: ${hasMQ ? '✅' : '❌'}`);
    });
    
    // 4. Vérifier les éléments d'interface
    console.log('\n🎨 ÉLÉMENTS D\'INTERFACE:');
    console.log('=========================');
    
    const uiElements = [
      'stat-card',
      'table-responsive',
      'modal-dialog-scrollable',
      'btn-group',
      'nav-tabs',
      'form-control',
      'form-select'
    ];
    
    uiElements.forEach(element => {
      const hasElement = content.includes(element);
      console.log(`   ${element}: ${hasElement ? '✅' : '❌'}`);
    });
    
    // 5. Vérifier les problèmes potentiels
    console.log('\n⚠️  PROBLÈMES POTENTIELS:');
    console.log('==========================');
    
    const problems = [];
    
    // Vérifier les largeurs fixes
    if (content.includes('width: 100%') && !content.includes('max-width: 100%')) {
      problems.push('Largeurs fixes sans max-width');
    }
    
    // Vérifier les hauteurs fixes
    if (content.includes('height: 100vh') && !content.includes('min-height: 100vh')) {
      problems.push('Hauteurs fixes sans min-height');
    }
    
    // Vérifier les overflow
    if (!content.includes('overflow-x: hidden')) {
      problems.push('Pas de protection contre le défilement horizontal');
    }
    
    // Vérifier les transitions
    if (!content.includes('transition:')) {
      problems.push('Pas de transitions CSS');
    }
    
    if (problems.length === 0) {
      console.log('   ✅ Aucun problème détecté');
    } else {
      problems.forEach(problem => {
        console.log(`   ⚠️  ${problem}`);
      });
    }
    
    // 6. Statistiques du fichier
    console.log('\n📊 STATISTIQUES:');
    console.log('=================');
    
    const lines = content.split('\n').length;
    const sizeKB = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(2);
    const cssLines = (content.match(/<style[\s\S]*?<\/style>/g) || [''])[0].split('\n').length;
    const jsLines = (content.match(/<script[\s\S]*?<\/script>/g) || []).length;
    
    console.log(`   Lignes totales: ${lines}`);
    console.log(`   Taille: ${sizeKB} KB`);
    console.log(`   Lignes CSS: ${cssLines}`);
    console.log(`   Scripts: ${jsLines}`);
    
    // 7. Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('====================');
    
    if (sizeKB > 500) {
      console.log('   📦 Fichier volumineux - considérer la séparation CSS/JS');
    }
    
    if (cssLines > 200) {
      console.log('   🎨 CSS volumineux - considérer un fichier CSS externe');
    }
    
    if (jsLines > 10) {
      console.log('   ⚡ Nombreux scripts - considérer des fichiers JS externes');
    }
    
    console.log('   🔄 Tester sur différents appareils (mobile, tablette, desktop)');
    console.log('   🧪 Utiliser les outils de développement du navigateur');
    console.log('   📱 Vérifier la compatibilité avec les navigateurs mobiles');
    
    console.log('\n✅ Vérification terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  checkCollaborateursDisplay();
}

module.exports = { checkCollaborateursDisplay };





