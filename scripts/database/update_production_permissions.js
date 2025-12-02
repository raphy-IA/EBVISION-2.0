const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function updateProductionPermissions() {
    const client = await pool.connect();

    try {
        console.log('🚀 Démarrage de la mise à jour des permissions pour la production...');

        await client.query('BEGIN');

        // 1. MIGRATION DES CATÉGORIES
        console.log('\n📦 1. Migration des catégories de pages vers "navigation"...');
        const updateResult = await client.query(`
            UPDATE permissions 
            SET category = 'navigation' 
            WHERE code LIKE 'page.%' AND category != 'navigation'
        `);
        console.log(`   ✅ ${updateResult.rowCount} permissions mises à jour.`);

        // 2. NETTOYAGE DES PERMISSIONS OBSOLÈTES
        console.log('\n🧹 2. Nettoyage des permissions dashboard obsolètes...');
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

        // Supprimer d'abord les liens role_permissions
        const deleteLinks = await client.query(`
            DELETE FROM role_permissions 
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = ANY($1))
        `, [legacyPermissions]);
        console.log(`   🔗 ${deleteLinks.rowCount} liens rôles-permissions supprimés.`);

        // Supprimer les permissions elles-mêmes
        const deletePerms = await client.query(`
            DELETE FROM permissions 
            WHERE code = ANY($1)
        `, [legacyPermissions]);
        console.log(`   🗑️ ${deletePerms.rowCount} permissions obsolètes supprimées.`);

        await client.query('COMMIT');
        console.log('\n✨ Mise à jour terminée avec succès !');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Erreur lors de la mise à jour (ROLLBACK effectué):', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

updateProductionPermissions();
