// Script de débogage pour le formulaire d'opportunité
// À exécuter dans la console du navigateur (F12)

console.log('🔍 Débogage du formulaire d\'opportunité...');

// 1. Vérifier les éléments du formulaire
const formElements = [
    'opportunityName',
    'opportunityClient', 
    'opportunityCollaborator',
    'opportunityBusinessUnit',
    'opportunityType',
    'opportunityStatus'
];

console.log('\n📋 Éléments du formulaire:');
formElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
        console.log(`✅ ${elementId}: "${element.value}"`);
    } else {
        console.log(`❌ ${elementId}: Élément non trouvé`);
    }
});

// 2. Vérifier les éléments de validation
const validationElements = [
    'validation-name',
    'validation-client',
    'validation-collaborator', 
    'validation-business-unit',
    'validation-type',
    'validation-status'
];

console.log('\n🔍 Éléments de validation:');
validationElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
        const hasValidClass = element.classList.contains('valid');
        const icon = element.querySelector('i');
        const iconClass = icon ? icon.className : 'Pas d\'icône';
        console.log(`✅ ${elementId}: ${hasValidClass ? 'Validé' : 'Non validé'} (${iconClass})`);
    } else {
        console.log(`❌ ${elementId}: Élément non trouvé`);
    }
});

// 3. Tester la validation manuellement
console.log('\n🧪 Test de validation manuel:');
const businessUnitField = document.getElementById('opportunityBusinessUnit');
if (businessUnitField) {
    console.log(`🏢 Business Unit sélectionnée: "${businessUnitField.value}"`);
    
    // Simuler un changement pour déclencher la validation
    const event = new Event('change');
    businessUnitField.dispatchEvent(event);
    
    // Vérifier l'état après validation
    setTimeout(() => {
        const validationItem = document.getElementById('validation-business-unit');
        if (validationItem) {
            const hasValidClass = validationItem.classList.contains('valid');
            const icon = validationItem.querySelector('i');
            const iconClass = icon ? icon.className : 'Pas d\'icône';
            console.log(`📊 État après validation: ${hasValidClass ? 'Validé' : 'Non validé'} (${iconClass})`);
        }
    }, 100);
} else {
    console.log('❌ Champ Business Unit non trouvé');
}

// 4. Fonction pour forcer la validation
window.forceValidation = function() {
    console.log('🔄 Validation forcée...');
    validateAllFields();
};

// 5. Fonction pour afficher les valeurs actuelles
window.showCurrentValues = function() {
    console.log('\n📊 Valeurs actuelles:');
    formElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`${elementId}: "${element.value}"`);
        }
    });
};

console.log('\n✅ Débogage terminé');
console.log('💡 Utilisez forceValidation() pour forcer la validation');
console.log('💡 Utilisez showCurrentValues() pour voir les valeurs actuelles'); 