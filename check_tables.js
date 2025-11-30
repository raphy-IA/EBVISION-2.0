const { query } = require('./src/utils/database');

async function checkTables() {
    try {
        const result = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%objective%'
            ORDER BY table_name
        `);

        console.log('📋 Tables d\'objectifs existantes:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

checkTables();
