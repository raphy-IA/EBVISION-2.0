// Charger les variables d'environnement
require('dotenv').config();

const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
    user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
    password: process.env.DB_PASSWORD || '87ifet-Z)&',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: false,
    family: 4
});

async function debugFrontendPermissions() {
    console.log('🔍 Diagnostic des permissions frontend\n');
    
    try {
        // 1. Vérifier l'utilisateur admin
        console.log('1️⃣ Vérification de l\'utilisateur admin...');
        const adminUser = await pool.query(`
            SELECT id, nom, prenom, email, login, role, statut
            FROM users 
            WHERE role = 'SUPER_ADMIN' OR email = 'admin@ebvision.com'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        if (adminUser.rows.length === 0) {
            console.log('   ❌ Aucun utilisateur SUPER_ADMIN trouvé');
            return;
        }
        
        const user = adminUser.rows[0];
        console.log(`   ✅ Utilisateur trouvé: ${user.email} (${user.role})`);
        
        // 2. Vérifier les permissions avec leurs codes
        console.log('\n2️⃣ Vérification des permissions avec leurs codes...');
        const permissions = await pool.query(`
            SELECT id, code, name, description, category
            FROM permissions 
            ORDER BY category, name
        `);
        
        console.log(`   📊 ${permissions.rows.length} permissions trouvées:`);
        
        // Analyser les codes de permissions
        const codeAnalysis = {};
        permissions.rows.forEach(perm => {
            if (perm.code) {
                codeAnalysis[perm.code] = perm.name;
            }
        });
        
        console.log('\n3️⃣ Analyse des codes de permissions:');
        Object.entries(codeAnalysis).forEach(([code, name]) => {
            console.log(`   - ${code} -> ${name}`);
        });
        
        // 3. Vérifier les permissions du SUPER_ADMIN
        console.log('\n4️⃣ Vérification des permissions du SUPER_ADMIN...');
        const superAdminPermissions = await pool.query(`
            SELECT p.id, p.code, p.name, p.description, p.category
            FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE r.name = 'SUPER_ADMIN'
            ORDER BY p.category, p.name
        `);
        
        console.log(`   📊 ${superAdminPermissions.rows.length} permissions du SUPER_ADMIN:`);
        superAdminPermissions.rows.forEach(perm => {
            console.log(`   ✅ ${perm.code || 'NO_CODE'} -> ${perm.name}`);
        });
        
        // 4. Permissions manquantes pour le frontend
        console.log('\n5️⃣ Permissions manquantes pour le frontend...');
        
        // Permissions requises par le frontend (d'après menu-permissions.js)
        const frontendPermissions = [
            'menu.dashboard',
            'menu.reports', 
            'menu.time_entries',
            'menu.missions',
            'menu.opportunities',
            'menu.collaborateurs',
            'menu.settings',
            'menu.business_units',
            'menu.users',
            'menu.dashboard.main',
            'menu.dashboard.personal',
            'menu.dashboard.team',
            'menu.dashboard.direction',
            'menu.dashboard.recovery',
            'menu.dashboard.profitability',
            'menu.dashboard.chargeability',
            'menu.dashboard.analytics',
            'menu.dashboard.optimized',
            'menu.reports.general',
            'menu.reports.missions',
            'menu.reports.opportunities',
            'menu.reports.hr',
            'menu.reports.prospecting',
            'menu.time_entries.input',
            'menu.time_entries.approval',
            'menu.missions.list',
            'menu.missions.types',
            'menu.missions.tasks',
            'menu.missions.invoices',
            'menu.opportunities.clients',
            'menu.opportunities.list',
            'menu.opportunities.types',
            'menu.opportunities.campaigns',
            'menu.opportunities.validations',
            'menu.collaborateurs.list',
            'menu.collaborateurs.grades',
            'menu.collaborateurs.positions',
            'menu.settings.fiscal_years',
            'menu.settings.countries',
            'menu.business_units.list',
            'menu.business_units.divisions',
            'menu.business_units.managers',
            'menu.business_units.internal_activities',
            'menu.business_units.sectors',
            'menu.business_units.opportunity_config',
            'menu.business_units.sources',
            'menu.business_units.templates',
            'menu.business_units.campaigns',
            'menu.business_units.campaign_validations',
            'menu.users.notifications',
            'menu.users.list',
            'menu.users.permissions'
        ];
        
        const existingCodes = superAdminPermissions.rows.map(p => p.code).filter(Boolean);
        const missingPermissions = frontendPermissions.filter(code => !existingCodes.includes(code));
        
        console.log(`   📊 ${missingPermissions.length} permissions manquantes pour le frontend:`);
        missingPermissions.forEach(code => {
            console.log(`   ❌ ${code}`);
        });
        
        // 5. Recommandations
        console.log('\n📊 Résumé du diagnostic');
        console.log('=' .repeat(50));
        console.log(`Permissions totales: ${permissions.rows.length}`);
        console.log(`Permissions avec code: ${Object.keys(codeAnalysis).length}`);
        console.log(`Permissions SUPER_ADMIN: ${superAdminPermissions.rows.length}`);
        console.log(`Permissions manquantes frontend: ${missingPermissions.length}`);
        
        if (missingPermissions.length > 0) {
            console.log('\n🔴 PROBLÈME: Permissions manquantes pour le frontend !');
            console.log('💡 Solution: Créer les permissions manquantes ou adapter le frontend');
        } else {
            console.log('\n🟢 Toutes les permissions frontend sont présentes');
        }
        
        // 6. Mapping suggéré
        console.log('\n💡 Mapping suggéré des permissions existantes:');
        const mapping = {
            'Voir le dashboard': 'menu.dashboard',
            'Voir les rapports': 'menu.reports',
            'Voir la Saisie des temps': 'menu.time_entries',
            'Voir les missions': 'menu.missions',
            'Voir les opportunités': 'menu.opportunities',
            'Voir les Collaborateurs': 'menu.collaborateurs',
            'Voir la configuration': 'menu.settings',
            'Voir le menu Business Units': 'menu.business_units',
            'Voir les utilisateurs': 'menu.users'
        };
        
        Object.entries(mapping).forEach(([name, code]) => {
            const exists = superAdminPermissions.rows.some(p => p.name === name);
            console.log(`   ${exists ? '✅' : '❌'} ${name} -> ${code}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error.message);
    } finally {
        await pool.end();
    }
}

debugFrontendPermissions().catch(console.error);








