const { pool } = require('../src/utils/database');

async function verifyTimeEntries() {
    try {
        console.log('🔍 Vérification des time entries...\n');
        
        // Vérifier le nombre de time entries
        const countResult = await pool.query('SELECT COUNT(*) as count FROM time_entries');
        console.log(`📊 Nombre total de time entries: ${countResult.rows[0].count}`);
        
        if (countResult.rows[0].count > 0) {
            // Afficher les time entries existants
            const entriesResult = await pool.query(`
                SELECT te.id, te.date_saisie, te.heures, te.type_heures, te.description, te.statut,
                       u.nom as user_nom, m.titre as mission_titre
                FROM time_entries te
                LEFT JOIN utilisateurs u ON te.user_id = u.id
                LEFT JOIN missions m ON te.mission_id = m.id
                ORDER BY te.date_saisie
            `);
            
            console.log('\n📋 Time entries existants:');
            entriesResult.rows.forEach((entry, index) => {
                console.log(`${index + 1}. ${entry.date_saisie}: ${entry.heures}h ${entry.type_heures}`);
                console.log(`   Utilisateur: ${entry.user_nom}`);
                console.log(`   Mission: ${entry.mission_titre || 'Aucune'}`);
                console.log(`   Description: ${entry.description}`);
                console.log(`   Statut: ${entry.statut}`);
                console.log('');
            });
        } else {
            console.log('❌ Aucun time entry trouvé dans la base de données');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

verifyTimeEntries(); 