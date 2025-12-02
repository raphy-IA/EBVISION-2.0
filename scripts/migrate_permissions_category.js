const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function migratePermissions() {
    try {
        console.log('🔄 Début de la migration des catégories de permissions...');

        // 1. Compter avant
        const before = await pool.query(`
            SELECT category, COUNT(*) as count
            FROM permissions 
            WHERE code LIKE 'page.%'
            GROUP BY category
        `);
        console.log('\n📊 État actuel :');
        before.rows.forEach(r => console.log(`   - ${r.category}: ${r.count}`));

        // 2. Mise à jour
        const update = await pool.query(`
            UPDATE permissions 
            SET category = 'navigation' 
            WHERE code LIKE 'page.%'
        `);
        console.log(`\n✅ ${update.rowCount} permissions mises à jour vers la catégorie 'navigation'`);

        // 3. Compter après
        const after = await pool.query(`
            SELECT category, COUNT(*) as count
            FROM permissions 
            WHERE code LIKE 'page.%'
            GROUP BY category
        `);
        console.log('\n📊 Nouvel état :');
        after.rows.forEach(r => console.log(`   - ${r.category}: ${r.count}`));

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

migratePermissions();
