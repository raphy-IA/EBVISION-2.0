// Script à exécuter dans la console du navigateur
// pour forcer la synchronisation du statut

console.log('🔄 Forçage de la synchronisation de la feuille de temps...');

// 1. Vider le cache local
if (typeof localStorage !== 'undefined') {
    console.log('🗑️ Nettoyage du cache local...');
    // Supprimer les données en cache
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('time-sheet')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`  - Supprimé: ${key}`);
    });
}

// 2. Forcer le rechargement des données
if (typeof loadWeekData === 'function') {
    console.log('📅 Rechargement des données de la semaine...');
    loadWeekData().then(() => {
        console.log('✅ Données rechargées');
        console.log('📊 Statut actuel:', currentTimeSheet ? currentTimeSheet.status : 'null');
    }).catch(error => {
        console.error('❌ Erreur lors du rechargement:', error);
    });
} else {
    console.log('⚠️ Fonction loadWeekData non disponible');
}

// 3. Afficher les informations de débogage
console.log('🔍 Informations de débogage:');
console.log('  - currentTimeSheet:', currentTimeSheet);
console.log('  - currentWeekStart:', currentWeekStart);

// 4. Vérifier l'élément d'affichage du statut
const statusBadge = document.getElementById('status-badge');
if (statusBadge) {
    console.log('  - Élément status-badge trouvé');
    console.log('  - Texte affiché:', statusBadge.textContent);
    console.log('  - Classes CSS:', statusBadge.className);
} else {
    console.log('  - Élément status-badge non trouvé');
}

console.log('✅ Diagnostic terminé');
