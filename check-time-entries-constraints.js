const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'password'
});

async function checkConstraints() {
    try {
        console.log('🔍 Vérification des contraintes de la table time_entries...');
        
        // Vérifier les contraintes de clé étrangère
        const fkQuery = `
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'time_entries' 
            AND tc.constraint_type = 'FOREIGN KEY';
        `;
        
        const fkResult = await pool.query(fkQuery);
        console.log('📋 Contraintes de clé étrangère:');
        fkResult.rows.forEach(row => {
            console.log(`  - ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
        });
        
        // Vérifier les contraintes CHECK
        const checkQuery = `
            SELECT 
                constraint_name,
                check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name IN (
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'time_entries' 
                AND constraint_type = 'CHECK'
            );
        `;
        
        const checkResult = await pool.query(checkQuery);
        console.log('\n📋 Contraintes CHECK:');
        checkResult.rows.forEach(row => {
            console.log(`  - ${row.constraint_name}: ${row.check_clause}`);
        });
        
        // Vérifier la structure de la table
        const structureQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = 'time_entries'
            ORDER BY ordinal_position;
        `;
        
        const structureResult = await pool.query(structureQuery);
        console.log('\n📋 Structure de la table time_entries:');
        structureResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des contraintes:', error);
    } finally {
        await pool.end();
    }
}

checkConstraints(); 