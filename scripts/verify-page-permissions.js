#!/usr/bin/env node

/**
 * Script de vérification et de test des permissions de pages
 * Vérifie que les permissions existent en base de données et teste l'API
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     VÉRIFICATION DES PERMISSIONS DE PAGES                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    try {
        // 1. Vérifier les permissions de pages existantes
        console.log('📋 1. Vérification des permissions de pages en base de données...\n');

        const pagePermissionsQuery = `
            SELECT code, name, category, description
            FROM permissions
            WHERE code LIKE 'page.%'
            ORDER BY code
        `;

        const result = await pool.query(pagePermissionsQuery);

        if (result.rows.length === 0) {
            console.log('⚠️  ATTENTION: Aucune permission de page trouvée en base de données!');
            console.log('   Les permissions doivent être créées avec le format: page.{nom_page}');
            console.log('   Exemple: page.users, page.dashboard, page.permissions-admin\n');
        } else {
            console.log(`✅ ${result.rows.length} permissions de pages trouvées:\n`);
            result.rows.forEach(perm => {
                console.log(`   📄 ${perm.code.padEnd(35)} - ${perm.name}`);
            });
            console.log('');
        }

        // 2. Vérifier quelles pages importantes devraient avoir des permissions
        console.log('\n📋 2. Pages sensibles recommandées pour avoir des permissions:\n');

        const recommendedPages = [
            { code: 'page.users', name: 'Gestion des Utilisateurs', reason: 'Page très sensible' },
            { code: 'page.permissions-admin', name: 'Administration des Permissions', reason: 'Page très sensible (protection hardcodée)' },
            { code: 'page.dashboard-direction', name: 'Dashboard Direction', reason: 'Contient des données sensibles' },
            { code: 'page.dashboard-rentabilite', name: 'Dashboard Rentabilité', reason: 'Contient des données financières' },
            { code: 'page.invoices', name: 'Factures', reason: 'Données financières' },
            { code: 'page.taux-horaires', name: 'Taux Horaires', reason: 'Données financières' },
            { code: 'page.reports', name: 'Rapports', reason: 'Données sensibles' },
            { code: 'page.analytics', name: 'Analytics', reason: 'Données stratégiques' }
        ];

        const existingCodes = new Set(result.rows.map(p => p.code));
        const missingPages = [];

        recommendedPages.forEach(page => {
            if (existingCodes.has(page.code)) {
                console.log(`   ✅ ${page.code.padEnd(35)} - ${page.name}`);
            } else {
                console.log(`   ⚠️  ${page.code.padEnd(35)} - ${page.name} (MANQUANTE)`);
                missingPages.push(page);
            }
        });

        // 3. Vérifier les permissions assignées aux rôles
        console.log('\n\n📋 3. Vérification des permissions assignées aux rôles:\n');

        const rolePermissionsQuery = `
            SELECT r.name as role_name, COUNT(p.id) as page_permissions_count
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id AND p.code LIKE 'page.%'
            GROUP BY r.name
            ORDER BY page_permissions_count DESC, r.name
        `;

        const roleResult = await pool.query(rolePermissionsQuery);

        roleResult.rows.forEach(role => {
            const count = parseInt(role.page_permissions_count);
            const icon = count > 0 ? '✅' : '⚠️ ';
            console.log(`   ${icon} ${role.role_name.padEnd(20)} - ${count} permissions de pages`);
        });

        // 4. Afficher un exemple de requête pour créer les permissions manquantes
        if (missingPages.length > 0) {
            console.log('\n\n📋 4. Script SQL pour créer les permissions manquantes:\n');
            console.log('```sql');
            missingPages.forEach(page => {
                console.log(`INSERT INTO permissions (code, name, description, category, created_at, updated_at)`);
                console.log(`VALUES ('${page.code}', '${page.name}', '${page.reason}', 'page', NOW(), NOW())`);
                console.log(`ON CONFLICT (code) DO NOTHING;`);
                console.log('');
            });
            console.log('```\n');
        }

        // 5. Afficher les statistiques
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║     RÉSUMÉ                                                  ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        console.log(`   📊 Total permissions de pages: ${result.rows.length}`);
        console.log(`   ⚠️  Pages sensibles manquantes: ${missingPages.length}`);
        console.log(`   📋 Rôles avec permissions: ${roleResult.rows.filter(r => parseInt(r.page_permissions_count) > 0).length}`);
        console.log('');

        if (missingPages.length > 0) {
            console.log('\n💡 RECOMMANDATION:');
            console.log('   Exécutez le script sync-all-permissions-complete.js pour créer automatiquement');
            console.log('   toutes les permissions de pages basées sur les fichiers HTML:');
            console.log('   > node scripts/database/sync-all-permissions-complete.js\n');
        } else {
            console.log('\n✅ TOUT EST BON: Toutes les pages sensibles ont leurs permissions configurées!\n');
        }

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
main();
