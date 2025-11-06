const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../utils/database').pool;
const fs = require('fs').promises;
const path = require('path');

/**
 * Scanner l'application pour détecter toutes les pages, menus et permissions
 * Accessible uniquement par SUPER_ADMIN
 */
router.post('/api/sync/permissions-menus', authenticateToken, async (req, res) => {
    try {
        // Vérifier que l'utilisateur est SUPER_ADMIN
        const userRolesResult = await pool.query(
            `SELECT r.name 
             FROM user_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_id = $1`,
            [req.user.id]
        );

        const userRoles = userRolesResult.rows.map(row => row.name);
        if (!userRoles.includes('SUPER_ADMIN')) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé. Seuls les SUPER_ADMIN peuvent synchroniser les permissions.'
            });
        }

        console.log('🔄 Début de la synchronisation des permissions et menus...');

        // 1. Scanner les fichiers HTML dans le dossier public
        const publicDir = path.join(__dirname, '../../public');
        const htmlFiles = await scanHtmlFiles(publicDir);
        
        // 2. Scanner le template de sidebar pour extraire les menus
        const sidebarPath = path.join(publicDir, 'template-modern-sidebar.html');
        const menuStructure = await extractMenuStructure(sidebarPath);

        // 3. Synchroniser les pages
        const pagesSync = await syncPages(htmlFiles);

        // 4. Synchroniser les menus
        const menusSync = await syncMenus(menuStructure);

        // 5. Synchroniser les permissions
        const permissionsSync = await syncPermissions(htmlFiles, menuStructure);

        console.log('✅ Synchronisation terminée avec succès');

        res.json({
            success: true,
            message: 'Synchronisation réussie',
            stats: {
                pages: pagesSync,
                menus: menusSync,
                permissions: permissionsSync
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la synchronisation',
            error: error.message
        });
    }
});

/**
 * Scanner récursivement tous les fichiers HTML
 */
async function scanHtmlFiles(dir, fileList = []) {
    const files = await fs.readdir(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
            // Ignorer certains dossiers
            if (!['node_modules', 'uploads', 'logs', 'css', 'js', 'images', 'fonts'].includes(file)) {
                await scanHtmlFiles(filePath, fileList);
            }
        } else if (file.endsWith('.html') && !file.includes('template') && !file.includes('backup')) {
            const relativePath = path.relative(path.join(__dirname, '../../public'), filePath);
            const urlPath = '/' + relativePath.replace(/\\/g, '/');
            
            // Extraire le titre de la page
            const content = await fs.readFile(filePath, 'utf-8');
            const titleMatch = content.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].replace(' - EB-Vision 2.0', '').trim() : file.replace('.html', '');

            fileList.push({
                filename: file,
                path: urlPath,
                title: title,
                fullPath: filePath
            });
        }
    }

    return fileList;
}

/**
 * Extraire la structure des menus depuis le template de sidebar
 */
async function extractMenuStructure(sidebarPath) {
    const content = await fs.readFile(sidebarPath, 'utf-8');
    const menuStructure = [];

    // Regex pour extraire les sections de menu
    const sectionRegex = /<div class="sidebar-section">[\s\S]*?<div class="sidebar-section-title">[\s\S]*?<i class="[^"]*"><\/i>\s*([^<]+)[\s\S]*?<\/div>([\s\S]*?)(?=<div class="sidebar-section">|<\/nav>)/g;
    
    let match;
    while ((match = sectionRegex.exec(content)) !== null) {
        const sectionName = match[1].trim();
        const sectionContent = match[2];

        // Extraire les liens du menu
        const linkRegex = /<a href="([^"]+)"[^>]*>[\s\S]*?<i class="[^"]*"><\/i>\s*([^<]+)/g;
        const links = [];
        
        let linkMatch;
        while ((linkMatch = linkRegex.exec(sectionContent)) !== null) {
            links.push({
                url: linkMatch[1].trim(),
                label: linkMatch[2].trim()
            });
        }

        if (links.length > 0) {
            menuStructure.push({
                section: sectionName,
                code: sectionName.toUpperCase().replace(/\s+/g, '_'),
                items: links
            });
        }
    }

    return menuStructure;
}

/**
 * Vérifier si une table existe dans la base de données
 */
