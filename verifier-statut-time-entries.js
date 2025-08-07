const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'Canaan@2020'
});

async function checkTimeEntriesStatus() {
    try {
        console.log('🔍 Vérification du statut dans time_entries...\n');
        
        // Vérifier la colonne statut
        const columnResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' AND column_name = 'statut';
        `);
        
        console.log('📋 Colonne statut:');
        columnResult.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? 'DEFAULT ' + row.column_default : ''}`);
        });
        
        // Vérifier la contrainte de vérification pour statut
        const constraintResult = await pool.query(`
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE constraint_name = 'time_entries_statut_check';
        `);
        
        console.log('\n🔍 Contrainte statut:');
        constraintResult.rows.forEach(row => {
            console.log(`  ${row.constraint_name}: ${row.check_clause}`);
        });
        
        // Vérifier les valeurs actuelles dans la table
        const valuesResult = await pool.query(`
            SELECT statut, COUNT(*) as count 
            FROM time_entries 
            GROUP BY statut 
            ORDER BY count DESC;
        `);
        
        console.log('\n📊 Valeurs actuelles dans time_entries:');
        valuesResult.rows.forEach(row => {
            console.log(`  ${row.statut}: ${row.count} entrées`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesStatus();
