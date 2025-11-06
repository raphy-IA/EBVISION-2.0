#!/usr/bin/env node

/**
 * SCRIPT DE NETTOYAGE DES TITRES HTML
 * ====================================
 * 
 * Nettoie tous les titres HTML pour supprimer les références hardcodées à "EB Vision" / "EBVISION"
 * 
 * Usage: node scripts/ui/clean-html-titles.js
 */

const fs = require('fs').promises;
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../../public');

/**
 * Nettoyer un titre de toutes les références à EB Vision
 */
function cleanTitle(title) {
    if (!title) return title;
    
    let cleaned = title
        .replace(/ - EB-Vision 2\.0/gi, '')
        .replace(/ - EB Vision 2\.0/gi, '')
        .replace(/ - EBVISION 2\.0/gi, '')
        .replace(/ - EBVISION/gi, '')
        .replace(/\bEB-Vision 2\.0\b/gi, '')
        .replace(/\bEB Vision 2\.0\b/gi, '')
        .replace(/\bEBVISION 2\.0\b/gi, '')
        .replace(/\bEB-Vision\b/gi, '')
        .replace(/\bEB Vision\b/gi, '')
        .replace(/\bEBVISION\b/gi, '')
        .trim();
    
    // Nettoyer les tirets en début/fin qui peuvent rester
    cleaned = cleaned.replace(/^[\s\-]+/g, '').replace(/[\s\-]+$/g, '').trim();
    
    return cleaned;
}

/**
 * Scanner et nettoyer tous les fichiers HTML
 */
async function scanAndCleanHTML(dir = PUBLIC_DIR) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let cleaned = 0;
    let unchanged = 0;
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            const result = await scanAndCleanHTML(fullPath);
            cleaned += result.cleaned;
            unchanged += result.unchanged;
        } else if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.includes('backup')) {
            try {
                const content = await fs.readFile(fullPath, 'utf-8');
                const titleMatch = content.match(/<title>(.*?)<\/title>/i);
                
                if (titleMatch) {
                    const originalTitle = titleMatch[1];
                    const cleanedTitle = cleanTitle(originalTitle);
                    
                    if (cleanedTitle !== originalTitle) {
                        const newContent = content.replace(
                            /<title>.*?<\/title>/i,
                            `<title>${cleanedTitle}</title>`
                        );
                        await fs.writeFile(fullPath, newContent, 'utf-8');
                        console.log(`   ✅ ${entry.name}: "${originalTitle}" → "${cleanedTitle}"`);
                        cleaned++;
                    } else {
                        unchanged++;
                    }
                } else {
                    unchanged++;
                }
            } catch (error) {
                console.error(`   ❌ Erreur pour ${entry.name}:`, error.message);
            }
        }
    }
    
    return { cleaned, unchanged };
}

/**
 * Fonction principale
 */
async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     NETTOYAGE DES TITRES HTML                               ║');
    console.log('║     Suppression des références "EB Vision" / "EBVISION"     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Scanner et nettoyer les fichiers HTML...\n');
    
    const result = await scanAndCleanHTML();
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         ✅ NETTOYAGE TERMINÉ                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`   📊 Statistiques:`);
    console.log(`      ✅ ${result.cleaned} fichiers nettoyés`);
    console.log(`      ➡️  ${result.unchanged} fichiers inchangés`);
    console.log(`\n   💡 Pour synchroniser les permissions avec les nouveaux titres:`);
    console.log(`      node scripts/database/sync-all-permissions-complete.js\n`);
}

// Exécuter le script
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { cleanTitle, scanAndCleanHTML };

