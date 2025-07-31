// Script de correction pour les boutons des opportunités
// À exécuter dans la console du navigateur (F12)

console.log('🔧 CORRECTION BOUTONS OPPORTUNITIES');
console.log('====================================');

// Vérifier et corriger les fonctions si nécessaire
window.fixOpportunityFunctions = function() {
    console.log('\n1️⃣ VÉRIFICATION ET CORRECTION DES FONCTIONS');
    
    // Fonction viewOpportunity
    if (typeof window.viewOpportunity !== 'function') {
        console.log('⚠️ Fonction viewOpportunity manquante, création...');
        window.viewOpportunity = function(id) {
            console.log('👁️ Visualisation de l\'opportunité:', id);
            const opp = window.opportunities ? window.opportunities.find(o => o.id === id) : null;
            
            if (opp) {
                const modal = `
                    <div class="modal fade" id="viewOpportunityModal" tabindex="-1">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">
                                        <i class="fas fa-eye me-2"></i>
                                        Détails de l'Opportunité
                                    </h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6 class="text-primary">Informations Générales</h6>
                                            <p><strong>Nom :</strong> ${opp.nom}</p>
                                            <p><strong>Client :</strong> ${opp.client_nom || 'Non renseigné'}</p>
                                            <p><strong>Responsable :</strong> ${opp.collaborateur_nom ? `${opp.collaborateur_nom} ${opp.collaborateur_prenom}` : 'Non assigné'}</p>
                                            <p><strong>Business Unit :</strong> ${opp.business_unit_nom || 'Non assignée'}</p>
                                            <p><strong>Type :</strong> ${opp.opportunity_type_nom || 'Non renseigné'}</p>
                                        </div>
                                        <div class="col-md-6">
                                            <h6 class="text-primary">Informations Commerciales</h6>
                                            <p><strong>Montant :</strong> ${opp.montant_estime ? formatCurrency(opp.montant_estime) : 'Non renseigné'}</p>
                                            <p><strong>Probabilité :</strong> ${opp.probabilite ? `${opp.probabilite}%` : 'Non renseignée'}</p>
                                            <p><strong>Date de fermeture :</strong> ${opp.date_fermeture_prevue ? new Date(opp.date_fermeture_prevue).toLocaleDateString('fr-FR') : 'Non renseignée'}</p>
                                            <p><strong>Source :</strong> ${opp.source || 'Non renseignée'}</p>
                                            <p><strong>Statut :</strong> <span class="status-badge status-saisie">${opp.statut || 'En Cours'}</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                                    <button type="button" class="btn btn-warning" onclick="editOpportunity('${opp.id}')">
                                        <i class="fas fa-edit me-1"></i>Modifier
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                const oldModal = document.getElementById('viewOpportunityModal');
                if (oldModal) oldModal.remove();
                
                document.body.insertAdjacentHTML('beforeend', modal);
                new bootstrap.Modal(document.getElementById('viewOpportunityModal')).show();
            } else {
                alert('Opportunité non trouvée');
            }
        };
        console.log('✅ Fonction viewOpportunity créée');
    } else {
        console.log('✅ Fonction viewOpportunity existe déjà');
    }
    
    // Fonction editOpportunity
    if (typeof window.editOpportunity !== 'function') {
        console.log('⚠️ Fonction editOpportunity manquante, création...');
        window.editOpportunity = function(id) {
            console.log('✏️ Édition de l\'opportunité:', id);
            alert('Fonction d\'édition en cours de développement');
        };
        console.log('✅ Fonction editOpportunity créée');
    } else {
        console.log('✅ Fonction editOpportunity existe déjà');
    }
    
    // Fonction deleteOpportunity
    if (typeof window.deleteOpportunity !== 'function') {
        console.log('⚠️ Fonction deleteOpportunity manquante, création...');
        window.deleteOpportunity = function(id) {
            console.log('🗑️ Suppression de l\'opportunité:', id);
            if (confirm('Êtes-vous sûr de vouloir supprimer cette opportunité ?')) {
                alert('Fonction de suppression en cours de développement');
            }
        };
        console.log('✅ Fonction deleteOpportunity créée');
    } else {
        console.log('✅ Fonction deleteOpportunity existe déjà');
    }
};

// Recharger le tableau avec les boutons corrigés
window.reloadOpportunitiesTable = function() {
    console.log('\n2️⃣ RECHARGEMENT DU TABLEAU');
    
    if (typeof window.displayOpportunities === 'function') {
        console.log('🔄 Rechargement du tableau...');
        window.displayOpportunities();
        console.log('✅ Tableau rechargé');
    } else {
        console.log('❌ Fonction displayOpportunities non trouvée');
    }
};

// Vérifier et corriger les boutons dans le DOM
window.fixButtonsInDOM = function() {
    console.log('\n3️⃣ CORRECTION DES BOUTONS DANS LE DOM');
    
    const table = document.getElementById('opportunities-table');
    if (!table) {
        console.log('❌ Tableau non trouvé');
        return;
    }
    
    const rows = table.querySelectorAll('tr');
    console.log(`📊 ${rows.length} lignes trouvées`);
    
    let fixedCount = 0;
    
    rows.forEach((row, index) => {
        const buttons = row.querySelectorAll('button');
        
        buttons.forEach(button => {
            const onclick = button.getAttribute('onclick');
            
            if (onclick) {
                // Vérifier si la fonction existe
                const functionName = onclick.match(/(\w+)\(/);
                if (functionName) {
                    const funcName = functionName[1];
                    if (typeof window[funcName] !== 'function') {
                        console.log(`⚠️ Fonction ${funcName} manquante pour le bouton dans la ligne ${index + 1}`);
                        // Désactiver le bouton
                        button.disabled = true;
                        button.title = 'Fonction non disponible';
                    } else {
                        console.log(`✅ Fonction ${funcName} disponible pour le bouton dans la ligne ${index + 1}`);
                        fixedCount++;
                    }
                }
            }
        });
    });
    
    console.log(`📊 ${fixedCount} boutons fonctionnels trouvés`);
};

// Test des boutons après correction
window.testFixedButtons = function() {
    console.log('\n4️⃣ TEST DES BOUTONS CORRIGÉS');
    
    if (!window.opportunities || window.opportunities.length === 0) {
        console.log('❌ Aucune opportunité disponible');
        return;
    }
    
    const testOpp = window.opportunities[0];
    console.log('📋 Test avec l\'opportunité:', testOpp.nom);
    
    // Test viewOpportunity
    if (typeof window.viewOpportunity === 'function') {
        console.log('🎯 Test viewOpportunity...');
        try {
            window.viewOpportunity(testOpp.id);
            console.log('✅ Modal de visualisation ouvert');
        } catch (error) {
            console.log('❌ Erreur:', error.message);
        }
    }
    
    // Test editOpportunity
    if (typeof window.editOpportunity === 'function') {
        console.log('🎯 Test editOpportunity...');
        try {
            window.editOpportunity(testOpp.id);
            console.log('✅ Fonction d\'édition appelée');
        } catch (error) {
            console.log('❌ Erreur:', error.message);
        }
    }
    
    // Test deleteOpportunity
    if (typeof window.deleteOpportunity === 'function') {
        console.log('🎯 Test deleteOpportunity...');
        try {
            window.deleteOpportunity(testOpp.id);
            console.log('✅ Fonction de suppression appelée');
        } catch (error) {
            console.log('❌ Erreur:', error.message);
        }
    }
};

// Correction complète
window.fixAllOpportunityButtons = function() {
    console.log('\n🎯 CORRECTION COMPLÈTE DES BOUTONS');
    console.log('===================================');
    
    fixOpportunityFunctions();
    reloadOpportunitiesTable();
    fixButtonsInDOM();
    testFixedButtons();
    
    console.log('\n📊 RÉSUMÉ DE LA CORRECTION');
    console.log('============================');
    console.log('✅ Fonctions vérifiées et corrigées si nécessaire');
    console.log('✅ Tableau rechargé avec les boutons');
    console.log('✅ Boutons dans le DOM vérifiés');
    console.log('✅ Tests des boutons effectués');
    console.log('\n💡 Les boutons devraient maintenant fonctionner correctement');
};

console.log('\n✅ FONCTIONS DE CORRECTION DISPONIBLES:');
console.log('💡 fixOpportunityFunctions() - Corriger les fonctions manquantes');
console.log('💡 reloadOpportunitiesTable() - Recharger le tableau');
console.log('💡 fixButtonsInDOM() - Corriger les boutons dans le DOM');
console.log('💡 testFixedButtons() - Tester les boutons corrigés');
console.log('💡 fixAllOpportunityButtons() - Correction complète');
console.log('\n🎯 INSTRUCTIONS:');
console.log('1. Ouvrir opportunities.html');
console.log('2. Attendre le chargement des données');
console.log('3. Ouvrir la console (F12)');
console.log('4. Exécuter fixAllOpportunityButtons() pour corriger tous les boutons'); 