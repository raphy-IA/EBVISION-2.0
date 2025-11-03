/**
 * Script de synchronisation complète des permissions
 * 
 * Ce script :
 * 1. Analyse toutes les pages HTML pour extraire les data-permission
 * 2. Compare avec les permissions en base de données
 * 3. Met à jour les permissions pour qu'elles correspondent exactement
 * 4. Normalise les codes de permissions (menu.section.item)
 */

const pool = require('../src/utils/database');
const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

// Configuration
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const IGNORED_FILES = ['login.html', '403.html', '404.html', '500.html'];

/**
 * Fonction pour normaliser les noms en codes (ex: "Tableau de bord principal" -> "tableau_de_bord_principal")
 */
function normalizeCode(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Fonction pour extraire les permissions d'un fichier HTML
 */
async function extractPermissionsFromHTML(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const $ = cheerio.load(content);
        const permissions = new Set();

        // Extraire data-permission des éléments
        $('[data-permission]').each((i, el) => {
            const permission = $(el).attr('data-permission');
            if (permission) {
                permissions.add(permission);
            }
        });

        // Extraire data-required-permission des éléments
        $('[data-required-permission]').each((i, el) => {
            const permission = $(el).attr('data-required-permission');
            if (permission) {
                permissions.add(permission);
            }
        });

        return Array.from(permissions);
    } catch (error) {
        console.error(`❌ Erreur lors de l'analyse de ${filePath}:`, error.message);
        return [];
    }
}

/**
 * Fonction pour scanner tous les fichiers HTML
 */
async function scanAllHTMLFiles() {
    const htmlFiles = [];
    
    async function scanDir(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                await scanDir(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
                const relativePath = path.relative(PUBLIC_DIR, fullPath);
                if (!IGNORED_FILES.includes(entry.name)) {
                    htmlFiles.push({
                        name: entry.name,
                        path: fullPath,
                        relativePath: relativePath
                    });
                }
            }
        }
    }
    
    await scanDir(PUBLIC_DIR);
    return htmlFiles;
}

/**
 * Fonction pour analyser la structure du menu depuis sidebar.html
 */
async function analyzeSidebarStructure() {
    const sidebarPath = path.join(PUBLIC_DIR, 'template-modern-sidebar.html');
    
    try {
        const content = await fs.readFile(sidebarPath, 'utf-8');
        const $ = cheerio.load(content);
        
        const menuStructure = [];
        
        // Analyser chaque section de menu
        $('.sidebar-section').each((i, section) => {
            const $section = $(section);
            const sectionTitle = $section.find('.sidebar-section-title').text().trim();
            const sectionCode = normalizeCode(sectionTitle);
            
            const menuItems = [];
            
            // Analyser les liens de cette section
            $section.find('.sidebar-nav-link').each((j, link) => {
                const $link = $(link);
                const linkText = $link.text().trim();
                const linkHref = $link.attr('href');
                const linkPermission = $link.attr('data-permission') || $link.attr('data-required-permission');
                
                if (linkText && linkHref) {
                    const linkCode = normalizeCode(linkText);
                    const expectedPermission = `menu.${sectionCode}.${linkCode}`;
                    
                    menuItems.push({
                        text: linkText,
                        code: linkCode,
                        href: linkHref,
                        currentPermission: linkPermission,
                        expectedPermission: expectedPermission,
                        needsUpdate: linkPermission !== expectedPermission
                    });
                }
            });
            
            if (sectionTitle && menuItems.length > 0) {
                menuStructure.push({
                    title: sectionTitle,
                    code: sectionCode,
                    items: menuItems
                });
            }
        });
        
        return menuStructure;
    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse de la sidebar:', error.message);
        return [];
    }
}

/**
 * Fonction pour récupérer toutes les permissions de la base de données
 */
async function getDBPermissions() {
    const result = await pool.query(`
        SELECT 
            p.id,
            p.code,
            p.name,
            p.description,
            p.category
        FROM permissions p
        ORDER BY p.code
    `);
    return result.rows;
}

/**
 * Fonction pour mettre à jour ou créer une permission
 */
async function upsertPermission(code, name, description, category) {
    try {
        const result = await pool.query(`
            INSERT INTO permissions (code, name, description, category)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (code) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, code
        `, [code, name, description, category]);
        
        return result.rows[0];
    } catch (error) {
        console.error(`❌ Erreur lors de l'upsert de la permission ${code}:`, error.message);
        return null;
    }
}

/**
 * Fonction principale
 */
