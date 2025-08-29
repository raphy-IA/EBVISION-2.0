const fs = require('fs');
const path = require('path');

// Lire le fichier SQL généré
const sqlPath = path.join(__dirname, '../database/migrations/046_generated_permissions.sql');
let sqlContent = fs.readFileSync(sqlPath, 'utf8');

// Corriger les apostrophes en les doublant
sqlContent = sqlContent.replace(/'/g, "''");

// Écrire le fichier corrigé
fs.writeFileSync(sqlPath, sqlContent);

console.log('✅ Fichier SQL corrigé avec succès');
console.log('📁 Fichier: ' + sqlPath);
