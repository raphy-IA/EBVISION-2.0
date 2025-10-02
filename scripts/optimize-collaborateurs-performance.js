const fs = require('fs');
const path = require('path');

// Script pour optimiser les performances de la page collaborateurs
function optimizeCollaborateursPerformance() {
  console.log('⚡ Optimisation des performances de la page collaborateurs...\n');
  
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const cssDir = path.join(publicDir, 'css');
    const jsDir = path.join(publicDir, 'js');
    
    // Créer les dossiers s'ils n'existent pas
    if (!fs.existsSync(cssDir)) {
      fs.mkdirSync(cssDir, { recursive: true });
    }
    if (!fs.existsSync(jsDir)) {
      fs.mkdirSync(jsDir, { recursive: true });
    }
    
    const filePath = path.join(publicDir, 'collaborateurs.html');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Fichier collaborateurs.html non trouvé');
      return;
    }
    
    console.log('📁 Lecture du fichier collaborateurs.html...');
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('🔧 Extraction du CSS...');
    
    // 1. Extraire le CSS
    const cssMatch = content.match(/<style>([\s\S]*?)<\/style>/);
    if (cssMatch) {
      const cssContent = cssMatch[1];
      const cssFilePath = path.join(cssDir, 'collaborateurs.css');
      
      // Ajouter des commentaires et optimiser le CSS
      const optimizedCSS = `/* CSS pour la page Collaborateurs - EB-Vision 2.0 */
/* Optimisé pour la responsivité et les performances */

${cssContent}

/* Optimisations supplémentaires */
.collaborateurs-page {
    min-height: 100vh;
    overflow-x: hidden;
}

.collaborateurs-page * {
    box-sizing: border-box;
}

/* Amélioration des performances */
.stat-card {
    will-change: transform;
}

.table-responsive {
    contain: layout;
}

.modal {
    contain: layout style;
}

/* Optimisation des images */
.collaborateur-avatar {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
}

/* Réduction des reflows */
.main-content-area {
    contain: layout;
}

/* Optimisation des animations */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
`;
      
      fs.writeFileSync(cssFilePath, optimizedCSS, 'utf8');
      console.log(`   ✅ CSS extrait vers: css/collaborateurs.css`);
      
      // Remplacer le CSS inline par un lien vers le fichier externe
      content = content.replace(
        /<style>[\s\S]*?<\/style>/,
        '<link rel="stylesheet" href="css/collaborateurs.css">'
      );
    }
    
    console.log('🔧 Extraction du JavaScript...');
    
    // 2. Extraire le JavaScript
    const jsMatches = content.match(/<script>([\s\S]*?)<\/script>/g);
    if (jsMatches && jsMatches.length > 0) {
      let allJS = '';
      let jsCount = 0;
      
      jsMatches.forEach((match, index) => {
        const jsContent = match.replace(/<\/?script>/g, '');
        if (jsContent.trim()) {
          allJS += `\n/* Script ${index + 1} */\n${jsContent}\n`;
          jsCount++;
        }
      });
      
      if (allJS.trim()) {
        const jsFilePath = path.join(jsDir, 'collaborateurs.js');
        
        // Ajouter des commentaires et optimiser le JS
        const optimizedJS = `/* JavaScript pour la page Collaborateurs - EB-Vision 2.0 */
/* Optimisé pour les performances */

// Optimisations de performance
(function() {
    'use strict';
    
    // Debounce pour les fonctions fréquentes
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Throttle pour les événements de scroll
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Optimisation des requêtes DOM
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    
    // Cache des éléments fréquemment utilisés
    const cache = {
        searchInput: null,
        statusFilter: null,
        businessUnitFilter: null,
        collaborateursTable: null
    };
    
    // Initialisation optimisée
    document.addEventListener('DOMContentLoaded', function() {
        // Cache les éléments
        cache.searchInput = $('#search-input');
        cache.statusFilter = $('#status-filter');
        cache.businessUnitFilter = $('#business-unit-filter');
        cache.collaborateursTable = $('.table-responsive');
        
        // Optimiser les événements
        if (cache.searchInput) {
            cache.searchInput.addEventListener('input', 
                debounce(filterCollaborateurs, 300)
            );
        }
        
        if (cache.statusFilter) {
            cache.statusFilter.addEventListener('change', 
                debounce(filterCollaborateurs, 100)
            );
        }
        
        if (cache.businessUnitFilter) {
            cache.businessUnitFilter.addEventListener('change', 
                debounce(filterCollaborateurs, 100)
            );
        }
        
        // Optimiser le scroll
        window.addEventListener('scroll', 
            throttle(handleScroll, 100)
        );
    });
    
    function handleScroll() {
        // Optimisations de scroll si nécessaire
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Ajouter des optimisations de scroll ici si nécessaire
    }
    
    // Exposer les fonctions globales
    window.debounce = debounce;
    window.throttle = throttle;
    
})();

${allJS}
`;
        
        fs.writeFileSync(jsFilePath, optimizedJS, 'utf8');
        console.log(`   ✅ JavaScript extrait vers: js/collaborateurs.js`);
        
        // Remplacer les scripts inline par un lien vers le fichier externe
        content = content.replace(/<script>[\s\S]*?<\/script>/g, '');
        content = content.replace(
          '</head>',
          '    <script src="js/collaborateurs.js" defer></script>\n</head>'
        );
      }
    }
    
    console.log('🔧 Optimisation du HTML...');
    
    // 3. Optimisations HTML
    // Supprimer les espaces inutiles
    content = content.replace(/\s+/g, ' ');
    content = content.replace(/>\s+</g, '><');
    
    // Ajouter des attributs de performance
    content = content.replace(
      /<link rel="stylesheet" href="css\/collaborateurs\.css">/,
      '<link rel="stylesheet" href="css/collaborateurs.css" media="all">'
    );
    
    // Ajouter des meta tags de performance
    const performanceMeta = `
    <!-- Optimisations de performance -->
    <meta name="format-detection" content="telephone=no">
    <meta name="theme-color" content="#2c3e50">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">
    <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
    <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">`;
    
    content = content.replace(
      '</head>',
      `${performanceMeta}\n</head>`
    );
    
    // Sauvegarder le fichier HTML optimisé
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('✅ Optimisations appliquées avec succès !');
    console.log('');
    console.log('⚡ Améliorations apportées :');
    console.log('   - CSS extrait dans un fichier séparé (css/collaborateurs.css)');
    console.log('   - JavaScript extrait dans un fichier séparé (js/collaborateurs.js)');
    console.log('   - Optimisations de performance (debounce, throttle)');
    console.log('   - Cache des éléments DOM fréquemment utilisés');
    console.log('   - Meta tags de performance ajoutés');
    console.log('   - Preconnect et DNS prefetch pour les CDN');
    console.log('   - Support pour prefers-reduced-motion');
    console.log('   - Optimisations CSS (contain, will-change)');
    console.log('   - HTML minifié (espaces supprimés)');
    console.log('');
    console.log('📊 Résultats attendus :');
    console.log('   - Temps de chargement réduit');
    console.log('   - Meilleure mise en cache');
    console.log('   - Performance améliorée sur mobile');
    console.log('   - Réduction de la bande passante');
    console.log('');
    console.log('🎉 Page collaborateurs optimisée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'optimisation:', error.message);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  optimizeCollaborateursPerformance();
}

module.exports = { optimizeCollaborateursPerformance };



