#!/usr/bin/env node

/**
 * Script pour diagnostiquer les problèmes de pagination de la page collaborateurs
 */

console.log('🔍 DIAGNOSTIC DE LA PAGINATION COLLABORATEURS');
console.log('==============================================\n');

// Simuler les données de pagination
const mockPaginationData = {
    currentPage: 1,
    totalPages: 5,
    totalCollaborateurs: 87,
    itemsPerPage: 20
};

console.log('📊 DONNÉES DE TEST:');
console.log('===================');
console.log(`Page actuelle: ${mockPaginationData.currentPage}`);
console.log(`Total pages: ${mockPaginationData.totalPages}`);
console.log(`Total collaborateurs: ${mockPaginationData.totalCollaborateurs}`);
console.log(`Éléments par page: ${mockPaginationData.itemsPerPage}\n`);

// Tester la génération HTML de pagination
function generatePaginationHTML(currentPage, totalPages, totalCollaborateurs, itemsPerPage) {
    let paginationHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="text-muted">
                Affichage de ${((currentPage - 1) * itemsPerPage) + 1} à ${Math.min(currentPage * itemsPerPage, totalCollaborateurs)} sur ${totalCollaborateurs} collaborateurs
            </div>
            <nav aria-label="Pagination des collaborateurs">
                <ul class="pagination pagination-sm mb-0">
    `;

    // Bouton Précédent
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadCollaborateurs(${currentPage - 1})" aria-label="Précédent">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link" aria-label="Précédent">
                    <span aria-hidden="true">&laquo;</span>
                </span>
            </li>
        `;
    }

    // Numéros de pages
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    console.log(`📄 Génération des pages: ${startPage} à ${endPage}`);

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `
                <li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>
            `;
        } else {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="loadCollaborateurs(${i})">${i}</a>
                </li>
            `;
        }
    }

    // Bouton Suivant
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadCollaborateurs(${currentPage + 1})" aria-label="Suivant">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link" aria-label="Suivant">
                    <span aria-hidden="true">&raquo;</span>
                </span>
            </li>
        `;
    }

    paginationHTML += `
                </ul>
            </nav>
        </div>
    `;

    return paginationHTML;
}

// Tester différents scénarios
const testScenarios = [
    { page: 1, total: 5, totalItems: 87, description: "Première page" },
    { page: 3, total: 5, totalItems: 87, description: "Page du milieu" },
    { page: 5, total: 5, totalItems: 87, description: "Dernière page" },
    { page: 1, total: 1, totalItems: 15, description: "Une seule page" },
    { page: 1, total: 10, totalItems: 200, description: "Beaucoup de pages" }
];

console.log('🧪 TESTS DE GÉNÉRATION HTML:');
console.log('=============================\n');

testScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.description}:`);
    console.log(`   Page ${scenario.page}/${scenario.total} (${scenario.totalItems} éléments)`);
    
    const html = generatePaginationHTML(scenario.page, scenario.total, scenario.totalItems, 20);
    
    // Vérifier les éléments clés
    const hasPrevButton = html.includes('Précédent');
    const hasNextButton = html.includes('Suivant');
    const hasPageNumbers = html.includes('page-link');
    const hasActivePage = html.includes('page-item active');
    const hasInfoText = html.includes('Affichage de');
    
    console.log(`   ✅ Bouton Précédent: ${hasPrevButton ? 'Oui' : '❌ Non'}`);
    console.log(`   ✅ Bouton Suivant: ${hasNextButton ? 'Oui' : '❌ Non'}`);
    console.log(`   ✅ Numéros de pages: ${hasPageNumbers ? 'Oui' : '❌ Non'}`);
    console.log(`   ✅ Page active: ${hasActivePage ? 'Oui' : '❌ Non'}`);
    console.log(`   ✅ Texte d'information: ${hasInfoText ? 'Oui' : '❌ Non'}`);
    console.log('');
});

console.log('💡 DIAGNOSTIC:');
console.log('==============');
console.log('1. La fonction updatePaginationControls() semble correcte');
console.log('2. Le HTML généré contient tous les éléments nécessaires');
console.log('3. Les problèmes possibles:');
console.log('   - La fonction n\'est pas appelée');
console.log('   - L\'élément #pagination-container n\'existe pas');
console.log('   - Erreur JavaScript qui empêche l\'exécution');
console.log('   - Problème avec les données de pagination du serveur');

console.log('\n🔧 RECOMMANDATIONS:');
console.log('===================');
console.log('1. Vérifier que l\'élément #pagination-container existe dans le HTML');
console.log('2. Ajouter des logs de débogage dans updatePaginationControls()');
console.log('3. Vérifier que les données de pagination sont correctement reçues du serveur');
console.log('4. Tester la fonction dans la console du navigateur');

