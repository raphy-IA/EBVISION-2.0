const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'trs_affichage',
    password: 'postgres',
    port: 5432,
});

async function checkTables() {
    try {
        console.log('🔍 Vérification des tables des étapes d\'opportunité...\n');
        
        // Vérifier les tables opportunity
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%opportunity%'
        `);
        
        console.log('Tables opportunity trouvées:');
        if (result.rows.length > 0) {
            result.rows.forEach(row => {
                console.log(`  - ${row.table_name}`);
            });
        } else {
            console.log('  Aucune table opportunity trouvée');
        }
        
        // Vérifier la table opportunities
        const opportunitiesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'opportunities'
        `);
        
        console.log('\nTable opportunities existe:', opportunitiesResult.rows.length > 0);
        
        if (opportunitiesResult.rows.length > 0) {
            // Vérifier les données
            const dataResult = await pool.query('SELECT COUNT(*) as count FROM opportunities');
            console.log(`Nombre d'opportunités: ${dataResult.rows[0].count}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables(); 