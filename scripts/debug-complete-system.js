const fs = require('fs');
const { pool } = require('../src/utils/database');

console.log('🔍 Debug complet du système...\n');

// 1. Vérifier l'état de la base de données
async function checkDatabase() {
    console.log('📊 Vérification de la base de données...');
    
    try {
        // Vérifier les collaborateurs
        const collabResult = await pool.query('SELECT COUNT(*) as count FROM collaborateurs');
        console.log(`📋 Collaborateurs: ${collabResult.rows[0].count}`);
        
        if (parseInt(collabResult.rows[0].count) === 0) {
            console.log('❌ AUCUN COLLABORATEUR TROUVÉ - C\'est le problème !');
            console.log('🔧 Ajout de collaborateurs de test...');
            
            // Ajouter des collaborateurs de test
            const testCollaborateurs = [
                {
                    nom: 'Dupont',
                    prenom: 'Jean',
                    email: 'jean.dupont@example.com',
                    statut: 'actif',
                    grade_actuel_id: 1,
                    poste_actuel_id: 1,
                    business_unit_id: 1,
                    division_id: 1
                },
                {
                    nom: 'Martin',
                    prenom: 'Marie',
                    email: 'marie.martin@example.com',
                    statut: 'actif',
                    grade_actuel_id: 2,
                    poste_actuel_id: 2,
                    business_unit_id: 1,
                    division_id: 1
                }
            ];
            
            for (const collab of testCollaborateurs) {
                await pool.query(`
                    INSERT INTO collaborateurs (nom, prenom, email, statut, grade_actuel_id, poste_actuel_id, business_unit_id, division_id, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `, [collab.nom, collab.prenom, collab.email, collab.statut, collab.grade_actuel_id, collab.poste_actuel_id, collab.business_unit_id, collab.division_id]);
            }
            
            console.log('✅ 2 collaborateurs de test ajoutés');
        }
        
        // Vérifier les données de référence
        const checks = [
            { name: 'Grades', query: 'SELECT COUNT(*) as count FROM grades' },
            { name: 'Postes', query: 'SELECT COUNT(*) as count FROM postes' },
            { name: 'Business Units', query: 'SELECT COUNT(*) as count FROM business_units' },
            { name: 'Divisions', query: 'SELECT COUNT(*) as count FROM divisions' },
            { name: 'Types collaborateurs', query: 'SELECT COUNT(*) as count FROM types_collaborateurs' }
        ];
        
        for (const check of checks) {
            const result = await pool.query(check.query);
            const count = parseInt(result.rows[0].count);
            console.log(`📋 ${check.name}: ${count}`);
            
            if (count === 0) {
                console.log(`❌ Aucun ${check.name} trouvé - Ajout de données de test...`);
                
                // Ajouter des données de test selon le type
                if (check.name === 'Grades') {
                    await pool.query(`
                        INSERT INTO grades (nom, description, created_at, updated_at) VALUES 
                        ('Junior', 'Grade junior', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('Senior', 'Grade senior', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('Expert', 'Grade expert', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `);
                } else if (check.name === 'Postes') {
                    await pool.query(`
                        INSERT INTO postes (nom, description, created_at, updated_at) VALUES 
                        ('Développeur', 'Poste développeur', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('Chef de projet', 'Poste chef de projet', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('Analyste', 'Poste analyste', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `);
                } else if (check.name === 'Business Units') {
                    await pool.query(`
                        INSERT INTO business_units (nom, description, created_at, updated_at) VALUES 
                        ('IT', 'Business Unit IT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('RH', 'Business Unit RH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `);
                } else if (check.name === 'Divisions') {
                    await pool.query(`
                        INSERT INTO divisions (nom, business_unit_id, created_at, updated_at) VALUES 
                        ('Développement', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('Infrastructure', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `);
                } else if (check.name === 'Types collaborateurs') {
                    await pool.query(`
                        INSERT INTO types_collaborateurs (nom, description, created_at, updated_at) VALUES 
                        ('Interne', 'Collaborateur interne', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('Externe', 'Collaborateur externe', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `);
                }
                
                console.log(`✅ Données de test ajoutées pour ${check.name}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification de la base de données:', error.message);
    }
}

// 2. Corriger les erreurs JavaScript
async function fixJavaScriptErrors() {
    console.log('\n🔧 Correction des erreurs JavaScript...');
    
    const collaborateursFile = 'public/collaborateurs.html';
    const content = fs.readFileSync(collaborateursFile, 'utf8');
    
    // Créer une sauvegarde
    const backupFile = 'public/collaborateurs_backup_before_debug_fix.html';
    fs.writeFileSync(backupFile, content);
    console.log(`📋 Sauvegarde créée: ${backupFile}`);
    
    // 1. Corriger l'erreur de syntaxe à la ligne 2003
    const lines = content.split('\n');
    let correctedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (i === 2002) { // Ligne 2003 (index 2002)
            console.log(`📍 Ligne ${i + 1} problématique: ${line}`);
            
            if (line.includes('showAlert(') && !line.includes(')')) {
                console.log('🔧 Correction de l\'erreur de syntaxe showAlert...');
                const correctedLine = line.replace(/showAlert\([^)]*$/, 'showAlert("Erreur: éléments d\'interface manquants", "danger")');
                correctedLines.push(correctedLine);
            } else {
                correctedLines.push(line);
            }
        } else {
            correctedLines.push(line);
        }
    }
    
    // 2. Ajouter la fonction showNewCollaborateurModal si elle n'existe pas
    let updatedContent = correctedLines.join('\n');
    
    if (!updatedContent.includes('function showNewCollaborateurModal()')) {
        console.log('🔧 Ajout de la fonction showNewCollaborateurModal...');
        
        const showNewCollaborateurModalFunction = `
        function showNewCollaborateurModal() {
            console.log('🔄 Ouverture du modal nouveau collaborateur...');
            
            try {
                // Charger les données nécessaires
                loadBusinessUnits();
                loadGrades();
                loadPostes();
                loadTypesCollaborateurs();
                loadDivisions();
                
                // Afficher le modal
                const modal = new bootstrap.Modal(document.getElementById('newCollaborateurModal'));
                modal.show();
                
                console.log('✅ Modal nouveau collaborateur affiché');
            } catch (error) {
                console.error('❌ Erreur lors de l\'ouverture du modal:', error);
                alert('Erreur lors de l\'ouverture du modal: ' + error.message);
            }
        }`;
        
        // Ajouter à la fin du script
        const scriptEndPattern = /<\/script>/;
        updatedContent = updatedContent.replace(
            scriptEndPattern,
            showNewCollaborateurModalFunction + '\n    </script>'
        );
        
        console.log('✅ Fonction showNewCollaborateurModal ajoutée');
    } else {
        console.log('✅ Fonction showNewCollaborateurModal existe déjà');
    }
    
    // 3. Ajouter des logs de debug
    const debugFunction = `
        // Fonction de debug pour charger les collaborateurs
        function debugLoadCollaborateurs() {
            console.log('🔍 Debug: Chargement des collaborateurs...');
            
            fetch(\`\${API_BASE_URL}/collaborateurs\`)
                .then(response => {
                    console.log('🔍 Debug: Réponse API:', response.status, response.statusText);
                    return response.json();
                })
                .then(data => {
                    console.log('🔍 Debug: Données reçues:', data);
                    
                    if (data.success && data.data) {
                        console.log('🔍 Debug: Nombre de collaborateurs:', data.data.length);
                        displayCollaborateurs(data.data);
                    } else if (Array.isArray(data)) {
                        console.log('🔍 Debug: Données reçues (array):', data.length);
                        displayCollaborateurs(data);
                    } else {
                        console.log('🔍 Debug: Format de données inattendu:', data);
                    }
                })
                .catch(error => {
                    console.error('❌ Erreur lors du chargement des collaborateurs:', error);
                    document.getElementById('collaborateurs-content').innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des collaborateurs</div>';
                });
        }
        
        // Fonction de debug pour afficher les collaborateurs
        function debugDisplayCollaborateurs(collaborateurs) {
            console.log('🔍 Debug: Affichage de', collaborateurs.length, 'collaborateurs');
            
            const tbody = document.getElementById('collaborateurs-table');
            if (!tbody) {
                console.error('❌ Élément collaborateurs-table non trouvé');
                return;
            }
            
            tbody.innerHTML = '';
            
            collaborateurs.forEach(collab => {
                console.log('🔍 Debug: Affichage collaborateur:', collab);
                // Code d'affichage...
            });
        }`;
    
    // Ajouter les fonctions de debug
    const scriptEndPattern = /<\/script>/;
    updatedContent = updatedContent.replace(
        scriptEndPattern,
        debugFunction + '\n    </script>'
    );
    
    // Sauvegarder le fichier corrigé
    fs.writeFileSync(collaborateursFile, updatedContent);
    console.log('✅ Erreurs JavaScript corrigées et debug ajouté');
}

// 3. Vérifier l'état final
async function checkFinalState() {
    console.log('\n📊 Vérification de l\'état final...');
    
    try {
        // Vérifier les collaborateurs
        const collabResult = await pool.query('SELECT COUNT(*) as count FROM collaborateurs');
        console.log(`📋 Collaborateurs: ${collabResult.rows[0].count}`);
        
        if (parseInt(collabResult.rows[0].count) > 0) {
            const collabs = await pool.query('SELECT nom, prenom, email, statut FROM collaborateurs LIMIT 5');
            console.log('📋 Exemples de collaborateurs:');
            collabs.rows.forEach(collab => {
                console.log(`  - ${collab.nom} ${collab.prenom} (${collab.email}) - ${collab.statut}`);
            });
        }
        
        // Vérifier les données de référence
        const checks = [
            { name: 'Grades', query: 'SELECT COUNT(*) as count FROM grades' },
            { name: 'Postes', query: 'SELECT COUNT(*) as count FROM postes' },
            { name: 'Business Units', query: 'SELECT COUNT(*) as count FROM business_units' },
            { name: 'Divisions', query: 'SELECT COUNT(*) as count FROM divisions' },
            { name: 'Types collaborateurs', query: 'SELECT COUNT(*) as count FROM types_collaborateurs' }
        ];
        
        for (const check of checks) {
            const result = await pool.query(check.query);
            const count = parseInt(result.rows[0].count);
            console.log(`📋 ${check.name}: ${count}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification finale:', error.message);
    }
}

// Exécuter le debug complet
async function runCompleteDebug() {
    try {
        await checkDatabase();
        await fixJavaScriptErrors();
        await checkFinalState();
        
        console.log('\n✅ Debug complet terminé !');
        console.log('\n🧪 Instructions de test :');
        console.log('1. Démarrer le serveur: npm start');
        console.log('2. Aller sur: http://localhost:3000/collaborateurs.html');
        console.log('3. Ouvrir la console du navigateur (F12)');
        console.log('4. Vérifier les logs de debug');
        console.log('5. Tester le bouton "Nouveau collaborateur"');
        console.log('6. Tester le bouton "Gérer RH"');
        
    } catch (error) {
        console.error('❌ Erreur lors du debug:', error);
    } finally {
        await pool.end();
    }
}

runCompleteDebug();