async function main() {
    console.log('🔄 Synchronisation complète des permissions...\n');
    
    try {
        // 1. Analyser la structure du menu
        console.log('📋 Étape 1: Analyse de la structure du menu...');
        const menuStructure = await analyzeSidebarStructure();
        console.log(`✅ ${menuStructure.length} sections de menu trouvées\n`);
        
        // 2. Récupérer les permissions actuelles en base
        console.log('📋 Étape 2: Récupération des permissions en base...');
        const dbPermissions = await getDBPermissions();
        console.log(`✅ ${dbPermissions.length} permissions trouvées en base\n`);
        
        // 3. Créer un mapping des permissions par code
        const dbPermissionsMap = new Map();
        dbPermissions.forEach(p => dbPermissionsMap.set(p.code, p));
        
        // 4. Analyser et synchroniser les permissions du menu
        console.log('📋 Étape 3: Synchronisation des permissions du menu...\n');
        
        let created = 0;
        let updated = 0;
        let unchanged = 0;
        
        for (const section of menuStructure) {
            console.log(`\n📁 Section: ${section.title}`);
            console.log(`   Code: ${section.code}`);
            
            for (const item of section.items) {
                const existingPerm = dbPermissionsMap.get(item.expectedPermission);
                
                if (!existingPerm) {
                    // Créer la permission
                    const result = await upsertPermission(
                        item.expectedPermission,
                        item.text,
                        `Accès au menu: ${item.text}`,
                        section.code
                    );
                    
                    if (result) {
                        console.log(`   ✅ Créée: ${item.expectedPermission}`);
                        created++;
                    }
                } else if (existingPerm.name !== item.text || existingPerm.category !== section.code) {
                    // Mettre à jour la permission
                    const result = await upsertPermission(
                        item.expectedPermission,
                        item.text,
                        `Accès au menu: ${item.text}`,
                        section.code
                    );
                    
                    if (result) {
                        console.log(`   🔄 Mise à jour: ${item.expectedPermission}`);
                        updated++;
                    }
                } else {
                    unchanged++;
                }
            }
        }
        
        // 5. Scanner tous les fichiers HTML pour les permissions de pages
        console.log('\n\n📋 Étape 4: Scan des fichiers HTML pour les permissions de pages...\n');
        
        const htmlFiles = await scanAllHTMLFiles();
        console.log(`✅ ${htmlFiles.length} fichiers HTML trouvés\n`);
        
        let pagePermissionsCreated = 0;
        
        for (const file of htmlFiles) {
            const permissions = await extractPermissionsFromHTML(file.path);
            
            if (permissions.length > 0) {
                console.log(`\n📄 ${file.name}:`);
                
                for (const permCode of permissions) {
                    // Vérifier si la permission existe déjà
                    if (!dbPermissionsMap.has(permCode) && !permCode.startsWith('menu.')) {
                        // Extraire le nom de la page (sans .html)
                        const pageName = file.name.replace('.html', '');
                        const pageTitle = pageName
                            .split('-')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                        
                        const result = await upsertPermission(
                            permCode,
                            `${pageTitle} - ${permCode}`,
                            `Permission pour la page ${file.name}`,
                            'page'
                        );
                        
                        if (result) {
                            console.log(`   ✅ Créée: ${permCode}`);
                            pagePermissionsCreated++;
                            dbPermissionsMap.set(permCode, result);
                        }
                    }
                }
            }
        }
        
        // 6. Résumé
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 RÉSUMÉ DE LA SYNCHRONISATION');
        console.log('='.repeat(60));
        console.log(`\n🔹 Permissions de menu:`);
        console.log(`   - Créées: ${created}`);
        console.log(`   - Mises à jour: ${updated}`);
        console.log(`   - Inchangées: ${unchanged}`);
        console.log(`\n🔹 Permissions de pages:`);
        console.log(`   - Créées: ${pagePermissionsCreated}`);
        console.log(`\n🔹 Total en base: ${dbPermissionsMap.size}`);
        console.log('\n✅ Synchronisation terminée avec succès!\n');
        
        // 7. Afficher les permissions qui pourraient être obsolètes
        console.log('\n' + '='.repeat(60));
        console.log('⚠️ VÉRIFICATION DES PERMISSIONS POTENTIELLEMENT OBSOLÈTES');
        console.log('='.repeat(60) + '\n');
        
        const allExpectedCodes = new Set();
        menuStructure.forEach(section => {
            section.items.forEach(item => allExpectedCodes.add(item.expectedPermission));
        });
        
        const obsoletePermissions = dbPermissions.filter(p => 
            p.code.startsWith('menu.') && !allExpectedCodes.has(p.code)
        );
        
        if (obsoletePermissions.length > 0) {
            console.log('❌ Permissions potentiellement obsolètes (non trouvées dans la sidebar):');
            obsoletePermissions.forEach(p => {
                console.log(`   - ${p.code} (${p.nom})`);
            });
            console.log('\n💡 Ces permissions peuvent être supprimées manuellement si elles ne sont plus utilisées.\n');
        } else {
            console.log('✅ Aucune permission obsolète détectée.\n');
        }
        
    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Exécution
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = { main };

