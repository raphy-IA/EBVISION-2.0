#!/usr/bin/env node

// Import simple des rôles + permissions + associations rôle-permission
// Lit le fichier roles-permissions.json à la racine du projet
// Applique tout sur la base pointée par le .env courant

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('📥 IMPORT rôles & permissions');
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

        const sourcePath = path.join(__dirname, '..', '..', 'roles-permissions.json');
        if (!fs.existsSync(sourcePath)) {
            console.error('❌ Fichier roles-permissions.json introuvable :', sourcePath);
            process.exit(1);
        }

        const raw = fs.readFileSync(sourcePath, 'utf8');
        const data = JSON.parse(raw);

        const roles = data.roles || [];
        const permissions = data.permissions || [];
        const rolePermissions = data.rolePermissions || [];

        console.log(`📊 Fichier chargé : ${roles.length} rôles, ${permissions.length} permissions, ${rolePermissions.length} associations.`);

        await client.query('BEGIN');

        // 1) Permissions
        console.log('\n1️⃣ Synchronisation des permissions...');
        for (const perm of permissions) {
            try {
                await client.query(
                    `INSERT INTO permissions (code, name, description, category, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, NOW(), NOW())
                     ON CONFLICT (code) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        category = EXCLUDED.category,
                        updated_at = NOW()`,
                    [
                        perm.code,
                        perm.name,
                        perm.description || null,
                        perm.category || null
                    ]
                );
            } catch (e) {
                console.error(`   ❌ Permission ${perm.code}: ${e.message}`);
            }
        }

        // 2) Rôles
        console.log('\n2️⃣ Synchronisation des rôles...');
        for (const role of roles) {
            try {
                await client.query(
                    `INSERT INTO roles (name, description, is_system_role, badge_bg_class, badge_text_class, badge_hex_color, badge_priority, created_at, updated_at)
                     VALUES ($1, $2, COALESCE($3, false), $4, $5, $6, $7, NOW(), NOW())
                     ON CONFLICT (name) DO UPDATE SET
                        description = EXCLUDED.description,
                        is_system_role = COALESCE(EXCLUDED.is_system_role, roles.is_system_role),
                        badge_bg_class = COALESCE(EXCLUDED.badge_bg_class, roles.badge_bg_class),
                        badge_text_class = COALESCE(EXCLUDED.badge_text_class, roles.badge_text_class),
                        badge_hex_color = COALESCE(EXCLUDED.badge_hex_color, roles.badge_hex_color),
                        badge_priority = COALESCE(EXCLUDED.badge_priority, roles.badge_priority),
                        updated_at = NOW()`,
                    [
                        role.name,
                        role.description || null,
                        role.is_system_role,
                        role.badge_bg_class || null,
                        role.badge_text_class || null,
                        role.badge_hex_color || null,
                        role.badge_priority || null
                    ]
                );
            } catch (e) {
                console.error(`   ❌ Rôle ${role.name}: ${e.message}`);
            }
        }

        // 3) Recharger les IDs courants
        console.log('\n3️⃣ Rechargement des IDs...');
        const currentRoles = await client.query('SELECT id, name FROM roles');
        const currentPerms = await client.query('SELECT id, code FROM permissions');

        const roleIdByName = new Map(currentRoles.rows.map(r => [r.name, r.id]));
        const permIdByCode = new Map(currentPerms.rows.map(p => [p.code, p.id]));

        // 4) Associations rôle ↔ permission
        console.log('\n4️⃣ Recréation des associations rôle ↔ permission...');
        let created = 0;
        let skipped = 0;

        for (const rp of rolePermissions) {
            const roleId = roleIdByName.get(rp.role_name);
            const permId = permIdByCode.get(rp.permission_code);

            if (!roleId || !permId) {
                console.warn(`   ⚠️ Ignoré (rôle ou permission manquant) : ${rp.role_name} ↔ ${rp.permission_code}`);
                continue;
            }

            try {
                await client.query(
                    `INSERT INTO role_permissions (role_id, permission_id)
                     VALUES ($1, $2)
                     ON CONFLICT (role_id, permission_id) DO NOTHING`,
                    [roleId, permId]
                );
                created++;
            } catch (e) {
                if (e.message && e.message.includes('duplicate key')) {
                    skipped++;
                } else {
                    console.error(`   ❌ Association ${rp.role_name} ↔ ${rp.permission_code}: ${e.message}`);
                }
            }
        }

        await client.query('COMMIT');

        console.log('\n🎯 Résumé import :');
        console.log(`   - ${roles.length} rôles (upsert)`);
        console.log(`   - ${permissions.length} permissions (upsert)`);
        console.log(`   - ${created} associations créées`);
        console.log(`   - ${skipped} associations déjà existantes`);
        console.log('\n🎉 Import terminé.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur pendant l\'import :', e.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
})();
