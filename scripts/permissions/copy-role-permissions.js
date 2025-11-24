#!/usr/bin/env node

// Script: Copier toutes les permissions d'un rôle vers un autre
// - Utilise la base pointée par le .env actuel
// - Gère toutes les permissions (menu.*, page.*, api.*, etc.) via role_permissions
//
// Usage 1 (avec questions interactives) :
//   node scripts/permissions/copy-role-permissions.js
//
// Usage 2 (en ligne de commande) :
//   node scripts/permissions/copy-role-permissions.js SUPER_ADMIN ADMIN_METIER
//      -> copie toutes les permissions de SUPER_ADMIN vers ADMIN_METIER

require('dotenv').config();
const { Pool } = require('pg');
const inquirer = require('inquirer');

async function main() {
    const args = process.argv.slice(2);
    let sourceRoleName = args[0];
    let targetRoleName = args[1];

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });

    try {
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║  COPIE DES PERMISSIONS D\'UN RÔLE VERS UN AUTRE             ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        console.log('📋 Base de données :', process.env.DB_NAME);
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion OK\n');

        const client = await pool.connect();

        // Charger la liste des rôles pour aide à la saisie
        const rolesResult = await client.query(
            'SELECT id, name, description, is_system_role FROM roles ORDER BY name'
        );
        const roles = rolesResult.rows;

        if (!sourceRoleName || !targetRoleName) {
            const choices = roles.map(r => ({
                name: `${r.name}${r.is_system_role ? ' (system)' : ''}${r.description ? ' - ' + r.description : ''}`,
                value: r.name
            }));

            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'source',
                    message: 'Sélectionnez le rôle SOURCE (celui qui a déjà les permissions) :',
                    choices
                },
                {
                    type: 'list',
                    name: 'target',
                    message: 'Sélectionnez le rôle CIBLE (celui qui recevra les mêmes permissions) :',
                    choices,
                    filter: (val) => val
                }
            ]);

            sourceRoleName = answers.source;
            targetRoleName = answers.target;
        }

        if (sourceRoleName === targetRoleName) {
            console.error('❌ Le rôle source et le rôle cible doivent être différents.');
            process.exit(1);
        }

        console.log(`🔍 Rôle source : ${sourceRoleName}`);
        console.log(`🔍 Rôle cible  : ${targetRoleName}`);

        const sourceRole = roles.find(r => r.name === sourceRoleName);
        const targetRole = roles.find(r => r.name === targetRoleName);

        if (!sourceRole) {
            console.error(`❌ Rôle source introuvable : ${sourceRoleName}`);
            process.exit(1);
        }
        if (!targetRole) {
            console.error(`❌ Rôle cible introuvable : ${targetRoleName}`);
            process.exit(1);
        }

        // Récupérer les permissions du rôle source
        console.log('\n📋 Récupération des permissions du rôle source...');
        const permsResult = await client.query(
            `SELECT p.id, p.code, p.name, p.category
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = $1
             ORDER BY p.code`,
            [sourceRole.id]
        );

        if (permsResult.rows.length === 0) {
            console.log('⚠️  Aucun permission trouvée pour ce rôle source. Rien à copier.');
            process.exit(0);
        }

        console.log(`   ✓ ${permsResult.rows.length} permissions trouvées (y compris menus/pages si présents)\n`);

        const confirm = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Confirmer la copie des ${permsResult.rows.length} permissions de "${sourceRoleName}" vers "${targetRoleName}" ?`,
                default: true
            }
        ]);

        if (!confirm.proceed) {
            console.log('\n❌ Opération annulée par l\'utilisateur.');
            process.exit(0);
        }

        let created = 0;
        let skipped = 0;

        for (const perm of permsResult.rows) {
            try {
                await client.query(
                    `INSERT INTO role_permissions (role_id, permission_id)
                     VALUES ($1, $2)
                     ON CONFLICT (role_id, permission_id) DO NOTHING`,
                    [targetRole.id, perm.id]
                );
                created++;
            } catch (e) {
                if (e.message && e.message.includes('duplicate key')) {
                    skipped++;
                } else {
                    console.error(`   ❌ Erreur pour ${perm.code}: ${e.message}`);
                }
            }
        }

        console.log('\n🎯 Résultat de la copie :');
        console.log(`   - Rôle source : ${sourceRoleName}`);
        console.log(`   - Rôle cible  : ${targetRoleName}`);
        console.log(`   - Permissions copiées : ${created}`);
        console.log(`   - Permissions déjà présentes (ignorées) : ${skipped}`);
        console.log('\n✅ Copie terminée.');

        client.release();
        await pool.end();
    } catch (err) {
        console.error('❌ Erreur lors de la copie des permissions :', err.message);
        await pool.end();
        process.exit(1);
    }
}

main();
