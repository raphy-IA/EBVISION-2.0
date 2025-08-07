require('dotenv').config();
const { pool } = require('./src/utils/database');

async function verifierStructureTables() {
    console.log('🔍 Vérification de la structure des tables');
    console.log('=' .repeat(50));
    
    try {
        // 1. Vérifier la structure de time_sheets
        console.log('\n1️⃣ Structure de la table time_sheets:');
        const structureTimeSheetsQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'time_sheets'
            ORDER BY ordinal_position
        `;
        const structureTimeSheetsResult = await pool.query(structureTimeSheetsQuery);
        
        console.log('Colonnes de time_sheets:');
        structureTimeSheetsResult.rows.forEach(row => {
            console.log(`   ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
        // 2. Vérifier la structure de time_entries
        console.log('\n2️⃣ Structure de la table time_entries:');
        const structureTimeEntriesQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'time_entries'
            ORDER BY ordinal_position
        `;
        const structureTimeEntriesResult = await pool.query(structureTimeEntriesQuery);
        
        console.log('Colonnes de time_entries:');
        structureTimeEntriesResult.rows.forEach(row => {
            console.log(`   ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
        // 3. Vérifier quelques données de time_sheets
        console.log('\n3️⃣ Exemples de données time_sheets:');
        const exemplesTimeSheetsQuery = `
            SELECT * FROM time_sheets LIMIT 3
        `;
        const exemplesTimeSheetsResult = await pool.query(exemplesTimeSheetsQuery);
        
        console.log('Exemples de time_sheets:');
        exemplesTimeSheetsResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ID: ${row.id}, Statut: ${row.statut}, Semaine: ${row.week_start} au ${row.week_end}`);
        });
        
        // 4. Vérifier quelques données de time_entries
        console.log('\n4️⃣ Exemples de données time_entries:');
        const exemplesTimeEntriesQuery = `
            SELECT * FROM time_entries LIMIT 3
        `;
        const exemplesTimeEntriesResult = await pool.query(exemplesTimeEntriesQuery);
        
        console.log('Exemples de time_entries:');
        exemplesTimeEntriesResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ID: ${row.id}, Type: ${row.type_heures}, Heures: ${row.heures}, Date: ${row.date_saisie}`);
        });
        
        console.log('\n✅ Vérification de structure terminée !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

verifierStructureTables();
