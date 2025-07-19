const { pool } = require('../src/utils/database');

async function checkMissionsStructure() {
    try {
        console.log('🔍 Structure de la table missions:\n');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ La table missions n\'a pas de colonnes ou n\'existe pas');
            return;
        }
        
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
            if (row.column_default) {
                console.log(`    Default: ${row.column_default}`);
            }
        });
        
        // Vérifier s'il y a des données
        const countResult = await pool.query('SELECT COUNT(*) as count FROM missions');
        console.log(`\n📊 Nombre de missions: ${countResult.rows[0].count}`);
        
        if (countResult.rows[0].count > 0) {
            const sampleResult = await pool.query('SELECT * FROM missions LIMIT 3');
            console.log('\n📋 Exemples de missions:');
            sampleResult.rows.forEach(row => {
                console.log(`  - ${row.titre} (${row.statut})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMissionsStructure(); 