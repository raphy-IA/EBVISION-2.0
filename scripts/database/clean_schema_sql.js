const fs = require('fs');
const path = require('path');

/**
 * Nettoyer schema-structure-only.sql des tables supprimées
 */

const schemaFile = path.join(__dirname, 'schema-structure-only.sql');
const backupFile = path.join(__dirname, '../../backups/schema-structure-only-backup.sql');

// Tables supprimées à retirer du schéma
const deletedTables = [
    'hourly_rates',
    'opportunites',
    'menu_items',
    'menu_sections',
    'pages',
    'test_permissions'
];

console.log('\n🧹 NETTOYAGE DU FICHIER schema-structure-only.sql\n');

// Lire le fichier
let content = fs.readFileSync(schemaFile, 'utf8');

// Sauvegarder l'original
fs.writeFileSync(backupFile, content);
console.log(`📦 Backup créé: ${backupFile}\n`);

let totalRemoved = 0;

deletedTables.forEach(tableName => {
    console.log(`🗑️  Suppression des références à: ${tableName}`);

    let beforeLength = content.length;

    // Pattern pour supprimer les sections de CREATE TABLE
    const createPattern = new RegExp(
        `-- Name: ${tableName}[\\s\\S]*?CREATE TABLE public\\.${tableName}[\\s\\S]*?;\\n`,
        'g'
    );
    content = content.replace(createPattern, '');

    // Supprimer les ALTER TABLE OWNER
    const ownerPattern = new RegExp(
        `ALTER TABLE public\\.${tableName} OWNER TO .*?;\\n`,
        'g'
    );
    content = content.replace(ownerPattern, '');

    // Supprimer les COMMENT ON TABLE
    const commentPattern = new RegExp(
        `-- Name: TABLE ${tableName}[\\s\\S]*?COMMENT ON TABLE public\\.${tableName}[\\s\\S]*?;\\n`,
        'g'
    );
    content = content.replace(commentPattern, '');

    // Supprimer les contraintes
    const constraintPattern = new RegExp(
        `-- Name: ${tableName}.*?;[\\s\\S]*?ALTER TABLE ONLY public\\.${tableName}[\\s\\S]*?;\\n`,
        'g'
    );
    content = content.replace(constraintPattern, '');

    // Supprimer les index
    const indexPattern = new RegExp(
        `-- Name: idx_${tableName}.*?;[\\s\\S]*?CREATE INDEX .*? ON public\\.${tableName}[\\s\\S]*?;\\n`,
        'g'
    );
    content = content.replace(indexPattern, '');

    // Supprimer les foreign keys
    const fkPattern = new RegExp(
        `-- Name: ${tableName}.*?fkey[\\s\\S]*?ALTER TABLE ONLY public\\.${tableName}[\\s\\S]*?;\\n`,
        'g'
    );
    content = content.replace(fkPattern, '');

    // Supprimer les triggers
    const triggerPattern = new RegExp(
        `-- Name: ${tableName}.*?;[\\s\\S]*?CREATE TRIGGER .*? ON public\\.${tableName}[\\s\\S]*?;\\n`,
        'g'
    );
    content = content.replace(triggerPattern, '');

    const removed = beforeLength - content.length;
    if (removed > 0) {
        console.log(`   ✅ ${removed} caractères supprimés`);
        totalRemoved += removed;
    } else {
        console.log(`   ⊙ Aucune référence trouvée`);
    }
});

// Nettoyer les lignes vides multiples
content = content.replace(/\n{3,}/g, '\n\n');

// Écrire le fichier nettoyé
fs.writeFileSync(schemaFile, content);

console.log(`\n✅ Nettoyage terminé!`);
console.log(`📊 Total supprimé: ${totalRemoved} caractères`);
console.log(`📄 Fichier mis à jour: ${schemaFile}`);
console.log(`📦 Backup disponible: ${backupFile}\n`);
