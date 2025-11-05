#!/usr/bin/env node

/**
 * SCRIPT DE SYNCHRONISATION COMPLÈTE DES PERMISSIONS
 * ==================================================
 * 
 * Ce script synchronise TOUTES les permissions depuis le code source :
 * 1. Permissions fonctionnelles depuis les routes API (requirePermission)
 * 2. Permissions de pages depuis les fichiers HTML
 * 3. Permissions de menu depuis la sidebar
 * 4. Permissions API de base
 * 
 * Usage: node scripts/database/sync-all-permissions-complete.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     SYNCHRONISATION COMPLÈTE DES PERMISSIONS               ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

const PUBLIC_DIR = path.join(__dirname, '../../public');
const ROUTES_DIR = path.join(__dirname, '../../src/routes');

/**
 * Extraire les permissions depuis les routes API
 */
async function extractPermissionsFromRoutes() {
    const permissions = new Map();
    const routeFiles = await fs.readdir(ROUTES_DIR);
    
    console.log('📋 Étape 1: Extraction des permissions depuis les routes API...\n');
    
    // Mapping des modules aux catégories
    const categoryMap = {
        'users': 'users',
        'clients': 'clients',
        'contacts': 'clients',
        'missions': 'missions',
        'opportunities': 'opportunities',
        'time_entries': 'time',
        'feuilles_temps': 'time',
        'time_sheets': 'time',
        'invoices': 'invoices',
        'collaborateurs': 'hr',
        'grades': 'hr',
        'postes': 'hr',
        'business_units': 'config',
        'divisions': 'config',
        'fiscal_years': 'config',
        'reports': 'reports',
        'dashboard_analytics': 'dashboard',
        'analytics': 'dashboard',
        'prospecting': 'campaigns',
        'opportunity_types': 'config',
        'opportunity_stages': 'config',
        'mission_types': 'config',
        'secteurs_activite': 'config',
        'pays': 'config',
        'taux_horaires': 'config',
        'types_collaborateurs': 'hr',
        'managers': 'hr',
        'supervisors': 'hr',
        'activities': 'activities',
        'internalActivities': 'activities',
        'tasks': 'tasks',
        'stage_actions': 'config',
        'workflow': 'workflow',
        'notifications': 'notifications',
        'notification_settings': 'config',
        'branding': 'config',
        'permissions': 'api',
        'sync_permissions': 'api',
        'page_permissions': 'api',
        'auth': 'api',
        'two_factor_auth': 'api',
        'health': 'api',
        'evolution_organisations': 'hr',
        'evolution_postes': 'hr',
        'evolution_grades': 'hr'
    };
    
    const moduleNameFr = {
        'users': 'utilisateurs',
        'clients': 'clients',
        'contacts': 'contacts',
        'missions': 'missions',
        'opportunities': 'opportunités',
        'time_entries': 'saisies de temps',
        'feuilles_temps': 'feuilles de temps',
        'time_sheets': 'feuilles de temps',
        'invoices': 'factures',
        'collaborateurs': 'collaborateurs',
        'grades': 'grades',
        'postes': 'postes',
        'business_units': 'business units',
        'divisions': 'divisions',
        'fiscal_years': 'années fiscales',
        'reports': 'rapports',
        'dashboard_analytics': 'dashboard',
        'analytics': 'analytics',
        'prospecting': 'prospection',
        'opportunity_types': 'types d\'opportunités',
        'opportunity_stages': 'étapes d\'opportunités',
        'mission_types': 'types de missions',
        'secteurs_activite': 'secteurs d\'activité',
        'pays': 'pays',
        'taux_horaires': 'taux horaires',
        'types_collaborateurs': 'types de collaborateurs',
        'managers': 'managers',
        'supervisors': 'superviseurs',
        'activities': 'activités',
        'internalActivities': 'activités internes',
        'tasks': 'tâches',
        'stage_actions': 'actions d\'étapes',
        'workflow': 'workflow',
        'notifications': 'notifications',
        'notification_settings': 'paramètres de notifications',
        'branding': 'branding',
        'permissions': 'permissions',
        'sync_permissions': 'synchronisation des permissions',
        'page_permissions': 'permissions de pages',
        'auth': 'authentification',
        'two_factor_auth': 'authentification à deux facteurs',
        'health': 'santé',
        'evolution_organisations': 'évolution organisations',
        'evolution_postes': 'évolution postes',
        'evolution_grades': 'évolution grades'
    };
    
    const actionMap = {
        'read': 'Voir',
        'create': 'Créer',
        'update': 'Modifier',
        'edit': 'Modifier',
        'delete': 'Supprimer',
        'manage': 'Gérer',
        'view': 'Voir'
    };
    
    for (const file of routeFiles) {
        if (!file.endsWith('.js') || file === 'index.js') continue;
        
        const filePath = path.join(ROUTES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extraire requirePermission('xxx')
        const requirePermissionRegex = /requirePermission\(['"]([^'"]+)['"]\)/g;
        let match;
        while ((match = requirePermissionRegex.exec(content)) !== null) {
            const permCode = match[1];
            
            // Déterminer la catégorie basée sur le nom du fichier
            const moduleName = file.replace('.js', '').replace(/-/g, '_');
            const category = categoryMap[moduleName] || moduleName;
            
            // Extraire le type d'action depuis le code de permission
            const action = permCode.split(':')[1] || 'view';
            const actionName = actionMap[action] || action;
            const moduleFr = moduleNameFr[moduleName] || moduleName;
            
            const name = `${actionName} ${moduleFr}`;
            
            permissions.set(permCode, {
                code: permCode,
                name,
                category,
                description: `Permission pour ${actionName.toLowerCase()} ${moduleFr}`
            });
        }
        
        // Extraire aussi les routes HTTP pour créer des permissions par défaut
        // pour les routes qui n'ont pas de requirePermission explicite
        if (content.includes('router.get') || content.includes('router.post') || 
            content.includes('router.put') || content.includes('router.patch') || 
            content.includes('router.delete')) {
            const moduleName = file.replace('.js', '').replace(/-/g, '_');
            const category = categoryMap[moduleName] || moduleName;
            const moduleFr = moduleNameFr[moduleName] || moduleName;
            
            // Créer les permissions CRUD de base si elles n'existent pas déjà
            const basePerms = [
                { code: `${moduleName}:read`, name: `Voir ${moduleFr}`, action: 'read' },
                { code: `${moduleName}:create`, name: `Créer ${moduleFr}`, action: 'create' },
                { code: `${moduleName}:update`, name: `Modifier ${moduleFr}`, action: 'update' },
                { code: `${moduleName}:delete`, name: `Supprimer ${moduleFr}`, action: 'delete' }
            ];
            
            basePerms.forEach(perm => {
                if (!permissions.has(perm.code)) {
                    // Vérifier si le fichier contient des routes correspondantes
                    const hasRoute = 
                        (perm.action === 'read' && (content.includes('router.get') || content.includes('GET'))) ||
                        (perm.action === 'create' && (content.includes('router.post') || content.includes('POST'))) ||
                        (perm.action === 'update' && (content.includes('router.put') || content.includes('router.patch') || content.includes('PUT') || content.includes('PATCH'))) ||
                        (perm.action === 'delete' && (content.includes('router.delete') || content.includes('DELETE')));
                    
                    if (hasRoute) {
                        permissions.set(perm.code, {
                            code: perm.code,
                            name: perm.name,
                            category,
                            description: `Permission pour ${perm.action} ${moduleFr}`
                        });
                    }
                }
            });
        }
    }
    
    console.log(`   ✅ ${permissions.size} permissions trouvées dans les routes API\n`);
    return permissions;
}

/**
 * Extraire les permissions depuis les fichiers HTML
 */
async function extractPermissionsFromHTML() {
    const permissions = new Map();
    
    console.log('📋 Étape 2: Extraction des permissions depuis les pages HTML...\n');
    
    async function scanDir(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                if (!['node_modules', 'uploads', 'logs', 'css', 'js', 'images', 'fonts'].includes(entry.name)) {
                    await scanDir(fullPath);
                }
            } else if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.includes('template')) {
                try {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const relativePath = path.relative(PUBLIC_DIR, fullPath);
                    const permCode = `page.${relativePath.replace(/\\/g, '/').replace('.html', '').replace(/\//g, '_')}`;
                    
                    // Extraire le titre
                    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
                    const title = titleMatch ? titleMatch[1].replace(' - EB-Vision 2.0', '').replace(' - EWM', '').trim() : entry.name.replace('.html', '');
                    
                    permissions.set(permCode, {
                        code: permCode,
                        name: `Accès à ${title}`,
                        category: 'pages',
                        description: `Permission d'accès à la page ${title}`
                    });
                } catch (error) {
                    console.error(`   ⚠️  Erreur lors de la lecture de ${fullPath}:`, error.message);
                }
            }
        }
    }
    
    await scanDir(PUBLIC_DIR);
    console.log(`   ✅ ${permissions.size} permissions de pages trouvées\n`);
    return permissions;
}

