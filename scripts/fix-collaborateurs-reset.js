const { pool } = require('../src/utils/database');

console.log('🔧 Correction de la réinitialisation des collaborateurs...\n');

async function fixCollaborateursReset() {
    try {
        console.log('📋 Vérification de la structure de la table collaborateurs...');
        
        // Vérifier la structure de la table
        const structureQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs' 
            AND column_name IN ('id', 'grade_actuel_id', 'poste_actuel_id', 'business_unit_id', 'division_id')
            ORDER BY column_name
        `;
        
        const structureResult = await pool.query(structureQuery);
        console.log('📊 Structure de la table collaborateurs:');
        structureResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        
        console.log('\n🔄 Réinitialisation des informations actuelles...');
        
        // Réinitialiser les informations actuelles des collaborateurs
        const resetQuery = `
            UPDATE collaborateurs SET
                grade_actuel_id = NULL,
                poste_actuel_id = NULL,
                business_unit_id = NULL,
                division_id = NULL,
                updated_at = CURRENT_TIMESTAMP
        `;
        
        try {
            const resetResult = await pool.query(resetQuery);
            console.log(`✅ ${resetResult.rowCount} collaborateurs réinitialisés`);
        } catch (error) {
            console.log('❌ Erreur lors de la réinitialisation:', error.message);
        }
        
        // Vérifier l'état final
        console.log('\n📊 Vérification de l\'état final...');
        
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
                name: 'Collaborateurs avec division',
                query: 'SELECT COUNT(*) as count FROM collaborateurs WHERE division_id IS NOT NULL'
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
        
        console.log('\n✅ Réinitialisation terminée !');
        console.log('\n📝 État actuel :');
        console.log('- Tous les historiques RH ont été supprimés');
        console.log('- Les informations actuelles des collaborateurs ont été réinitialisées');
        console.log('- Vous pouvez maintenant faire des tests depuis le début');
        
        console.log('\n🧪 Pour tester :');
        console.log('1. Démarrer le serveur: npm start');
        console.log('2. Aller sur: http://localhost:3000/collaborateurs.html');
        console.log('3. Cliquer sur "Gérer RH" pour un collaborateur');
        console.log('4. Vérifier que les historiques sont vides');
        console.log('5. Ajouter de nouvelles évolutions pour tester');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la correction
fixCollaborateursReset();