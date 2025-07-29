// Script de débogage complet pour la validation Business Unit
// À exécuter dans la console du navigateur (F12) après avoir ouvert le modal

console.log('🔍 DÉBOGAGE COMPLET - VALIDATION BUSINESS UNIT');
console.log('================================================');

// 1. Vérifier l'existence de tous les éléments
console.log('\n1️⃣ VÉRIFICATION DES ÉLÉMENTS DOM:');

const businessUnitField = document.getElementById('opportunityBusinessUnit');
const businessUnitValidation = document.getElementById('validation-business-unit');

console.log('🏢 Champ Business Unit:', businessUnitField ? 'TROUVÉ' : 'NON TROUVÉ');
if (businessUnitField) {
    console.log('   - ID:', businessUnitField.id);
    console.log('   - Type:', businessUnitField.type);
    console.log('   - Valeur actuelle:', businessUnitField.value);
    console.log('   - Nombre d\'options:', businessUnitField.options.length);
    console.log('   - Options disponibles:');
    for (let i = 0; i < businessUnitField.options.length; i++) {
        const option = businessUnitField.options[i];
        console.log(`     ${i}: "${option.text}" (value: "${option.value}")`);
    }
}

console.log('🔍 Élément de validation Business Unit:', businessUnitValidation ? 'TROUVÉ' : 'NON TROUVÉ');
if (businessUnitValidation) {
    console.log('   - ID:', businessUnitValidation.id);
    console.log('   - Classes:', businessUnitValidation.className);
    console.log('   - Contenu HTML:', businessUnitValidation.innerHTML);
}

// 2. Vérifier les événements attachés
console.log('\n2️⃣ VÉRIFICATION DES ÉVÉNEMENTS:');

if (businessUnitField) {
    // Simuler un changement pour voir si la validation se déclenche
    console.log('🔄 Simulation d\'un changement...');
    const originalValue = businessUnitField.value;
    
    // Sélectionner la première option valide (pas l'option vide)
    if (businessUnitField.options.length > 1) {
        businessUnitField.value = businessUnitField.options[1].value;
        console.log('   - Nouvelle valeur sélectionnée:', businessUnitField.value);
        
        // Déclencher l'événement change
        const changeEvent = new Event('change', { bubbles: true });
        businessUnitField.dispatchEvent(changeEvent);
        console.log('   - Événement change déclenché');
        
        // Vérifier l'état après 100ms
        setTimeout(() => {
            console.log('   - État après changement:');
            if (businessUnitValidation) {
                const hasValidClass = businessUnitValidation.classList.contains('valid');
                const icon = businessUnitValidation.querySelector('i');
                const iconClass = icon ? icon.className : 'Pas d\'icône';
                console.log(`     - Classe 'valid': ${hasValidClass}`);
                console.log(`     - Icône: ${iconClass}`);
            }
        }, 100);
        
        // Remettre la valeur originale
        businessUnitField.value = originalValue;
    }
}

// 3. Tester la fonction validateField directement
console.log('\n3️⃣ TEST DE LA FONCTION VALIDATEFIELD:');

if (typeof validateField === 'function') {
    console.log('✅ Fonction validateField trouvée');
    
    // Créer un événement simulé
    const mockEvent = {
        target: businessUnitField
    };
    
    if (businessUnitField) {
        // Tester avec une valeur vide
        businessUnitField.value = '';
        validateField(mockEvent);
        console.log('   - Test avec valeur vide terminé');
        
        // Tester avec une valeur valide
        if (businessUnitField.options.length > 1) {
            businessUnitField.value = businessUnitField.options[1].value;
            validateField(mockEvent);
            console.log('   - Test avec valeur valide terminé');
        }
    }
} else {
    console.log('❌ Fonction validateField non trouvée');
}

// 4. Tester la fonction validateAllFields
console.log('\n4️⃣ TEST DE LA FONCTION VALIDATEALLFIELDS:');

if (typeof validateAllFields === 'function') {
    console.log('✅ Fonction validateAllFields trouvée');
    const result = validateAllFields();
    console.log('   - Résultat de validateAllFields:', result);
} else {
    console.log('❌ Fonction validateAllFields non trouvée');
}

// 5. Vérifier les sélecteurs CSS
console.log('\n5️⃣ VÉRIFICATION DES SÉLECTEURS:');

const allValidationElements = document.querySelectorAll('[id^="validation-"]');
console.log('   - Éléments de validation trouvés:', allValidationElements.length);
allValidationElements.forEach(el => {
    console.log(`     - ${el.id}: ${el.classList.contains('valid') ? 'Validé' : 'Non validé'}`);
});

// 6. Fonction de test manuel
window.testBusinessUnitValidation = function() {
    console.log('\n🧪 TEST MANUEL BUSINESS UNIT:');
    
    if (businessUnitField && businessUnitValidation) {
        // Sélectionner une valeur
        if (businessUnitField.options.length > 1) {
            businessUnitField.value = businessUnitField.options[1].value;
            console.log('   - Valeur sélectionnée:', businessUnitField.value);
            
            // Forcer la validation
            businessUnitValidation.classList.add('valid');
            businessUnitValidation.querySelector('i').className = 'fas fa-check-circle text-success';
            console.log('   - Validation forcée manuellement');
            
            // Vérifier l'état
            const hasValidClass = businessUnitValidation.classList.contains('valid');
            const icon = businessUnitValidation.querySelector('i');
            const iconClass = icon ? icon.className : 'Pas d\'icône';
            console.log(`   - État final: ${hasValidClass ? 'Validé' : 'Non validé'} (${iconClass})`);
        }
    }
};

// 7. Fonction pour afficher l'état complet
window.showBusinessUnitState = function() {
    console.log('\n📊 ÉTAT COMPLET BUSINESS UNIT:');
    console.log('   - Champ existe:', !!businessUnitField);
    console.log('   - Validation existe:', !!businessUnitValidation);
    
    if (businessUnitField) {
        console.log('   - Valeur actuelle:', businessUnitField.value);
        console.log('   - Options disponibles:', businessUnitField.options.length);
    }
    
    if (businessUnitValidation) {
        const hasValidClass = businessUnitValidation.classList.contains('valid');
        const icon = businessUnitValidation.querySelector('i');
        const iconClass = icon ? icon.className : 'Pas d\'icône';
        console.log('   - Classe valid:', hasValidClass);
        console.log('   - Icône:', iconClass);
    }
};

console.log('\n✅ DÉBOGAGE TERMINÉ');
console.log('💡 Utilisez testBusinessUnitValidation() pour tester manuellement');
console.log('💡 Utilisez showBusinessUnitState() pour voir l\'état complet'); 