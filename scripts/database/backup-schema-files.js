const fs = require('fs');
const path = require('path');

/**
 * Script de backup des fichiers de schéma et scripts d'initialisation
 * Crée un dossier horodaté avec tous les fichiers importants
 */

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupDir = path.join(__dirname, '../../backups/schema-backups', `backup-${timestamp}`);

// Créer le dossier de backup
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

console.log('\n📦 CRÉATION DU BACKUP DES FICHIERS DE SCHÉMA');
console.log('═══════════════════════════════════════════════════════════════════\n');
console.log(`📁 Dossier de backup: ${backupDir}\n`);

// Liste des fichiers à sauvegarder
const filesToBackup = [
    {
        source: path.join(__dirname, 'schema-export.json'),
        dest: 'schema-export.json',
        description: 'Export JSON de la structure (105 tables)'
    },
    {
        source: path.join(__dirname, '../../backups/old-scripts/schema-structure-only.sql'),
        dest: 'schema-structure-only.sql',
        description: 'Schéma SQL structure seule (ancien)'
    },
    {
        source: path.join(__dirname, '0-init-complete.js'),
        dest: '0-init-complete.js',
        description: 'Script d\'initialisation complète'
    },
    {
        source: path.join(__dirname, '1-export-schema-local.js'),
        dest: '1-export-schema-local.js',
        description: 'Script d\'export de schéma local'
    },
    {
        source: path.join(__dirname, '3-insert-reference-data.js'),
        dest: '3-insert-reference-data.js',
        description: 'Script d\'insertion données de référence'
    },
    {
        source: path.join(__dirname, '../migrate.js'),
        dest: 'migrate.js',
        description: 'Script de migrations'
    }
];

let backedUp = 0;
let skipped = 0;

filesToBackup.forEach(file => {
    if (fs.existsSync(file.source)) {
        const destPath = path.join(backupDir, file.dest);
        fs.copyFileSync(file.source, destPath);
        const size = (fs.statSync(destPath).size / 1024).toFixed(2);
        console.log(`   ✅ ${file.dest.padEnd(40)} (${size} KB)`);
        console.log(`      ${file.description}`);
        backedUp++;
    } else {
        console.log(`   ⚠️  ${file.dest.padEnd(40)} (fichier introuvable)`);
        skipped++;
    }
});

// Créer un fichier README dans le backup
const readmeContent = `# Backup du Schéma - ${new Date().toLocaleString('fr-FR')}

## Contexte
Ce backup a été créé avant la mise à jour des fichiers de schéma pour inclure toutes les migrations récentes.

## Problème identifié
Les fichiers schema-structure-only.sql et schema-export.json étaient obsolètes et ne contenaient pas :
- Table: prospecting_campaign_validation_companies
- Table: payments
- Table: payment_allocations  
- Colonne: missions.manager_id
- Et potentiellement d'autres éléments des migrations 017-024

## Base de données de référence
- Nom: EB-PostProd2
- Date d'initialisation: ${new Date().toLocaleDateString('fr-FR')}
- Migrations appliquées: 34 (toutes)

## Fichiers sauvegardés
${filesToBackup.map(f => `- ${f.dest}: ${f.description}`).join('\n')}

## Prochaines étapes
1. Générer un nouveau schema-structure-only.sql depuis EB-PostProd2
2. Générer un nouveau schema-export.json depuis EB-PostProd2
3. Modifier 0-init-complete.js pour marquer automatiquement les migrations comme exécutées

## Restauration
Pour restaurer ces fichiers, copier les fichiers de ce dossier vers leurs emplacements d'origine.
`;

fs.writeFileSync(path.join(backupDir, 'README.md'), readmeContent);

console.log(`\n   📄 README.md créé`);
console.log('\n' + '═'.repeat(67));
console.log(`\n📊 RÉSUMÉ:`);
console.log(`   ✅ Fichiers sauvegardés: ${backedUp}`);
if (skipped > 0) {
    console.log(`   ⚠️  Fichiers ignorés: ${skipped}`);
}
console.log(`   📁 Emplacement: ${backupDir}`);
console.log(`\n✅ Backup terminé avec succès!\n`);

// Créer aussi un fichier avec la liste des migrations actuelles
const migrationsDir = path.join(__dirname, '../../migrations');
if (fs.existsSync(migrationsDir)) {
    const migrations = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const migrationsListContent = `# Liste des migrations au moment du backup\nTotal: ${migrations.length}\n\n${migrations.map((m, i) => `${(i + 1).toString().padStart(3, ' ')}. ${m}`).join('\n')}`;

    fs.writeFileSync(path.join(backupDir, 'MIGRATIONS_LIST.txt'), migrationsListContent);
    console.log(`📋 Liste des ${migrations.length} migrations sauvegardée\n`);
}
