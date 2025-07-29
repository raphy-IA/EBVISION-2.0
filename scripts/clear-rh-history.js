const { pool } = require('../src/utils/database');

console.log('🧹 Nettoyage des historiques RH...\n');

async function clearRHHistory() {
    try {
        console.log('📋 Vérification des tables d\'historique...');
        
        // 1. Vérifier les tables existantes
        const tablesToCheck = [
            'evolution_grades',
            'evolution_postes', 
            'evolution_organisations'
        ];
        
        for (const table of tablesToCheck) {
            const checkQuery = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `;
            const exists = await pool.query(checkQuery, [table]);
            
            if (exists.rows[0].exists) {
                console.log(`✅ Table ${table} existe`);
            } else {
                console.log(`❌ Table ${table} n'existe pas`);
            }
        }
        
        console.log('\n🗑️ Suppression des données d\'historique...');
        
        // 2. Supprimer les données d'historique
        const deleteQueries = [
            {
                name: 'Évolutions de grades',
                query: 'DELETE FROM evolution_grades',
                table: 'evolution_grades'
            },
            {
                name: 'Évolutions de postes',
                query: 'DELETE FROM evolution_postes', 
                table: 'evolution_postes'
            },
            {
                name: 'Évolutions organisationnelles',
                query: 'DELETE FROM evolution_organisations',
                table: 'evolution_organisations'
            }
        ];
        
        for (const deleteOp of deleteQueries) {
            try {
                // Vérifier d'abord le nombre d'enregistrements
                const countQuery = `SELECT COUNT(*) as count FROM ${deleteOp.table}`;
                const countResult = await pool.query(countQuery);
                const count = parseInt(countResult.rows[0].count);
                
                if (count > 0) {
                    console.log(`📊 ${deleteOp.name}: ${count} enregistrements trouvés`);
                    
                    // Supprimer les données
                    await pool.query(deleteOp.query);
                    console.log(`✅ ${deleteOp.name}: ${count} enregistrements supprimés`);
                } else {
                    console.log(`ℹ️ ${deleteOp.name}: Aucun enregistrement à supprimer`);
                }
            } catch (error) {
                console.log(`❌ Erreur lors de la suppression de ${deleteOp.name}:`, error.message);
            }
        }
        
        // 3. Réinitialiser les informations actuelles des collaborateurs
        console.log('\n🔄 Réinitialisation des informations actuelles des collaborateurs...');
        
        const resetCollaborateursQuery = `
            UPDATE collaborateurs SET
                grade_actuel_id = NULL,
                poste_actuel_id = NULL,
                business_unit_id = NULL,
                division_id = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id > 0
        `;
        
        try {
            const resetResult = await pool.query(resetCollaborateursQuery);
            console.log(`✅ ${resetResult.rowCount} collaborateurs réinitialisés`);
        } catch (error) {
            console.log('❌ Erreur lors de la réinitialisation des collaborateurs:', error.message);
        }
        
        // 4. Vérifier l'état final
        console.log('\n📊 Vérification de l\'état final...');
        
        const finalChecks = [
            {
                name: 'Évolutions de grades',
                query: 'SELECT COUNT(*) as count FROM evolution_grades'
            },
            {
                name: 'Évolutions de postes',
                query: 'SELECT COUNT(*) as count FROM evolution_postes'
            },
            {
                name: 'Évolutions organisationnelles',
                query: 'SELECT COUNT(*) as count FROM evolution_organisations'
            },
            {
                name: 'Collaborateurs avec grade actuel',
                query: 'SELECT COUNT(*) as count FROM collaborateurs WHERE grade_actuel_id IS NOT NULL'
            },
            {
                name: 'Collaborateurs avec poste actuel',
                query: 'SELECT COUNT(*) as count FROM collaborateurs WHERE poste_actuel_id IS NOT NULL'
            }
        ];
        
        for (const check of finalChecks) {
            try {
                const result = await pool.query(check.query);
                const count = parseInt(result.rows[0].count);
                console.log(`📋 ${check.name}: ${count} enregistrements`);
            } catch (error) {
                console.log(`❌ Erreur lors de la vérification de ${check.name}:`, error.message);
            }
        }
        
        console.log('\n✅ Nettoyage terminé !');
        console.log('\n📝 Résumé :');
        console.log('- Tous les historiques RH ont été supprimés');
        console.log('- Les informations actuelles des collaborateurs ont été réinitialisées');
        console.log('- Vous pouvez maintenant faire des tests depuis le début');
        
        console.log('\n🔧 Prochaines étapes :');
        console.log('1. Démarrer le serveur: npm start');
        console.log('2. Aller sur la page collaborateurs');
        console.log('3. Cliquer sur "Gérer RH" pour un collaborateur');
        console.log('4. Ajouter de nouvelles évolutions pour tester');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le nettoyage
clearRHHistory();