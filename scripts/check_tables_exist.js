const { pool } = require('../src/utils/database');

async function checkTablesExist() {
    try {
        console.log('🔍 Vérification de l\'existence des tables...\n');
        
        const tables = ['collaborateurs', 'missions', 'clients', 'feuilles_temps', 'time_entries'];
        
        for (const table of tables) {
            const result = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
            `, [table]);
            
            const exists = result.rows[0].exists;
            console.log(`${exists ? '✅' : '❌'} Table ${table}: ${exists ? 'EXISTE' : 'N\'EXISTE PAS'}`);
            
            if (exists) {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   📊 Nombre d'enregistrements: ${countResult.rows[0].count}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkTablesExist(); 