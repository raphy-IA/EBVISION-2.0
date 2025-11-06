#!/usr/bin/env node

/**
 * SCRIPT D'AUDIT COMPLET DES PERMISSIONS
 * ========================================
 * 
 * Ce script fait un audit approfondi de l'application pour :
 * 1. Lister toutes les pages HTML
 * 2. Lister toutes les routes API
 * 3. Analyser la structure du menu
 * 4. Vérifier les permissions en base de données
 * 5. Identifier les permissions manquantes
 * 6. Générer un rapport détaillé
 * 
 * Usage: node scripts/database/audit-permissions-complete.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     AUDIT COMPLET DES PERMISSIONS                          ║');
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

const auditReport = {
    pages: {
        total: 0,
        found: [],
        missingPermissions: []
    },
    routes: {
        total: 0,
        found: [],
        missingPermissions: []
    },
    menu: {
        sections: [],
        items: [],
        missingPermissions: []
    },
    permissions: {
        inDatabase: [],
        categories: {}
    },
    recommendations: []
};

/**
 * Scanner toutes les pages HTML
 */
async function auditPages() {
    console.log('📄 ÉTAPE 1: Audit des pages HTML...\n');
    
    const scanDir = async (dir, basePath = '') => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(basePath, entry.name);
            
            if (entry.isDirectory()) {
                if (!['node_modules', 'uploads', 'logs', 'css', 'js', 'images', 'fonts'].includes(entry.name)) {
                    await scanDir(fullPath, relativePath);
                }
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
                // Ignorer les fichiers template et backup
                if (!entry.name.includes('template') && 
                    !entry.name.includes('backup') && 
                    !entry.name.includes('test') &&
                    entry.name !== 'login.html' &&
                    entry.name !== 'logout.html' &&
                    entry.name !== '403.html' &&
                    entry.name !== '404.html' &&
                    entry.name !== '500.html') {
                    
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        
                        // Extraire le titre
                        const titleMatch = content.match(/<title>(.*?)<\/title>/i);
                        const title = titleMatch 
                            ? titleMatch[1]
                                .replace(/ - EB-Vision 2\.0/gi, '')
                                .replace(/ - EB Vision 2\.0/gi, '')
                                .replace(/ - EWM/gi, '')
                                .replace(/ - ENTERPRISE WORKFLOW MANAGEMENT/gi, '')
                                .replace(/EB-Vision 2\.0/gi, '')
                                .replace(/EB Vision 2\.0/gi, '')
                                .replace(/EB-Vision/gi, '')
                                .replace(/EB Vision/gi, '')
                                .trim() 
                            : entry.name.replace('.html', '');
                        
                        // Générer le code de permission attendu
                        const urlPath = '/' + relativePath.replace(/\\/g, '/');
                        const permCode = `page.${urlPath.replace(/^\//, '').replace(/\.html$/, '').replace(/\//g, '_')}`;
                        
                        // Vérifier si la permission existe en base
                        const permResult = await pool.query(
                            'SELECT id, code, name, category FROM permissions WHERE code = $1',
                            [permCode]
                        );
                        
                        const pageInfo = {
                            file: entry.name,
                            path: urlPath,
                            title,
                            expectedPermission: permCode,
                            hasPermission: permResult.rows.length > 0,
                            permission: permResult.rows[0] || null
                        };
                        
                        auditReport.pages.found.push(pageInfo);
                        auditReport.pages.total++;
                        
                        if (!pageInfo.hasPermission) {
                            auditReport.pages.missingPermissions.push(pageInfo);
                        }
                        
                        console.log(`   ${pageInfo.hasPermission ? '✅' : '❌'} ${entry.name} -> ${permCode}`);
                    } catch (error) {
                        console.error(`   ⚠️  Erreur pour ${entry.name}:`, error.message);
                    }
                }
            }
        }
    }
    
    await scanDir(PUBLIC_DIR);
    console.log(`\n   📊 Total: ${auditReport.pages.total} pages, ${auditReport.pages.missingPermissions.length} permissions manquantes\n`);
}

/**
 * Scanner toutes les routes API
 */
