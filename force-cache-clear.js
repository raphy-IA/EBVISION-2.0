// Script pour forcer le rechargement du cache
console.log('🔄 Forçage du rechargement du cache...');

// Ajouter un timestamp au template sidebar pour forcer le rechargement
const templateLink = document.querySelector('link[href*="template-modern-sidebar.html"]');
if (templateLink) {
    const timestamp = new Date().getTime();
    templateLink.href = `template-modern-sidebar.html?v=${timestamp}`;
    console.log('✅ Template sidebar mis à jour avec timestamp');
}

// Forcer le rechargement de la page
console.log('🔄 Rechargement de la page dans 2 secondes...');
setTimeout(() => {
    window.location.reload(true);
}, 2000);