async function tableExists(tableName) {
    try {
        const result = await pool.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            )`,
            [tableName]
        );
        return result.rows[0].exists;
    } catch (error) {
        return false;
    }
}

/**
 * Synchroniser les pages dans la base de données
 */
async function syncPages(htmlFiles) {
    let added = 0;
    let updated = 0;
    let skipped = 0;

    // Vérifier si la table pages existe
    const pagesTableExists = await tableExists('pages');
    if (!pagesTableExists) {
        console.log('⚠️  Table "pages" n\'existe pas, synchronisation des pages ignorée');
        return { added, updated, skipped, total: htmlFiles.length };
    }

    for (const file of htmlFiles) {
        try {
            // Vérifier si la page existe déjà
            const existingPage = await pool.query(
                'SELECT id, title FROM pages WHERE url = $1',
                [file.path]
            );

            if (existingPage.rows.length > 0) {
                // Mettre à jour si le titre a changé
                if (existingPage.rows[0].title !== file.title) {
                    await pool.query(
                        'UPDATE pages SET title = $1, updated_at = NOW() WHERE url = $2',
                        [file.title, file.path]
                    );
                    updated++;
                } else {
                    skipped++;
                }
            } else {
                // Ajouter la nouvelle page
                await pool.query(
                    `INSERT INTO pages (title, url, created_at, updated_at)
                     VALUES ($1, $2, NOW(), NOW())`,
                    [file.title, file.path]
                );
                added++;
            }
        } catch (error) {
            console.error(`Erreur pour la page ${file.path}:`, error.message);
        }
    }

    return { added, updated, skipped, total: htmlFiles.length };
}

/**
 * Synchroniser les menus dans la base de données
 */
async function syncMenus(menuStructure) {
    let sectionsAdded = 0;
    let sectionsUpdated = 0;
    let itemsAdded = 0;
    let itemsUpdated = 0;

    // Vérifier si les tables de menu existent
    const menuSectionsExists = await tableExists('menu_sections');
    const menuItemsExists = await tableExists('menu_items');
    
    if (!menuSectionsExists || !menuItemsExists) {
        console.log('⚠️  Tables "menu_sections" ou "menu_items" n\'existent pas, synchronisation des menus ignorée');
        return {
            sections: { added: 0, updated: 0 },
            items: { added: 0, updated: 0 }
        };
    }

    for (const section of menuStructure) {
        try {
            // Gérer la section de menu avec gestion des doublons
            const existingSection = await pool.query(
                'SELECT id FROM menu_sections WHERE code = $1',
                [section.code]
            );

            let sectionId;
            if (existingSection.rows.length > 0) {
                sectionId = existingSection.rows[0].id;
                await pool.query(
                    'UPDATE menu_sections SET name = $1, updated_at = NOW() WHERE id = $2',
                    [section.section, sectionId]
                );
                sectionsUpdated++;
            } else {
                // Utiliser ON CONFLICT pour éviter les doublons
                try {
                    const result = await pool.query(
                        `INSERT INTO menu_sections (code, name, created_at, updated_at)
                         VALUES ($1, $2, NOW(), NOW())
                         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
                         RETURNING id`,
                        [section.code, section.section]
                    );
                    sectionId = result.rows[0].id;
                    sectionsAdded++;
                } catch (insertError) {
                    // Si ON CONFLICT n'est pas supporté, réessayer avec une requête SELECT
                    if (insertError.code === '42P01' || insertError.message.includes('ON CONFLICT')) {
                        // Vérifier à nouveau après l'erreur
                        const retryResult = await pool.query(
                            'SELECT id FROM menu_sections WHERE code = $1',
                            [section.code]
                        );
                        if (retryResult.rows.length > 0) {
                            sectionId = retryResult.rows[0].id;
                            sectionsUpdated++;
                        } else {
                            throw insertError;
                        }
                    } else {
                        throw insertError;
                    }
                }
            }

            // Gérer les items du menu
            for (let i = 0; i < section.items.length; i++) {
                const item = section.items[i];
                const menuCode = `menu.${section.code.toLowerCase()}.${item.label.toLowerCase().replace(/\s+/g, '_')}`;

                const existingItem = await pool.query(
                    'SELECT id FROM menu_items WHERE code = $1',
                    [menuCode]
                );

                if (existingItem.rows.length > 0) {
                    await pool.query(
                        `UPDATE menu_items 
                         SET label = $1, url = $2, section_id = $3, display_order = $4, updated_at = NOW()
                         WHERE id = $5`,
                        [item.label, item.url, sectionId, i + 1, existingItem.rows[0].id]
                    );
                    itemsUpdated++;
                } else {
                    await pool.query(
                        `INSERT INTO menu_items (code, label, url, section_id, display_order, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                        [menuCode, item.label, item.url, sectionId, i + 1]
                    );
                    itemsAdded++;
                }
            }
        } catch (error) {
            console.error(`Erreur pour la section ${section.section}:`, error.message);
        }
    }

    return {
        sections: { added: sectionsAdded, updated: sectionsUpdated },
        items: { added: itemsAdded, updated: itemsUpdated }
    };
}

