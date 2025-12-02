const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function cleanupPermissions() {
    try {
        console.log('🧹 Nettoyage des permissions obsolètes...');

        const legacyPermissions = [
            'dashboard.chargeabilite',
            'dashboard.rentabilite',
            'dashboard.direction',
            'dashboard.recouvrement',
            'dashboard.personnel',
            'dashboard.equipe',
            'dashboard.optimise',
            'dashboard.commercial'
        ];

        // Vérifier avant suppression
        const check = await pool.query(`
            SELECT code FROM permissions WHERE code = ANY($1)
        `, [legacyPermissions]);

        console.log(`\n🔍 ${check.rowCount} permissions obsolètes trouvées :`);
        check.rows.forEach(r => console.log(`   - ${r.code}`));

        if (check.rowCount > 0) {
            // Supprimer les relations d'abord (role_permissions)
            await pool.query(`
                DELETE FROM role_permissions 
                WHERE permission_id IN (SELECT id FROM permissions WHERE code = ANY($1))
            `, [legacyPermissions]);

            // Supprimer les permissions
            const deleted = await pool.query(`
                DELETE FROM permissions 
                WHERE code = ANY($1)
            `, [legacyPermissions]);

            console.log(`\n✅ ${deleted.rowCount} permissions supprimées.`);
        } else {
            console.log('\n✨ Aucune permission obsolète à supprimer.');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

cleanupPermissions();
