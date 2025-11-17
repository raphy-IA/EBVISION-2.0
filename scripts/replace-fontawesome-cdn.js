#!/usr/bin/env node
/**
 * Script pour remplacer les références au CDN FontAwesome par des références locales
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
const LOCAL_URL = '/vendor/fontawesome/css/all.min.css';

let filesProcessed = 0;
let filesModified = 0;

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Vérifier si le fichier contient le CDN FontAwesome
        if (content.includes(CDN_URL)) {
            // Remplacer le CDN par le chemin local
            const newContent = content.replace(
                new RegExp(CDN_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                LOCAL_URL
            );
            
            // Écrire le fichier modifié
            fs.writeFileSync(filePath, newContent, 'utf8');
            filesModified++;
            console.log(`✅ Modifié: ${path.relative(PUBLIC_DIR, filePath)}`);
        }
        
        filesProcessed++;
    } catch (error) {
        console.error(`❌ Erreur sur ${filePath}:`, error.message);
    }
}

function processDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
            // Ignorer certains dossiers
            if (!['node_modules', '.git', 'vendor'].includes(entry.name)) {
                processDirectory(fullPath);
            }
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            processFile(fullPath);
        }
    }
}

console.log('🔄 Remplacement des références CDN FontAwesome...\n');
processDirectory(PUBLIC_DIR);

console.log(`\n✅ Terminé !`);
console.log(`📊 Fichiers traités: ${filesProcessed}`);
console.log(`📝 Fichiers modifiés: ${filesModified}`);
console.log(`\n🎯 Redémarrez le serveur pour appliquer les changements.`);






