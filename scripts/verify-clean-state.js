const { pool } = require('../src/utils/database');

console.log('🔍 Vérification de l\'état propre pour les tests...\n');

async function verifyCleanState() {
    try {
        console.log('📋 Vérification des historiques RH...');
        
        // Vérifier les tables d'historique
        const historyTables = [
            'evolution_grades',
            'evolution_postes',
            'evolution_organisations'
        ];
        
        for (const table of historyTables) {
            const countQuery = `SELECT COUNT(*) as count FROM ${table}`;
            const result = await pool.query(countQuery);
            const count = parseInt(result.rows[0].count);
            
            if (count === 0) {
                console.log(`✅ ${table}: Vide (${count} enregistrements)`);
            } else {
                console.log(`❌ ${table}: ${count} enregistrements restants`);
            }
        }
        
        console.log('\n📋 Vérification des collaborateurs...');
        
        // Vérifier l'état des collaborateurs
        const collaborateurChecks = [
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
                name: 'Collaborateurs avec division',
                query: 'SELECT COUNT(*) as count FROM collaborateurs WHERE division_id IS NOT NULL'
            }
        ];
        
        for (const check of collaborateurChecks) {
            const result = await pool.query(check.query);
            const count = parseInt(result.rows[0].count);
            console.log(`📊 ${check.name}: ${count} enregistrements`);
        }
        
        console.log('\n📋 Vérification des données de référence...');
        
        // Vérifier que les données de référence existent
        const referenceChecks = [
            {
                name: 'Grades disponibles',
                query: 'SELECT COUNT(*) as count FROM grades'
            },
            {
                name: 'Postes disponibles',
                query: 'SELECT COUNT(*) as count FROM postes'
            },
            {
                name: 'Types collaborateurs disponibles',
                query: 'SELECT COUNT(*) as count FROM types_collaborateurs'
            },
            {
                name: 'Business units disponibles',
                query: 'SELECT COUNT(*) as count FROM business_units'
            },
            {
                name: 'Divisions disponibles',
                query: 'SELECT COUNT(*) as count FROM divisions'
            }
        ];
        
        for (const check of referenceChecks) {
            try {
                const result = await pool.query(check.query);
                const count = parseInt(result.rows[0].count);
                console.log(`📊 ${check.name}: ${count} enregistrements`);
            } catch (error) {
                console.log(`❌ ${check.name}: Erreur - ${error.message}`);
            }
        }
        
        // Résumé de l'état
        console.log('\n📊 Résumé de l\'état :');
        
        const historyCounts = await Promise.all(historyTables.map(async (table) => {
            const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            return parseInt(result.rows[0].count);
        }));
        
        const totalHistory = historyCounts.reduce((sum, count) => sum + count, 0);
        
        if (totalHistory === 0) {
            console.log('✅ Tous les historiques RH sont vides');
        } else {
            console.log(`❌ Il reste ${totalHistory} enregistrements d'historique`);
        }
        
        const collaborateurResult = await pool.query('SELECT COUNT(*) as count FROM collaborateurs WHERE grade_actuel_id IS NOT NULL OR poste_actuel_id IS NOT NULL');
        const collaborateursAvecInfo = parseInt(collaborateurResult.rows[0].count);
        
        if (collaborateursAvecInfo === 0) {
            console.log('✅ Tous les collaborateurs sont réinitialisés');
        } else {
            console.log(`❌ ${collaborateursAvecInfo} collaborateurs ont encore des informations actuelles`);
        }
        
        console.log('\n🎯 État pour les tests :');
        if (totalHistory === 0 && collaborateursAvecInfo === 0) {
            console.log('✅ PARFAIT ! L\'état est propre pour les tests');
            console.log('✅ Vous pouvez maintenant faire des tests depuis le début');
        } else {
            console.log('⚠️ ATTENTION ! Il reste des données à nettoyer');
            console.log('⚠️ Relancez le script de nettoyage si nécessaire');
        }
        
        console.log('\n🧪 Instructions pour tester :');
        console.log('1. Démarrer le serveur: npm start');
        console.log('2. Aller sur: http://localhost:3000/collaborateurs.html');
        console.log('3. Cliquer sur "Gérer RH" pour un collaborateur');
        console.log('4. Vérifier que les historiques sont vides');
        console.log('5. Ajouter une évolution de grade');
        console.log('6. Ajouter une évolution de poste');
        console.log('7. Ajouter une évolution organisationnelle');
        console.log('8. Vérifier que les historiques se remplissent');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la vérification
verifyCleanState();