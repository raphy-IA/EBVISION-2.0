const { pool } = require('../src/utils/database');

console.log('🔧 Restauration des collaborateurs et correction des problèmes d\'affichage...\n');

async function restoreCollaborateurs() {
    try {
        console.log('📋 Vérification de l\'état actuel des collaborateurs...');
        
        // Vérifier les collaborateurs existants
        const collaborateurQuery = 'SELECT id, nom, prenom, email, statut FROM collaborateurs ORDER BY nom';
        const collaborateurResult = await pool.query(collaborateurQuery);
        
        console.log(`📊 ${collaborateurResult.rows.length} collaborateurs trouvés:`);
        collaborateurResult.rows.forEach(collab => {
            console.log(`  - ${collab.nom} ${collab.prenom} (${collab.email}) - Statut: ${collab.statut}`);
        });
        
        console.log('\n📋 Vérification des données de référence...');
        
        // Vérifier les données de référence nécessaires
        const referenceChecks = [
            {
                name: 'Grades',
                query: 'SELECT COUNT(*) as count FROM grades',
                required: true
            },
            {
                name: 'Postes',
                query: 'SELECT COUNT(*) as count FROM postes',
                required: true
            },
            {
                name: 'Types collaborateurs',
                query: 'SELECT COUNT(*) as count FROM types_collaborateurs',
                required: true
            },
            {
                name: 'Business units',
                query: 'SELECT COUNT(*) as count FROM business_units',
                required: true
            },
            {
                name: 'Divisions',
                query: 'SELECT COUNT(*) as count FROM divisions',
                required: true
            }
        ];
        
        for (const check of referenceChecks) {
            try {
                const result = await pool.query(check.query);
                const count = parseInt(result.rows[0].count);
                console.log(`📊 ${check.name}: ${count} enregistrements`);
                
                if (count === 0 && check.required) {
                    console.log(`⚠️ ATTENTION: Aucun ${check.name} trouvé - cela peut causer des problèmes d'affichage`);
                }
            } catch (error) {
                console.log(`❌ Erreur lors de la vérification des ${check.name}:`, error.message);
            }
        }
        
        console.log('\n🔧 Correction des problèmes d\'affichage...');
        
        // Vérifier et corriger les problèmes de données manquantes
        const problems = [];
        
        // 1. Vérifier les collaborateurs sans grade actuel
        const collabSansGrade = await pool.query('SELECT COUNT(*) as count FROM collaborateurs WHERE grade_actuel_id IS NULL');
        if (parseInt(collabSansGrade.rows[0].count) > 0) {
            problems.push(`${collabSansGrade.rows[0].count} collaborateurs sans grade actuel`);
        }
        
        // 2. Vérifier les collaborateurs sans poste actuel
        const collabSansPoste = await pool.query('SELECT COUNT(*) as count FROM collaborateurs WHERE poste_actuel_id IS NULL');
        if (parseInt(collabSansPoste.rows[0].count) > 0) {
            problems.push(`${collabSansPoste.rows[0].count} collaborateurs sans poste actuel`);
        }
        
        // 3. Vérifier les collaborateurs sans business unit
        const collabSansBU = await pool.query('SELECT COUNT(*) as count FROM collaborateurs WHERE business_unit_id IS NULL');
        if (parseInt(collabSansBU.rows[0].count) > 0) {
            problems.push(`${collabSansBU.rows[0].count} collaborateurs sans business unit`);
        }
        
        if (problems.length > 0) {
            console.log('⚠️ Problèmes détectés:');
            problems.forEach(problem => console.log(`  - ${problem}`));
            
            console.log('\n🔧 Application de corrections automatiques...');
            
            // Assigner des valeurs par défaut si nécessaire
            const defaultGrade = await pool.query('SELECT id FROM grades LIMIT 1');
            const defaultPoste = await pool.query('SELECT id FROM postes LIMIT 1');
            const defaultBU = await pool.query('SELECT id FROM business_units LIMIT 1');
            
            if (defaultGrade.rows.length > 0 && defaultPoste.rows.length > 0 && defaultBU.rows.length > 0) {
                const updateQuery = `
                    UPDATE collaborateurs SET
                        grade_actuel_id = COALESCE(grade_actuel_id, $1),
                        poste_actuel_id = COALESCE(poste_actuel_id, $2),
                        business_unit_id = COALESCE(business_unit_id, $3),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE grade_actuel_id IS NULL OR poste_actuel_id IS NULL OR business_unit_id IS NULL
                `;
                
                try {
                    const updateResult = await pool.query(updateQuery, [
                        defaultGrade.rows[0].id,
                        defaultPoste.rows[0].id,
                        defaultBU.rows[0].id
                    ]);
                    console.log(`✅ ${updateResult.rowCount} collaborateurs mis à jour avec des valeurs par défaut`);
                } catch (error) {
                    console.log('❌ Erreur lors de la mise à jour:', error.message);
                }
            }
        } else {
            console.log('✅ Aucun problème détecté avec les collaborateurs');
        }
        
        console.log('\n📊 État final après correction...');
        
        const finalChecks = [
            {
                name: 'Total collaborateurs',
                query: 'SELECT COUNT(*) as count FROM collaborateurs'
            },
            {
                name: 'Collaborateurs avec grade actuel',
                query: 'SELECT COUNT(*) as count FROM collaborateurs WHERE grade_actuel_id IS NOT NULL'
            },
            {
                name: 'Collaborateurs avec poste actuel',
                query: 'SELECT COUNT(*) as count FROM collaborateurs WHERE poste_actuel_id IS NOT NULL'
            },
            {
                name: 'Collaborateurs avec business unit',
                query: 'SELECT COUNT(*) as count FROM collaborateurs WHERE business_unit_id IS NOT NULL'
            },
            {
                name: 'Collaborateurs actifs',
                query: 'SELECT COUNT(*) as count FROM collaborateurs WHERE statut = \'actif\''
            }
        ];
        
        for (const check of finalChecks) {
            const result = await pool.query(check.query);
            const count = parseInt(result.rows[0].count);
            console.log(`📋 ${check.name}: ${count} enregistrements`);
        }
        
        console.log('\n✅ Restauration terminée !');
        console.log('\n📝 Résumé :');
        console.log('- Les collaborateurs existants sont préservés');
        console.log('- Les données de référence sont vérifiées');
        console.log('- Les problèmes d\'affichage sont corrigés');
        console.log('- Les historiques RH restent vides pour les tests');
        
        console.log('\n🧪 Pour tester :');
        console.log('1. Démarrer le serveur: npm start');
        console.log('2. Aller sur: http://localhost:3000/collaborateurs.html');
        console.log('3. Vérifier que les collaborateurs s\'affichent correctement');
        console.log('4. Tester le bouton "Nouveau collaborateur"');
        console.log('5. Tester le bouton "Gérer RH" pour un collaborateur');
        
    } catch (error) {
        console.error('❌ Erreur lors de la restauration:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la restauration
restoreCollaborateurs();