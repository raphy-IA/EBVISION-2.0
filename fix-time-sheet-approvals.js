// Script de correction pour la page de validation des feuilles de temps
const fs = require('fs');
const path = require('path');

console.log('🔧 Correction de la page de validation des feuilles de temps...');

// 1. Corriger le problème de récupération des données dans time-sheet-approvals.js
const timeSheetApprovalsPath = path.join(__dirname, 'public', 'js', 'time-sheet-approvals.js');

if (fs.existsSync(timeSheetApprovalsPath)) {
    console.log('📝 Correction du fichier time-sheet-approvals.js...');
    
    let content = fs.readFileSync(timeSheetApprovalsPath, 'utf8');
    
    // Corriger la fonction getTotalHours pour utiliser les vraies données
    const getTotalHoursFix = `
function getTotalHours(sheet, type) {
    // Récupérer les vraies données depuis les entrées de temps
    if (!sheet.timeEntries) {
        return type === 'chargeable' ? '0' : type === 'non-chargeable' ? '0' : '0';
    }
    
    const entries = sheet.timeEntries;
    
    if (type === 'chargeable') {
        return entries
            .filter(entry => entry.type_heures === 'chargeable')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    } else if (type === 'non-chargeable') {
        return entries
            .filter(entry => entry.type_heures === 'non_chargeable')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    } else {
        return entries
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    }
}`;

    // Remplacer la fonction getTotalHours existante
    content = content.replace(
        /function getTotalHours\(sheet, type\) \{[\s\S]*?\}/,
        getTotalHoursFix
    );
    
    // Corriger la fonction loadTimeSheets pour charger les entrées de temps
    const loadTimeSheetsFix = `
async function loadTimeSheets() {
    try {
        console.log('📊 Chargement des feuilles de temps...');
        
        const response = await fetch('/api/time-sheet-approvals/pending', {
            headers: {
                'Authorization': \`Bearer \${localStorage.getItem('authToken')}\`
            }
        });

        if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }

        const data = await response.json();
        allTimeSheets = data.data || [];
        
        console.log(\`✅ \${allTimeSheets.length} feuilles de temps chargées\`);
        
        // Charger les entrées de temps pour chaque feuille
        for (let sheet of allTimeSheets) {
            try {
                const entriesResponse = await fetch(\`/api/time-entries?time_sheet_id=\${sheet.id}\`, {
                    headers: {
                        'Authorization': \`Bearer \${localStorage.getItem('authToken')}\`
                    }
                });
                
                if (entriesResponse.ok) {
                    const entriesData = await entriesResponse.json();
                    sheet.timeEntries = entriesData.data || [];
                    console.log(\`📊 \${sheet.timeEntries.length} entrées chargées pour la feuille \${sheet.id}\`);
                }
            } catch (error) {
                console.error(\`❌ Erreur lors du chargement des entrées pour la feuille \${sheet.id}:\`, error);
                sheet.timeEntries = [];
            }
        }
        
        // Charger et afficher le filtre par collaborateur
        await loadCollaborateurFilter();
        
        // Afficher les feuilles de temps
        displayTimeSheets();
        
        // Mettre à jour les statistiques
        updateStats();
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des feuilles de temps:', error);
        showAlert('Erreur lors du chargement des feuilles de temps', 'danger');
    }
}`;

    // Remplacer la fonction loadTimeSheets existante
    content = content.replace(
        /async function loadTimeSheets\(\) \{[\s\S]*?\}/,
        loadTimeSheetsFix
    );
    
    // Corriger la fonction generateTimeSheetRows pour gérer les types d'heures correctement
    const generateTimeSheetRowsFix = `
function generateTimeSheetRows(weekStart, weekEnd, timeEntries) {
    const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    
    let rows = '';
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dateString = currentDate.toISOString().split('T')[0];
        const dayName = weekDays[i];
        
        // Trouver les entrées pour ce jour
        const dayEntries = timeEntries.filter(entry => {
            const entryDate = new Date(entry.date_saisie);
            return entryDate.toISOString().split('T')[0] === dateString;
        });
        
        // Calculer les heures pour ce jour
        const chargeableHours = dayEntries
            .filter(entry => entry.type_heures === 'chargeable')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0);
            
        const nonChargeableHours = dayEntries
            .filter(entry => entry.type_heures === 'non_chargeable')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0);
            
        const totalDayHours = chargeableHours + nonChargeableHours;
        
        rows += \`
            <tr>
                <td><strong>\${dayName}</strong><br><small class="text-muted">\${formatDate(dateString)}</small></td>
                <td class="text-center">\${chargeableHours > 0 ? chargeableHours + 'h' : '-'}</td>
                <td class="text-center">\${nonChargeableHours > 0 ? nonChargeableHours + 'h' : '-'}</td>
                <td class="text-center"><strong>\${totalDayHours > 0 ? totalDayHours + 'h' : '-'}</strong></td>
            </tr>
        \`;
    }
    
    return rows;
}`;

    // Remplacer la fonction generateTimeSheetRows existante
    content = content.replace(
        /function generateTimeSheetRows\(weekStart, weekEnd, timeEntries\) \{[\s\S]*?\}/,
        generateTimeSheetRowsFix
    );
    
    // Corriger la fonction calculateTotalHours
    const calculateTotalHoursFix = `
function calculateTotalHours(timeEntries, type) {
    if (type === 'all') {
        return timeEntries.reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0).toFixed(2);
    } else if (type === 'chargeable') {
        return timeEntries
            .filter(entry => entry.type_heures === 'chargeable')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    } else if (type === 'non-chargeable') {
        return timeEntries
            .filter(entry => entry.type_heures === 'non_chargeable')
            .reduce((sum, entry) => sum + (parseFloat(entry.heures) || 0), 0)
            .toFixed(2);
    }
    return '0.00';
}`;

    // Remplacer la fonction calculateTotalHours existante
    content = content.replace(
        /function calculateTotalHours\(timeEntries, type\) \{[\s\S]*?\}/,
        calculateTotalHoursFix
    );
    
    // Sauvegarder les modifications
    fs.writeFileSync(timeSheetApprovalsPath, content, 'utf8');
    console.log('✅ Fichier time-sheet-approvals.js corrigé');
} else {
    console.log('❌ Fichier time-sheet-approvals.js non trouvé');
}

