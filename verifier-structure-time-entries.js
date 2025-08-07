const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'Canaan@2020'
});

async function checkTimeEntriesStructure() {
    try {
        console.log('🔍 Vérification de la structure de time_entries...\n');
        
        // Structure de la table
        const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' 
            ORDER BY ordinal_position;
        `);
        
        console.log('📋 Structure de time_entries:');
        structureResult.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? 'DEFAULT ' + row.column_default : ''}`);
        });
        
        console.log('\n🔍 Contraintes de vérification:');
        const constraintsResult = await pool.query(`
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE constraint_name LIKE '%time_entries%';
        `);
        
        constraintsResult.rows.forEach(row => {
            console.log(`  ${row.constraint_name}: ${row.check_clause}`);
        });
        
        console.log('\n🔍 Contraintes de la table:');
        const tableConstraintsResult = await pool.query(`
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'time_entries';
        `);
        
        tableConstraintsResult.rows.forEach(row => {
            console.log(`  ${row.constraint_name}: ${row.constraint_type}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesStructure();
