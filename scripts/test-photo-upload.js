// Script pour tester l'upload de photos
console.log('🧪 Script de test pour l\'upload de photos');

// Fonction pour simuler la sélection d'une image et vérifier l'aperçu
function testPhotoPreview() {
    console.log('📸 Test de l\'aperçu des photos...');
    
    // Simuler l'ouverture du modal "Nouveau collaborateur"
    const newModal = document.getElementById('addCollaborateurModal');
    if (!newModal) {
        console.log('❌ Modal "Nouveau collaborateur" non trouvé');
        return;
    }
    
    // Vérifier la présence du conteneur photo
    const photoContainer = document.getElementById('new-photo-container');
    if (!photoContainer) {
        console.log('❌ Conteneur photo non trouvé');
        return;
    }
    
    console.log('✅ Conteneurs trouvés');
    
    // Créer une image test pour vérifier les styles
    const testImage = document.createElement('img');
    testImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    testImage.className = 'collaborateur-avatar large';
    testImage.alt = 'Test image';
    
    // Créer le conteneur photo complet
    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo-container';
    photoDiv.appendChild(testImage);
    
    // Ajouter au conteneur
    photoContainer.innerHTML = '';
    photoContainer.appendChild(photoDiv);
    
    // Vérifier les styles appliqués
    const computedStyle = window.getComputedStyle(testImage);
    console.log('📏 Styles de l\'image test:');
    console.log('   - Width:', computedStyle.width);
    console.log('   - Height:', computedStyle.height);
    console.log('   - Object-fit:', computedStyle.objectFit);
    console.log('   - Border-radius:', computedStyle.borderRadius);
    
    // Nettoyer
    photoContainer.innerHTML = '';
    
    console.log('✅ Test d\'aperçu terminé');
}

// Exécuter le test quand la page est chargée
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testPhotoPreview);
} else {
    testPhotoPreview();
}