/**
 * Extraire les permissions depuis le menu (sidebar)
 */
async function extractPermissionsFromMenu() {
    const permissions = new Map();
    
    console.log('📋 Étape 3: Extraction des permissions depuis le menu...\n');
    
    try {
        const sidebarPath = path.join(PUBLIC_DIR, 'template-modern-sidebar.html');
        const content = await fs.readFile(sidebarPath, 'utf-8');
        
        // Extraire les sections de menu
        const sectionRegex = /<li[^>]*data-section="([^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
        const itemRegex = /<a[^>]*data-permission="([^"]+)"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
        
        let sectionMatch;
        while ((sectionMatch = sectionRegex.exec(content)) !== null) {
            const sectionCode = sectionMatch[1];
            const sectionName = sectionMatch[2].trim();
            
            // Extraire les items de cette section
            const sectionContent = content.substring(sectionMatch.index);
            const nextSectionIndex = content.indexOf('<li', sectionMatch.index + 1);
            const sectionEnd = nextSectionIndex > 0 ? nextSectionIndex : content.length;
            const sectionText = content.substring(sectionMatch.index, sectionEnd);
            
            let itemMatch;
            while ((itemMatch = itemRegex.exec(sectionText)) !== null) {
                const permCode = itemMatch[1];
                const itemName = itemMatch[3].trim();
                
                permissions.set(permCode, {
                    code: permCode,
                    name: itemName,
                    category: 'menu',
                    description: `Accès au menu: ${itemName}`
                });
            }
        }
        
        // Aussi chercher les permissions de menu dans le format menu.xxx.yyy
        const menuPermissionRegex = /menu\.([^.]+)\.([^"'\s]+)/g;
        let menuMatch;
        while ((menuMatch = menuPermissionRegex.exec(content)) !== null) {
            const permCode = menuMatch[0];
            if (!permissions.has(permCode)) {
                permissions.set(permCode, {
                    code: permCode,
                    name: `Menu: ${permCode}`,
                    category: 'menu',
                    description: `Permission d'accès au menu ${permCode}`
                });
            }
        }
        
    } catch (error) {
        console.error(`   ⚠️  Erreur lors de la lecture du menu:`, error.message);
    }
    
    console.log(`   ✅ ${permissions.size} permissions de menu trouvées\n`);
    return permissions;
}

