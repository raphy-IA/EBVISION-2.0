require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function cleanupDuplicates() {
    const client = await pool.connect();
    try {
        console.log('🧹 Nettoyage des doublons de permissions de menu...');

        const orphans = [
            'menu.configurations.sources_amp_entreprises',
            'menu.dashboard.analytics_amp_indicateurs',
            'menu.gestion_rh.types_de_collaborateurs',
            'menu.rapports.rapports_de_temps'
        ];

        for (const code of orphans) {
            console.log(`Suppression de ${code}...`);

            // Supprimer d'abord des tables de liaison
            await client.query(`
                DELETE FROM role_permissions 
                WHERE permission_id IN (SELECT id FROM permissions WHERE code = $1)
            `, [code]);

            await client.query(`
                DELETE FROM user_permissions 
                WHERE permission_id IN (SELECT id FROM permissions WHERE code = $1)
            `, [code]);

            // Supprimer la permission
            const res = await client.query(`
                DELETE FROM permissions 
                WHERE code = $1
                RETURNING id, name
            `, [code]);

            if (res.rows.length > 0) {
                console.log(`✅ Supprimé: ${code} (${res.rows[0].name})`);
            } else {
                console.log(`⚠️ Non trouvé: ${code}`);
            }
        }

        console.log('✨ Nettoyage terminé.');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        client.release();
        pool.end();
    }
}

cleanupDuplicates();
