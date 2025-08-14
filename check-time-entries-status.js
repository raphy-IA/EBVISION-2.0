const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'password'
});

async function checkTimeEntriesStatus() {
    try {
        console.log('🔍 Vérification des statuts dans time_entries...\n');
        
        // Vérifier les différents statuts
        const statusQuery = `
            SELECT 
                status,
                COUNT(*) as count,
                SUM(heures) as total_heures,
                MIN(created_at) as plus_ancien,
                MAX(created_at) as plus_recent
            FROM time_entries 
            GROUP BY status 
            ORDER BY count DESC
        `;
        
        const statusResult = await pool.query(statusQuery);
        console.log('📊 Statuts trouvés:');
        statusResult.rows.forEach(row => {
            console.log(`   ${row.status}: ${row.count} entrées, ${row.total_heures} heures totales`);
            console.log(`      Période: ${row.plus_ancien} à ${row.plus_recent}`);
        });
        
        // Vérifier les heures par jour récent
        const recentQuery = `
            SELECT 
                DATE(created_at) as date,
                status,
                COUNT(*) as count,
                SUM(heures) as total_heures
            FROM time_entries 
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(created_at), status
            ORDER BY date DESC, status
        `;
        
        const recentResult = await pool.query(recentQuery);
        console.log('\n📅 Heures des 7 derniers jours:');
        recentResult.rows.forEach(row => {
            console.log(`   ${row.date} - ${row.status}: ${row.count} entrées, ${row.total_heures} heures`);
        });
        
        // Vérifier les collaborateurs actifs (qui ont des time_entries récentes)
        const activeCollabQuery = `
            SELECT 
                COUNT(DISTINCT te.user_id) as collaborateurs_actifs,
                COUNT(DISTINCT c.id) as total_collaborateurs
            FROM time_entries te
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            WHERE te.created_at >= CURRENT_DATE - INTERVAL '30 days'
        `;
        
        const activeCollabResult = await pool.query(activeCollabQuery);
        console.log('\n👥 Collaborateurs:');
        console.log(`   Actifs (30 derniers jours): ${activeCollabResult.rows[0].collaborateurs_actifs}`);
        console.log(`   Total: ${activeCollabResult.rows[0].total_collaborateurs}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesStatus();


