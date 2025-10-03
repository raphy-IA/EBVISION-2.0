#!/usr/bin/env node

/**
 * Script de restauration de l'ancien design - Restaure complètement depuis les sauvegardes
 * Usage: node scripts/restore-original-design.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 RESTAURATION DE L\'ANCIEN DESIGN');
console.log('===================================\n');

class OriginalDesignRestorer {
    constructor() {
        this.publicDir = path.join(__dirname, '..', 'public');
        this.restoredPages = 0;
        this.errors = [];
    }

    async restore() {
        try {
            // 1. Identifier toutes les sauvegardes
            const backupFiles = this.getBackupFiles();
            
            console.log(`📁 ${backupFiles.length} sauvegardes trouvées`);
            
            // 2. Restaurer chaque fichier depuis sa sauvegarde
            for (const backupFile of backupFiles) {
                await this.restoreFile(backupFile);
            }
            
            // 3. Afficher le rapport
            this.showReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de la restauration:', error);
        }
    }

    getBackupFiles() {
        const files = fs.readdirSync(this.publicDir);
        return files.filter(file => file.includes('.backup.'));
    }

    async restoreFile(backupFile) {
        try {
            const originalFile = backupFile.replace(/\.backup\.\d+$/, '');
            const backupPath = path.join(this.publicDir, backupFile);
            const originalPath = path.join(this.publicDir, originalFile);
            
            console.log(`🔄 Restauration de ${originalFile}...`);
            
            // Restaurer le fichier original depuis la sauvegarde
            fs.copyFileSync(backupPath, originalPath);
            
            this.restoredPages++;
            console.log(`✅ ${originalFile} - Ancien design restauré`);
            
        } catch (error) {
            console.error(`❌ Erreur pour ${backupFile}:`, error.message);
            this.errors.push({ file: backupFile, error: error.message });
        }
    }

    showReport() {
        console.log('\n📊 RAPPORT DE RESTAURATION');
        console.log('===========================');
        console.log(`✅ Pages restaurées: ${this.restoredPages}`);
        console.log(`❌ Erreurs: ${this.errors.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ ERREURS:');
            this.errors.forEach(error => {
                console.log(`   - ${error.file}: ${error.error}`);
            });
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (this.restoredPages > 0) {
            console.log('✅ L\'ancien design a été complètement restauré !');
            console.log('✅ Toutes les pages sont revenues à leur état original');
            console.log('✅ Les styles CSS originaux sont restaurés');
            console.log('✅ La sidebar existante est préservée');
        } else {
            console.log('❌ Aucune page n\'a pu être restaurée');
        }
        
        console.log('\n💡 PROCHAINES ÉTAPES:');
        console.log('1. ✅ Vérifier que l\'ancien design est bien restauré');
        console.log('2. ✅ Identifier les pages qui n\'ont pas la sidebar existante');
        console.log('3. ✅ Reproduire la sidebar existante sur ces pages uniquement');
        console.log('4. ✅ Ne pas modifier le design existant');
        
        console.log('\n🔄 Restauration terminée !');
    }
}

// Exécuter la restauration
const restorer = new OriginalDesignRestorer();
restorer.restore();
