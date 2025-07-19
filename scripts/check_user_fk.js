const { pool } = require('../src/utils/database');

async function checkUserFK() {
    try {
        console.log('🔍 Vérification de la contrainte user_id...\n');
        
        // Vérifier la contrainte spécifique
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
            AND tc.table_name='time_entries'
            AND kcu.column_name = 'user_id';
        `);
        
        if (fkResult.rows.length > 0) {
            console.log('📋 Contrainte user_id trouvée:');
            fkResult.rows.forEach(row => {
                console.log(`  - ${row.constraint_name}: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
            });
            
            // Vérifier si la table référencée existe
            const tableName = fkResult.rows[0].foreign_table_name;
            const existsResult = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
            `, [tableName]);
            
            console.log(`\n📋 Table référencée '${tableName}': ${existsResult.rows[0].exists ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);
            
            if (existsResult.rows[0].exists) {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                console.log(`    📊 Nombre d'enregistrements: ${countResult.rows[0].count}`);
                
                // Afficher quelques enregistrements
                const sampleResult = await pool.query(`SELECT id, nom FROM ${tableName} LIMIT 3`);
                console.log(`    📋 Exemples d'enregistrements:`);
                sampleResult.rows.forEach(row => {
                    console.log(`      - ${row.nom} (ID: ${row.id})`);
                });
            }
        } else {
            console.log('❌ Aucune contrainte user_id trouvée');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkUserFK(); 