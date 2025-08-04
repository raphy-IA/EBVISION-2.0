require('dotenv').config();
const { pool } = require('./src/utils/database');

async function checkMissionsStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table missions...');
        
        // Vérifier les colonnes de la table missions
        const columnsResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Colonnes de la table missions:');
        columnsResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        
        // Vérifier s'il y a des colonnes liées aux taux horaires
        const tauxHoraireColumns = columnsResult.rows.filter(col => 
            col.column_name.toLowerCase().includes('taux') || 
            col.column_name.toLowerCase().includes('horaire')
        );
        
        console.log('\n🔍 Colonnes liées aux taux horaires:');
        if (tauxHoraireColumns.length > 0) {
            tauxHoraireColumns.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('  Aucune colonne trouvée');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMissionsStructure(); 