/**
 * Synchroniser les permissions dans la base de données
 */
async function syncPermissions(htmlFiles, menuStructure) {
    let added = 0;
    let updated = 0;
    let skipped = 0;
    let deleted = 0;

    // ===== ÉTAPE 1: NETTOYER LES ANCIENNES PERMISSIONS DE MENU OBSOLÈTES =====
    console.log('🧹 Nettoyage des anciennes permissions de menu...');
    
    // Liste des anciennes clés de section à supprimer
    const obsoleteMenuPatterns = [
        'menu.business_units.%',
        'menu.collaborateurs.%',
        'menu.missions.%',
        'menu.opportunities.%',
        'menu.permissions%',
        'menu.reports.%',
        'menu.settings.%',
        'menu.time_entries.%',
        'menu.users.%'
    ];

    for (const pattern of obsoleteMenuPatterns) {
        try {
            const result = await pool.query(
                'DELETE FROM permissions WHERE code LIKE $1 RETURNING id',
                [pattern]
            );
            deleted += result.rows.length;
        } catch (error) {
            console.error(`Erreur lors de la suppression des permissions ${pattern}:`, error.message);
        }
    }

    console.log(`✅ ${deleted} anciennes permissions de menu supprimées`);

    // ===== ÉTAPE 2: CRÉER/METTRE À JOUR LES PERMISSIONS DE PAGES =====
    console.log('📄 Synchronisation des permissions de pages...');
    
    for (const file of htmlFiles) {
        try {
            const permCode = `page.${file.filename.replace('.html', '').replace(/-/g, '_')}`;
            const permName = `Accès à ${file.title}`;
            const permCategory = 'pages';

            const existing = await pool.query(
                'SELECT id FROM permissions WHERE code = $1',
                [permCode]
            );

            if (existing.rows.length > 0) {
                await pool.query(
                    'UPDATE permissions SET name = $1, category = $2, updated_at = NOW() WHERE id = $3',
                    [permName, permCategory, existing.rows[0].id]
                );
                updated++;
            } else {
                await pool.query(
                    `INSERT INTO permissions (code, name, description, category, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                    [permCode, permName, `Permission d'accès à la page ${file.title}`, permCategory]
                );
                added++;
            }
        } catch (error) {
            console.error(`Erreur pour la permission ${file.path}:`, error.message);
        }
    }

    console.log(`✅ ${added} permissions de pages ajoutées, ${updated} mises à jour`);

    // ===== ÉTAPE 3: CRÉER/METTRE À JOUR LES PERMISSIONS DE MENU =====
    console.log('📋 Synchronisation des permissions de menu...');
    
    let menuAdded = 0;
    let menuUpdated = 0;
    
    for (const section of menuStructure) {
        for (const item of section.items) {
            try {
                // Normaliser le code de permission
                const sectionCode = section.code.toLowerCase().replace(/\s+/g, '_');
                const itemCode = item.label
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
                    .replace(/[^a-z0-9\s]/g, '_') // Remplacer les caractères spéciaux par _
                    .replace(/\s+/g, '_') // Remplacer les espaces par _
                    .replace(/_+/g, '_') // Remplacer les _ multiples par un seul
                    .replace(/^_|_$/g, ''); // Supprimer les _ au début/fin

                const permCode = `menu.${sectionCode}.${itemCode}`;
                const permName = `Menu: ${item.label}`;
                const permCategory = 'menu';

                const existing = await pool.query(
                    'SELECT id, name FROM permissions WHERE code = $1',
                    [permCode]
                );

                if (existing.rows.length > 0) {
                    // Mettre à jour si le nom a changé
                    if (existing.rows[0].name !== permName) {
                        await pool.query(
                            'UPDATE permissions SET name = $1, category = $2, updated_at = NOW() WHERE id = $3',
                            [permName, permCategory, existing.rows[0].id]
                        );
                        menuUpdated++;
                    } else {
                        skipped++;
                    }
                } else {
                    await pool.query(
                        `INSERT INTO permissions (code, name, description, category, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                        [permCode, permName, `Permission pour afficher le menu "${item.label}" dans la section "${section.section}"`, permCategory]
                    );
                    menuAdded++;
                }
            } catch (error) {
                console.error(`Erreur pour la permission menu ${item.label}:`, error.message);
            }
        }
    }

    console.log(`✅ ${menuAdded} permissions de menu ajoutées, ${menuUpdated} mises à jour, ${skipped} inchangées`);

    return { 
        added: added + menuAdded, 
        updated: updated + menuUpdated, 
        skipped, 
        deleted 
    };
}

module.exports = router;

