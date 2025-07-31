const fs = require('fs');
const path = require('path');

console.log('🔧 Correction de la page opportunities.html...');

// Lire le fichier opportunities.html
const filePath = path.join(__dirname, '../public/opportunities.html');
let content = fs.readFileSync(filePath, 'utf8');

// Retirer les scripts externes problématiques
console.log('📝 Retrait des scripts externes problématiques...');

// Remplacer les scripts externes par des versions simplifiées
const scriptReplacements = [
    {
        from: '<script src="/js/auth.js" defer></script>',
        to: '<!-- Script auth.js retiré pour éviter les conflits -->'
    },
    {
        from: '<script src="/js/sidebar.js" defer></script>',
        to: '<!-- Script sidebar.js retiré pour éviter les conflits -->'
    }
];

scriptReplacements.forEach(replacement => {
    if (content.includes(replacement.from)) {
        content = content.replace(replacement.from, replacement.to);
        console.log('✅ Script retiré:', replacement.from.split('/').pop());
    }
});

// Ajouter une sidebar simplifiée
const sidebarReplacement = {
    from: '<!-- La sidebar sera générée par JavaScript -->',
    to: `<!-- Sidebar simplifiée -->
            <div class="bg-dark text-white p-3 h-100">
                <h5 class="mb-3">TRS - Menu</h5>
                <ul class="nav flex-column">
                    <li class="nav-item">
                        <a class="nav-link text-white" href="/dashboard.html">
                            <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link text-white active" href="/opportunities.html">
                            <i class="fas fa-lightbulb me-2"></i>Opportunités
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link text-white" href="/clients.html">
                            <i class="fas fa-building me-2"></i>Clients
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link text-white" href="/collaborateurs.html">
                            <i class="fas fa-users me-2"></i>Collaborateurs
                        </a>
                    </li>
                </ul>
            </div>`
};

if (content.includes(sidebarReplacement.from)) {
    content = content.replace(sidebarReplacement.from, sidebarReplacement.to);
    console.log('✅ Sidebar simplifiée ajoutée');
}

// Ajouter des logs de débogage supplémentaires
const debugLogs = [
    'console.log(\'🚀 Page opportunities.html chargée\');',
    'console.log(\'📋 Chargement des opportunités...\');',
    'console.log(\'📊 Réponse API:\', data);',
    'console.log(\`✅ ${opportunities.length} opportunités chargées\`);',
    'console.log(\'✅ Opportunités affichées\');'
];

// Vérifier si les logs existent déjà
debugLogs.forEach(log => {
    if (!content.includes(log)) {
        console.log('⚠️ Log de débogage manquant:', log);
    }
});

// Écrire le fichier corrigé
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Page opportunities.html corrigée !');
console.log('📋 Modifications apportées:');
console.log('   - Scripts externes retirés (auth.js, sidebar.js)');
console.log('   - Sidebar simplifiée ajoutée');
console.log('   - Logs de débogage vérifiés');

console.log('\n🎯 Testez maintenant: http://localhost:3000/opportunities.html'); 