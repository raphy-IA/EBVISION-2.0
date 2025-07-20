const fs = require('fs');
const path = require('path');
const { query, connectDatabase } = require('../src/utils/database');

// Table pour suivre les migrations
const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

async function createMigrationsTable() {
    try {
        await query(MIGRATIONS_TABLE);
        console.log('✅ Table migrations créée/vérifiée');
    } catch (error) {
        console.error('❌ Erreur lors de la création de la table migrations:', error);
        throw error;
    }
}

async function getExecutedMigrations() {
    try {
        const result = await query('SELECT filename FROM migrations ORDER BY id');
        return result.rows.map(row => row.filename);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des migrations:', error);
        return [];
    }
}

async function markMigrationAsExecuted(filename) {
    try {
        await query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
        console.log(`✅ Migration ${filename} marquée comme exécutée`);
    } catch (error) {
        console.error(`❌ Erreur lors du marquage de la migration ${filename}:`, error);
        throw error;
    }
}

async function executeMigration(filename, sqlContent) {
    try {
        console.log(`🔄 Exécution de la migration: ${filename}`);
        
        // Exécuter le fichier SQL entier en une seule fois
        await query(sqlContent);
        
        await markMigrationAsExecuted(filename);
        console.log(`✅ Migration ${filename} terminée avec succès`);
    } catch (error) {
        console.error(`❌ Erreur lors de l'exécution de la migration ${filename}:`, error);
        throw error;
    }
}

async function runMigrations() {
    try {
        console.log('🚀 Démarrage des migrations...');
        
        // Connexion à la base de données
        await connectDatabase();
        
        // Créer la table migrations si elle n'existe pas
        await createMigrationsTable();
        
        // Récupérer les migrations déjà exécutées
        const executedMigrations = await getExecutedMigrations();
        console.log('📋 Migrations déjà exécutées:', executedMigrations);
        
        // Lire le dossier des migrations
        const migrationsDir = path.join(__dirname, 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Trier par ordre alphabétique
        
        console.log('📁 Fichiers de migration trouvés:', migrationFiles);
        
        // Exécuter les migrations non exécutées
        for (const filename of migrationFiles) {
            if (!executedMigrations.includes(filename)) {
                const filePath = path.join(migrationsDir, filename);
                const sqlContent = fs.readFileSync(filePath, 'utf8');
                
                await executeMigration(filename, sqlContent);
            } else {
                console.log(`⏭️  Migration ${filename} déjà exécutée, ignorée`);
            }
        }
        
        console.log('🎉 Toutes les migrations ont été exécutées avec succès!');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution des migrations:', error);
        process.exit(1);
    }
}

// Exécuter les migrations si le script est appelé directement
if (require.main === module) {
    runMigrations();
}

module.exports = { runMigrations }; 