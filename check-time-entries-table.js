require('dotenv').config();
const { pool } = require('./src/utils/database');

async function checkTimeEntriesTable() {
    console.log('🔍 Vérification de la structure de la table time_entries...\n');
    
    try {
        // 1. Vérifier la structure de la table
        const structureQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_entries'
            ORDER BY ordinal_position
        `;
        
        const structureResult = await pool.query(structureQuery);
        
        console.log('📋 Structure de la table time_entries:');
        structureResult.rows.forEach((column, index) => {
            console.log(`  ${index + 1}. ${column.column_name} (${column.data_type}) - Nullable: ${column.is_nullable}`);
        });
        
        console.log('\n🔍 Vérification des contraintes...');
        
        // 2. Vérifier les contraintes
        const constraintsQuery = `
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint
            WHERE conrelid = 'time_entries'::regclass
            AND contype = 'c'
            ORDER BY conname
        `;
        
        const constraintsResult = await pool.query(constraintsQuery);
        
        console.log('📋 Contraintes de vérification:');
        constraintsResult.rows.forEach((constraint, index) => {
            console.log(`  ${index + 1}. ${constraint.constraint_name}: ${constraint.constraint_definition}`);
        });
        
        // 3. Vérifier quelques exemples de données
        const sampleQuery = `
            SELECT * FROM time_entries 
            LIMIT 3
        `;
        
        const sampleResult = await pool.query(sampleQuery);
        
        console.log('\n📋 Exemples de données:');
        sampleResult.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ID: ${row.id}`);
            console.log(`     - Time Sheet ID: ${row.time_sheet_id}`);
            console.log(`     - User ID: ${row.user_id}`);
            console.log(`     - Date: ${row.date_saisie}`);
            console.log(`     - Heures: ${row.heures}`);
            console.log(`     - Type: ${row.type_heures}`);
            console.log(`     - Mission ID: ${row.mission_id}`);
            console.log(`     - Task ID: ${row.task_id}`);
            console.log(`     - Internal Activity ID: ${row.internal_activity_id}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesTable().catch(console.error);
