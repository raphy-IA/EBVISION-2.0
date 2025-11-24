#!/usr/bin/env node

// Export simple des rôles + permissions + associations rôle-permission
// Utilise uniquement la base pointée par le .env courant
// Produit le fichier roles-permissions.json à la racine du projet

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('📤 EXPORT rôles & permissions');
    console.log('==============================\n');

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'eb_vision',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });

    const client = await pool.connect();
    try {
        const ping = await client.query('SELECT NOW() as now');
        console.log(`✅ Connecté à la base ${process.env.DB_NAME} - ${ping.rows[0].now}`);

        console.log('1️⃣ Récupération des rôles...');
        const rolesResult = await client.query('SELECT * FROM roles ORDER BY name');

        console.log('2️⃣ Récupération des permissions...');
        const permsResult = await client.query('SELECT * FROM permissions ORDER BY code');

        console.log('3️⃣ Récupération des associations rôle ↔ permission...');
        const rpsResult = await client.query(`
            SELECT r.name AS role_name, p.code AS permission_code
            FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            JOIN permissions p ON rp.permission_id = p.id
            ORDER BY r.name, p.code
        `);

        const exportData = {
            exportedAt: new Date().toISOString(),
            database: process.env.DB_NAME || null,
            roles: rolesResult.rows,
            permissions: permsResult.rows,
            rolePermissions: rpsResult.rows
        };

        const targetPath = path.join(__dirname, '..', '..', 'roles-permissions.json');
        fs.writeFileSync(targetPath, JSON.stringify(exportData, null, 2), 'utf8');

        console.log('\n📁 Fichier généré :', targetPath);
        console.log(`   - ${rolesResult.rows.length} rôles`);
        console.log(`   - ${permsResult.rows.length} permissions`);
        console.log(`   - ${rpsResult.rows.length} associations rôle ↔ permission`);
        console.log('\n🎉 Export terminé.');
    } catch (e) {
        console.error('❌ Erreur pendant l\'export :', e.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
})();