async function auditRoutes() {
    console.log('🔌 ÉTAPE 2: Audit des routes API...\n');
    
    const routeFiles = await fs.readdir(ROUTES_DIR);
    
    for (const file of routeFiles) {
        if (!file.endsWith('.js') || file === 'index.js') continue;
        
        const filePath = path.join(ROUTES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        const moduleName = file.replace('.js', '').replace(/-/g, '_');
        
        // Extraire toutes les routes HTTP
        const routePatterns = [
            { method: 'GET', regex: /router\.get\(['"]([^'"]+)['"]/g },
            { method: 'POST', regex: /router\.post\(['"]([^'"]+)['"]/g },
            { method: 'PUT', regex: /router\.put\(['"]([^'"]+)['"]/g },
            { method: 'PATCH', regex: /router\.patch\(['"]([^'"]+)['"]/g },
            { method: 'DELETE', regex: /router\.delete\(['"]([^'"]+)['"]/g }
        ];
        
        const routes = [];
        
        // Traiter chaque pattern de route
        for (const { method, regex } of routePatterns) {
            // Réinitialiser le regex pour chaque fichier
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const routePath = match[1];
                
                // Extraire requirePermission si présent
                const permMatch = content.substring(0, match.index).match(/requirePermission\(['"]([^'"]+)['"]\)/);
                const requiredPermission = permMatch ? permMatch[1] : null;
                
                // Générer le code de permission attendu si non spécifié
                let expectedPermission = requiredPermission;
                if (!expectedPermission) {
                    // Déterminer l'action basée sur la méthode HTTP
                    let action = 'read';
                    if (method === 'POST') action = 'create';
                    else if (method === 'PUT' || method === 'PATCH') action = 'update';
                    else if (method === 'DELETE') action = 'delete';
                    
                    expectedPermission = `${moduleName}:${action}`;
                }
                
                // Vérifier si la permission existe
                const permResult = await pool.query(
                    'SELECT id, code, name, category FROM permissions WHERE code = $1',
                    [expectedPermission]
                );
                
                routes.push({
                    method,
                    path: routePath,
                    module: moduleName,
                    requiredPermission: expectedPermission,
                    hasPermission: permResult.rows.length > 0,
                    permission: permResult.rows[0] || null
                });
                
                auditReport.routes.total++;
                
                if (!permResult.rows.length) {
                    auditReport.routes.missingPermissions.push({
                        method,
                        path: routePath,
                        module: moduleName,
                        requiredPermission: expectedPermission
                    });
                }
            }
        }
        
        auditReport.routes.found.push({
            file,
            module: moduleName,
            routes
        });
        
        console.log(`   📦 ${file}: ${routes.length} route(s) trouvée(s)`);
    }
    
    console.log(`\n   📊 Total: ${auditReport.routes.total} routes, ${auditReport.routes.missingPermissions.length} permissions manquantes\n`);
}

/**
 * Analyser la structure du menu
 */
async function auditMenu() {
    console.log('📋 ÉTAPE 3: Audit du menu...\n');
    
    try {
        const sidebarPath = path.join(PUBLIC_DIR, 'template-modern-sidebar.html');
        const content = await fs.readFile(sidebarPath, 'utf-8');
        
        // Extraire les sections de menu
        const sectionRegex = /<li[^>]*data-section="([^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
        
        let sectionMatch;
        while ((sectionMatch = sectionRegex.exec(content)) !== null) {
            const sectionCode = sectionMatch[1];
            const sectionName = sectionMatch[2].trim();
            
            // Extraire les items de cette section
            const sectionContent = content.substring(sectionMatch.index);
            const nextSectionIndex = content.indexOf('<li', sectionMatch.index + 1);
            const sectionEnd = nextSectionIndex > 0 ? nextSectionIndex : content.length;
            const sectionText = content.substring(sectionMatch.index, sectionEnd);
            
            const itemRegex = /<a[^>]*data-permission="([^"]+)"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
            
            const items = [];
            let itemMatch;
            while ((itemMatch = itemRegex.exec(sectionText)) !== null) {
                const permCode = itemMatch[1];
                const href = itemMatch[2];
                const itemName = itemMatch[3].trim();
                
                // Vérifier si la permission existe
                const permResult = await pool.query(
                    'SELECT id, code, name, category FROM permissions WHERE code = $1',
                    [permCode]
                );
                
                items.push({
                    name: itemName,
                    href,
                    permission: permCode,
                    hasPermission: permResult.rows.length > 0,
                    permissionData: permResult.rows[0] || null
                });
                
                if (!permResult.rows.length) {
                    auditReport.menu.missingPermissions.push({
                        section: sectionName,
                        item: itemName,
                        permission: permCode
                    });
                }
            }
            
            auditReport.menu.sections.push({
                code: sectionCode,
                name: sectionName,
                items
            });
            
            console.log(`   📁 ${sectionName}: ${items.length} item(s)`);
        }
        
        // Aussi chercher les permissions de menu dans le format menu.xxx.yyy
        const menuPermissionRegex = /menu\.([^.]+)\.([^"'\s]+)/g;
        const menuPerms = new Set();
        let menuMatch;
        while ((menuMatch = menuPermissionRegex.exec(content)) !== null) {
            menuPerms.add(menuMatch[0]);
        }
        
        console.log(`   📊 Total: ${auditReport.menu.sections.length} sections, ${auditReport.menu.missingPermissions.length} permissions manquantes\n`);
        
    } catch (error) {
        console.error(`   ❌ Erreur lors de l'analyse du menu:`, error.message);
    }
}

/**
 * Analyser les permissions en base de données
 */
async function auditDatabasePermissions() {
    console.log('💾 ÉTAPE 4: Audit des permissions en base de données...\n');
    
    const result = await pool.query(
        'SELECT id, code, name, category FROM permissions ORDER BY category, code'
    );
    
    auditReport.permissions.inDatabase = result.rows;
    
    // Grouper par catégorie
    result.rows.forEach(perm => {
        if (!auditReport.permissions.categories[perm.category]) {
            auditReport.permissions.categories[perm.category] = [];
        }
        auditReport.permissions.categories[perm.category].push(perm);
    });
    
    console.log('   📊 Permissions par catégorie:');
    Object.keys(auditReport.permissions.categories).sort().forEach(category => {
        const count = auditReport.permissions.categories[category].length;
        console.log(`      ${category}: ${count} permission(s)`);
    });
    console.log(`\n   📊 Total: ${result.rows.length} permissions en base de données\n`);
}

/**
 * Générer des recommandations
 */
function generateRecommendations() {
    console.log('💡 ÉTAPE 5: Génération des recommandations...\n');
    
    // Recommandations pour les pages
    if (auditReport.pages.missingPermissions.length > 0) {
        auditReport.recommendations.push({
            type: 'pages',
            priority: 'high',
            message: `${auditReport.pages.missingPermissions.length} pages n'ont pas de permissions configurées`,
            items: auditReport.pages.missingPermissions.map(p => ({
                page: p.file,
                expectedPermission: p.expectedPermission
            }))
        });
    }
    
    // Recommandations pour les routes
    if (auditReport.routes.missingPermissions.length > 0) {
        auditReport.recommendations.push({
            type: 'routes',
            priority: 'high',
            message: `${auditReport.routes.missingPermissions.length} routes n'ont pas de permissions configurées`,
            items: auditReport.routes.missingPermissions.slice(0, 10) // Limiter à 10 pour l'affichage
        });
    }
    
    // Recommandations pour le menu
    if (auditReport.menu.missingPermissions.length > 0) {
        auditReport.recommendations.push({
            type: 'menu',
            priority: 'medium',
            message: `${auditReport.menu.missingPermissions.length} items de menu n'ont pas de permissions configurées`,
            items: auditReport.menu.missingPermissions
        });
    }
    
    console.log(`   ✅ ${auditReport.recommendations.length} recommandation(s) générée(s)\n`);
}

/**
 * Générer le rapport final
 */
function generateReport() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              RAPPORT D\'AUDIT FINAL                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 RÉSUMÉ GÉNÉRAL:');
    console.log('══════════════════');
    console.log(`   Pages HTML          : ${auditReport.pages.total} trouvées, ${auditReport.pages.missingPermissions.length} permissions manquantes`);
    console.log(`   Routes API          : ${auditReport.routes.total} trouvées, ${auditReport.routes.missingPermissions.length} permissions manquantes`);
    console.log(`   Sections de menu    : ${auditReport.menu.sections.length}`);
    console.log(`   Items de menu       : ${auditReport.menu.sections.reduce((sum, s) => sum + s.items.length, 0)}`);
    console.log(`   Permissions manquantes menu: ${auditReport.menu.missingPermissions.length}`);
    console.log(`   Permissions en base : ${auditReport.permissions.inDatabase.length}`);
    console.log(`   Catégories          : ${Object.keys(auditReport.permissions.categories).length}`);
    
    if (auditReport.recommendations.length > 0) {
        console.log('\n⚠️  RECOMMANDATIONS:');
        console.log('════════════════════');
        auditReport.recommendations.forEach((rec, index) => {
            console.log(`\n${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
            if (rec.items && rec.items.length > 0) {
                console.log('   Exemples:');
                rec.items.slice(0, 5).forEach(item => {
                    if (item.expectedPermission) {
                        console.log(`      - ${item.expectedPermission}`);
                    } else if (item.permission) {
                        console.log(`      - ${item.permission}`);
                    }
                });
                if (rec.items.length > 5) {
                    console.log(`      ... et ${rec.items.length - 5} autres`);
                }
            }
        });
    }
    
    console.log('\n✅ AUDIT TERMINÉ\n');
}

/**
 * Fonction principale
 */
async function main() {
    try {
        console.log('📡 Test de connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');
        
        await auditPages();
        await auditRoutes();
        await auditMenu();
        await auditDatabasePermissions();
        generateRecommendations();
        generateReport();
        
        // Sauvegarder le rapport dans un fichier JSON
        const reportPath = path.join(__dirname, '../../audit-permissions-report.json');
        await fs.writeFile(reportPath, JSON.stringify(auditReport, null, 2));
        console.log(`📄 Rapport détaillé sauvegardé dans: ${reportPath}\n`);
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Exécution
main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
});

