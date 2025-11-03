/**
 * Script pour mettre à jour les attributs data-permission de la sidebar
 * avec les codes normalisés (menu.section.item)
 */

const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

const SIDEBAR_PATH = path.join(__dirname, '..', 'public', 'template-modern-sidebar.html');

/**
 * Fonction pour normaliser les noms en codes
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
 * Fonction principale
 */
async function main() {
    console.log('🔄 Mise à jour des permissions dans la sidebar...\n');
    
    try {
        // Lire le fichier sidebar
        const content = await fs.readFile(SIDEBAR_PATH, 'utf-8');
        const $ = cheerio.load(content, { 
            decodeEntities: false,
            xmlMode: false 
        });
        
        let updatedCount = 0;
        
        // Analyser chaque section de menu
        $('.sidebar-section').each((i, section) => {
            const $section = $(section);
            const sectionTitle = $section.find('.sidebar-section-title').text().trim();
            const sectionCode = normalizeCode(sectionTitle);
            
            // Mettre à jour l'attribut data-section si présent
            if ($section.attr('data-section')) {
                $section.attr('data-section', sectionCode);
            }
            
            // Analyser les liens de cette section
            $section.find('.sidebar-nav-link').each((j, link) => {
                const $link = $(link);
                const linkText = $link.text().trim();
                const linkCode = normalizeCode(linkText);
                const expectedPermission = `menu.${sectionCode}.${linkCode}`;
                
                // Mettre à jour data-permission ou data-required-permission
                if ($link.attr('data-permission')) {
                    $link.attr('data-permission', expectedPermission);
                    updatedCount++;
                } else if ($link.attr('data-required-permission')) {
                    $link.attr('data-required-permission', expectedPermission);
                    updatedCount++;
                } else {
                    // Ajouter data-permission s'il n'existe pas
                    $link.attr('data-permission', expectedPermission);
                    updatedCount++;
                }
                
                console.log(`✅ ${sectionTitle} > ${linkText}`);
                console.log(`   → ${expectedPermission}\n`);
            });
        });
        
        // Sauvegarder le fichier modifié
        const updatedContent = $.html();
        await fs.writeFile(SIDEBAR_PATH, updatedContent, 'utf-8');
        
        console.log('='.repeat(60));
        console.log(`✅ ${updatedCount} permissions mises à jour dans la sidebar`);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        throw error;
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

