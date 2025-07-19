const { pool } = require('../src/utils/database');

async function checkForeignKeys() {
    try {
        console.log('🔍 Vérification des clés étrangères de time_entries...\n');
        
        // Vérifier les contraintes de clés étrangères
        const fkResult = await pool.query(`
            SELECT 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name='time_entries';
        `);
        
        console.log('📋 Clés étrangères de time_entries:');
        fkResult.rows.forEach(row => {
            console.log(`  - ${row.constraint_name}: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
        });
        
        // Vérifier si les tables référencées existent
        console.log('\n📋 Vérification des tables référencées:');
        const tables = ['utilisateurs', 'missions', 'types_heures_non_chargeables'];
        
        for (const table of tables) {
            const existsResult = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
            `, [table]);
            
            const exists = existsResult.rows[0].exists;
            console.log(`  - ${table}: ${exists ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);
            
            if (exists) {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`    📊 Nombre d'enregistrements: ${countResult.rows[0].count}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkForeignKeys(); 