/**
 * Ajouter les permissions API de base
 */
function getBaseAPIPermissions() {
    const permissions = new Map();
    
    const apiPermissions = [
        { code: 'permission.manage', name: 'API - Gestion des permissions', category: 'api' },
        { code: 'permission.assign', name: 'API - Assigner des permissions', category: 'api' },
        { code: 'permission.revoke', name: 'API - Révoquer des permissions', category: 'api' },
        { code: 'role.manage', name: 'API - Gestion des rôles', category: 'api' },
        { code: 'api.permissions.read', name: 'API - Lecture des permissions', category: 'api' },
        { code: 'api.permissions.write', name: 'API - Écriture des permissions', category: 'api' },
        { code: 'api.users.manage', name: 'API - Gestion des utilisateurs', category: 'api' },
        { code: 'api.clients.manage', name: 'API - Gestion des clients', category: 'api' },
        { code: 'api.missions.manage', name: 'API - Gestion des missions', category: 'api' },
        { code: 'api.opportunities.manage', name: 'API - Gestion des opportunités', category: 'api' }
    ];
    
    apiPermissions.forEach(perm => {
        permissions.set(perm.code, {
            ...perm,
            description: perm.name
        });
    });
    
    return permissions;
}

/**
 * Ajouter les permissions fonctionnelles manquantes
 */
function getFunctionalPermissions() {
    const permissions = new Map();
    
    // Permissions Clients
    const clientPerms = [
        { code: 'clients.view', name: 'Voir les clients', category: 'clients' },
        { code: 'clients.create', name: 'Créer des clients', category: 'clients' },
        { code: 'clients.edit', name: 'Modifier les clients', category: 'clients' },
        { code: 'clients.delete', name: 'Supprimer les clients', category: 'clients' }
    ];
    
    // Permissions Missions
    const missionPerms = [
        { code: 'missions.view', name: 'Voir les missions', category: 'missions' },
        { code: 'missions.create', name: 'Créer des missions', category: 'missions' },
        { code: 'missions.edit', name: 'Modifier les missions', category: 'missions' },
        { code: 'missions.delete', name: 'Supprimer les missions', category: 'missions' }
    ];
    
    // Permissions Opportunités
    const oppPerms = [
        { code: 'opportunities.view', name: 'Voir les opportunités', category: 'opportunities' },
        { code: 'opportunities.create', name: 'Créer des opportunités', category: 'opportunities' },
        { code: 'opportunities.edit', name: 'Modifier les opportunités', category: 'opportunities' },
        { code: 'opportunities.delete', name: 'Supprimer les opportunités', category: 'opportunities' }
    ];
    
    // Permissions Campagnes
    const campaignPerms = [
        { code: 'campaigns.view', name: 'Voir les campagnes', category: 'campaigns' },
        { code: 'campaigns.create', name: 'Créer des campagnes', category: 'campaigns' },
        { code: 'campaigns.edit', name: 'Modifier les campagnes', category: 'campaigns' },
        { code: 'campaigns.delete', name: 'Supprimer les campagnes', category: 'campaigns' },
        { code: 'campaigns.validate', name: 'Valider les campagnes', category: 'campaigns' },
        { code: 'campaigns.execute', name: 'Exécuter les campagnes', category: 'campaigns' }
    ];
    
    // Permissions Config
    const configPerms = [
        { code: 'config.view', name: 'Voir la configuration', category: 'config' },
        { code: 'config.edit', name: 'Modifier la configuration', category: 'config' },
        { code: 'config.manage_permissions', name: 'Gérer les permissions', category: 'config' },
        { code: 'config.admin', name: 'Administrer la configuration', category: 'config' }
    ];
    
    // Permissions Dashboard
    const dashboardPerms = [
        { code: 'dashboard.view', name: 'Voir le dashboard', category: 'dashboard' }
    ];
    
    // Permissions Rapports
    const reportPerms = [
        { code: 'reports.view', name: 'Voir les rapports', category: 'reports' },
        { code: 'reports.create', name: 'Créer des rapports', category: 'reports' }
    ];
    
    [...clientPerms, ...missionPerms, ...oppPerms, ...campaignPerms, ...configPerms, ...dashboardPerms, ...reportPerms].forEach(perm => {
        permissions.set(perm.code, {
            ...perm,
            description: perm.name
        });
    });
    
    return permissions;
}

