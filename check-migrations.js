const { pool } = require('./src/utils/database.js');

async function checkMigrations() {
    try {
        const result = await pool.query('SELECT * FROM migrations ORDER BY id');
        
        console.log('Migrations appliquées:');
        result.rows.forEach(row => {
            console.log(`${row.id}: ${row.name}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

checkMigrations(); 