// 2. Corriger le problème d'affichage dans time-sheet-approvals.html
const timeSheetApprovalsHtmlPath = path.join(__dirname, 'public', 'time-sheet-approvals.html');

if (fs.existsSync(timeSheetApprovalsHtmlPath)) {
    console.log('📝 Correction du fichier time-sheet-approvals.html...');
    
    let content = fs.readFileSync(timeSheetApprovalsHtmlPath, 'utf8');
    
    // Ajouter un script de débogage pour identifier les problèmes
    const debugScript = `
    <script>
        // Script de débogage pour la page de validation
        console.log('🔍 Débogage de la page de validation des feuilles de temps');
        
        // Vérifier que tous les éléments nécessaires sont présents
        document.addEventListener('DOMContentLoaded', function() {
            const requiredElements = [
                'time-sheets-container',
                'pending-count',
                'approved-count',
                'rejected-count',
                'total-count',
                'collaborateur-filter-container',
                'approvalModal',
                'commentModal'
            ];
            
            console.log('🔍 Vérification des éléments requis:');
            requiredElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    console.log(\`✅ \${id}: présent\`);
                } else {
                    console.log(\`❌ \${id}: manquant\`);
                }
            });
            
            // Vérifier les boutons de filtre
            const filterButtons = document.querySelectorAll('.filter-buttons .btn');
            console.log(\`📊 Boutons de filtre trouvés: \${filterButtons.length}\`);
            
            // Vérifier les modals
            const approvalModal = document.getElementById('approvalModal');
            const commentModal = document.getElementById('commentModal');
            
            if (approvalModal) {
                console.log('✅ Modal d\'approbation: présent');
            } else {
                console.log('❌ Modal d\'approbation: manquant');
            }
            
            if (commentModal) {
                console.log('✅ Modal de commentaire: présent');
            } else {
                console.log('❌ Modal de commentaire: manquant');
            }
        });
    </script>`;

    // Ajouter le script de débogage avant la fermeture de </body>
    content = content.replace('</body>', debugScript + '\n</body>');
    
    // Sauvegarder les modifications
    fs.writeFileSync(timeSheetApprovalsHtmlPath, content, 'utf8');
    console.log('✅ Fichier time-sheet-approvals.html corrigé');
} else {
    console.log('❌ Fichier time-sheet-approvals.html non trouvé');
}

// 3. Créer un script de test pour vérifier les corrections
const testScript = `
// Script de test pour la page de validation
async function testTimeSheetApprovals() {
    console.log('🧪 Test de la page de validation des feuilles de temps...');
    
    try {
        // Test 1: Vérifier l'authentification
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('❌ Pas de token d\'authentification');
            return;
        }
        console.log('✅ Token d\'authentification présent');
        
        // Test 2: Tester l'API des feuilles en attente
        const response = await fetch('/api/time-sheet-approvals/pending', {
            headers: {
                'Authorization': \`Bearer \${token}\`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(\`✅ API des feuilles en attente: \${data.data?.length || 0} feuilles\`);
        } else {
            console.log(\`❌ Erreur API des feuilles en attente: \${response.status}\`);
        }
        
        // Test 3: Tester l'API des entrées de temps
        const entriesResponse = await fetch('/api/time-entries?time_sheet_id=test', {
            headers: {
                'Authorization': \`Bearer \${token}\`
            }
        });
        
        if (entriesResponse.ok) {
            const entriesData = await entriesResponse.json();
            console.log(\`✅ API des entrées de temps: \${entriesData.data?.length || 0} entrées\`);
        } else {
            console.log(\`❌ Erreur API des entrées de temps: \${entriesResponse.status}\`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
    }
}

// Exécuter le test
testTimeSheetApprovals();
`;

// Sauvegarder le script de test
const testScriptPath = path.join(__dirname, 'test-time-sheet-approvals.js');
fs.writeFileSync(testScriptPath, testScript, 'utf8');
console.log('✅ Script de test créé: test-time-sheet-approvals.js');

console.log('\n🎯 Corrections appliquées:');
console.log('1. ✅ Fonction getTotalHours corrigée pour utiliser les vraies données');
console.log('2. ✅ Fonction loadTimeSheets corrigée pour charger les entrées de temps');
console.log('3. ✅ Fonction generateTimeSheetRows corrigée pour les types d\'heures');
console.log('4. ✅ Fonction calculateTotalHours corrigée');
console.log('5. ✅ Script de débogage ajouté à la page HTML');
console.log('6. ✅ Script de test créé');

console.log('\n📋 Prochaines étapes:');
console.log('1. Recharger la page de validation');
console.log('2. Vérifier les logs dans la console du navigateur');
console.log('3. Tester les fonctionnalités d\'approbation/rejet');
console.log('4. Vérifier l\'affichage des détails des feuilles de temps');