/**
 * Synchroniser toutes les permissions dans la base de données
 */
async function syncAllPermissions() {
    try {
        console.log('📡 Test de connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');
        
        // 1. Extraire toutes les permissions
        const routePerms = await extractPermissionsFromRoutes();
        const htmlPerms = await extractPermissionsFromHTML();
        const menuPerms = await extractPermissionsFromMenu();
        const apiPerms = getBaseAPIPermissions();
        const funcPerms = getFunctionalPermissions();
        
        // 2. Fusionner toutes les permissions
        const allPermissions = new Map();
        
        [routePerms, htmlPerms, menuPerms, apiPerms, funcPerms].forEach(permMap => {
            permMap.forEach((perm, code) => {
                if (!allPermissions.has(code)) {
                    allPermissions.set(code, perm);
                } else {
                    // Mettre à jour si la catégorie est plus spécifique
                    const existing = allPermissions.get(code);
                    if (existing.category === 'menu' && perm.category !== 'menu') {
                        allPermissions.set(code, perm);
                    }
                }
            });
        });
        
        console.log(`\n📊 Total: ${allPermissions.size} permissions à synchroniser\n`);
        
        // 3. Synchroniser dans la base de données
        console.log('📋 Étape 4: Synchronisation dans la base de données...\n');
        
        let created = 0;
        let updated = 0;
        let unchanged = 0;
        
        for (const [code, perm] of allPermissions) {
            try {
                // Vérifier si la permission existe
                const existing = await pool.query(
                    'SELECT id, name, category FROM permissions WHERE code = $1',
                    [code]
                );
                
                if (existing.rows.length > 0) {
                    const existingPerm = existing.rows[0];
                    
                    // Mettre à jour si nécessaire
                    if (existingPerm.name !== perm.name || existingPerm.category !== perm.category) {
                        await pool.query(
                            `UPDATE permissions SET name = $1, description = $2, category = $3, updated_at = NOW() WHERE code = $4`,
                            [perm.name, perm.description, perm.category, code]
                        );
                        updated++;
                        console.log(`   🔄 ${code} - Mis à jour`);
                    } else {
                        unchanged++;
                    }
                } else {
                    // Créer la permission
                    await pool.query(
                        `INSERT INTO permissions (code, name, description, category, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                        [code, perm.name, perm.description, perm.category]
                    );
                    created++;
                    console.log(`   ✅ ${code} - Créé`);
                }
            } catch (error) {
                console.error(`   ❌ Erreur pour ${code}:`, error.message);
            }
        }
        
        // 4. Résumé
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         ✅ SYNCHRONISATION TERMINÉE                      ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✅ Créées      : ${created}`);
        console.log(`   🔄 Mises à jour: ${updated}`);
        console.log(`   ✓ Inchangées   : ${unchanged}`);
        console.log(`   📦 Total       : ${allPermissions.size}`);
        console.log('\n🎯 Toutes les permissions ont été synchronisées avec succès!\n');
        
        // 5. Afficher les catégories
        const categoriesResult = await pool.query(
            'SELECT category, COUNT(*) as count FROM permissions GROUP BY category ORDER BY category'
        );
        
        console.log('📋 Permissions par catégorie:');
        console.log('═══════════════════════════════');
        categoriesResult.rows.forEach(row => {
            console.log(`   ${row.category}: ${row.count} permission(s)`);
        });
        console.log('');
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Exécution
syncAllPermissions().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
});

