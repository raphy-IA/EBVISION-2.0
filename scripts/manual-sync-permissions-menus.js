/**
 * Script pour synchroniser manuellement les permissions et menus
 * Fait exactement la même chose que le bouton "Synchroniser Permissions & Menus"
 */

const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const { pool } = require('../src/utils/database');

// Helper pour slugifier les textes
const slugify = (text) => {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '_');
};

// Helper pour obtenir le titre d'une page
async function getPageTitle(filePath) {
    try {
        const htmlContent = await fs.readFile(filePath, 'utf8');
        const $ = cheerio.load(htmlContent);
        return $('title').text() || path.basename(filePath, '.html');
    } catch (error) {
        console.error(`Erreur lecture titre de ${filePath}:`, error.message);
        return path.basename(filePath, '.html');
    }
}

async function syncPermissionsAndMenus() {
    let client;
    const stats = {
        pages: { added: 0, updated: 0, skipped: 0, total: 0 },
        menus: { sections: { added: 0, updated: 0 }, items: { added: 0, updated: 0 } },
        permissions: { added: 0, updated: 0, skipped: 0, deleted: 0 }
    };

    try {
        console.log('🔄 Début de la synchronisation des permissions et menus...\n');
        
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Synchroniser les pages
        console.log('📄 ÉTAPE 1/3 : Synchronisation des pages...');
        const publicPath = path.join(__dirname, '../public');
        const htmlFiles = (await fs.readdir(publicPath)).filter(file => file.endsWith('.html'));

        for (const file of htmlFiles) {
            const filePath = `/${file}`;
            const title = await getPageTitle(path.join(publicPath, file));
            const code = `page.${slugify(path.basename(file, '.html'))}`;

            const existingPage = await client.query('SELECT id, title FROM pages WHERE path = $1', [filePath]);
            if (existingPage.rows.length > 0) {
                if (existingPage.rows[0].title !== title) {
                    await client.query('UPDATE pages SET title = $1, updated_at = NOW() WHERE id = $2', [title, existingPage.rows[0].id]);
                    stats.pages.updated++;
                } else {
                    stats.pages.skipped++;
                }
            } else {
                await client.query('INSERT INTO pages (path, title, code) VALUES ($1, $2, $3)', [filePath, title, code]);
                stats.pages.added++;
            }
            stats.pages.total++;
        }
        
        console.log(`   ✅ Pages : ${stats.pages.added} ajoutées, ${stats.pages.updated} mises à jour, ${stats.pages.skipped} inchangées (${stats.pages.total} total)\n`);

        // 2. Synchroniser les menus
        console.log('📋 ÉTAPE 2/3 : Synchronisation des menus...');
        const sidebarPath = path.join(publicPath, 'template-modern-sidebar.html');
        const sidebarContent = await fs.readFile(sidebarPath, 'utf8');
        const $ = cheerio.load(sidebarContent);

        const sidebarSections = $('.sidebar-section');
        for (const sectionElement of sidebarSections) {
            const sectionTitle = $(sectionElement).find('.sidebar-section-title').text().trim();
            const sectionCode = slugify(sectionTitle);

            let sectionId;
            const existingSection = await client.query('SELECT id FROM menu_sections WHERE code = $1', [sectionCode]);
            if (existingSection.rows.length > 0) {
                sectionId = existingSection.rows[0].id;
                await client.query('UPDATE menu_sections SET name = $1, updated_at = NOW() WHERE id = $2', [sectionTitle, sectionId]);
                stats.menus.sections.updated++;
            } else {
                const newSection = await client.query('INSERT INTO menu_sections (name, code) VALUES ($1, $2) RETURNING id', [sectionTitle, sectionCode]);
                sectionId = newSection.rows[0].id;
                stats.menus.sections.added++;
            }

            const menuItems = $(sectionElement).find('.sidebar-nav-link');
            for (const itemElement of menuItems) {
                const itemName = $(itemElement).text().trim();
                const itemPath = $(itemElement).attr('href');
                const itemCode = slugify(itemName);

                const existingItem = await client.query('SELECT id FROM menu_items WHERE path = $1 AND section_id = $2', [itemPath, sectionId]);
                if (existingItem.rows.length > 0) {
                    await client.query('UPDATE menu_items SET name = $1, code = $2, updated_at = NOW() WHERE id = $3', [itemName, itemCode, existingItem.rows[0].id]);
                    stats.menus.items.updated++;
                } else {
                    await client.query('INSERT INTO menu_items (name, code, path, section_id) VALUES ($1, $2, $3, $4)', [itemName, itemCode, itemPath, sectionId]);
                    stats.menus.items.added++;
                }
            }
        }
        
        console.log(`   ✅ Sections : ${stats.menus.sections.added} ajoutées, ${stats.menus.sections.updated} mises à jour`);
        console.log(`   ✅ Items : ${stats.menus.items.added} ajoutés, ${stats.menus.items.updated} mis à jour\n`);

        // 3. Synchroniser les permissions
        console.log('🔐 ÉTAPE 3/3 : Synchronisation des permissions...');
        
        // Supprimer les anciennes permissions de menu et de pages
        const deletedMenuPerms = await client.query("DELETE FROM permissions WHERE code LIKE 'menu.%' RETURNING id");
        stats.permissions.deleted += deletedMenuPerms.rows.length;
        const deletedPagePerms = await client.query("DELETE FROM permissions WHERE code LIKE 'page.%' RETURNING id");
        stats.permissions.deleted += deletedPagePerms.rows.length;
        
        console.log(`   🗑️  ${stats.permissions.deleted} anciennes permissions supprimées`);

        // Recréer les permissions pour les pages
        const allPages = await client.query('SELECT id, code, title FROM pages');
        for (const page of allPages.rows) {
            const permissionCode = page.code;
            const permissionName = `Accès à la page: ${page.title}`;
            const permissionCategory = 'Pages';

            await client.query(
                'INSERT INTO permissions (code, name, description, category) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = NOW()',
                [permissionCode, permissionName, `Permet d'accéder à la page ${page.title}`, permissionCategory]
            );
            stats.permissions.added++;
        }

        // Recréer les permissions pour les items de menu
        const allMenuItems = await client.query('SELECT mi.id, mi.name, mi.code, ms.code as section_code, ms.name as section_name FROM menu_items mi JOIN menu_sections ms ON mi.section_id = ms.id');
        for (const menuItem of allMenuItems.rows) {
            const permissionCode = `menu.${menuItem.section_code}.${menuItem.code}`;
            const permissionName = `Accès au menu: ${menuItem.name}`;
            const permissionCategory = `Menu - ${menuItem.section_name}`;

            await client.query(
                'INSERT INTO permissions (code, name, description, category) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = NOW()',
                [permissionCode, permissionName, `Permet de voir et d'accéder à l'élément de menu "${menuItem.name}"`, permissionCategory]
            );
            stats.permissions.added++;
        }
        
        console.log(`   ✅ ${stats.permissions.added} permissions créées\n`);

        await client.query('COMMIT');
        
        console.log('════════════════════════════════════════════════════════════');
        console.log('✅ SYNCHRONISATION TERMINÉE AVEC SUCCÈS !');
        console.log('════════════════════════════════════════════════════════════');
        console.log('\n📊 RÉSUMÉ :');
        console.log(`   Pages        : ${stats.pages.added} ajoutées, ${stats.pages.updated} mises à jour, ${stats.pages.total} total`);
        console.log(`   Sections     : ${stats.menus.sections.added} ajoutées, ${stats.menus.sections.updated} mises à jour`);
        console.log(`   Items menu   : ${stats.menus.items.added} ajoutés, ${stats.menus.items.updated} mis à jour`);
        console.log(`   Permissions  : ${stats.permissions.deleted} supprimées, ${stats.permissions.added} créées`);
        console.log('\n💡 Rechargez la page /permissions-admin.html pour voir les changements !');
        
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('\n❌ ERREUR lors de la synchronisation:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

// Exécuter la synchronisation
syncPermissionsAndMenus();





