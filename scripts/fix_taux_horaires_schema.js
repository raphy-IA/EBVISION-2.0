const { pool } = require('../src/utils/database');

async function runMigration() {
    try {
        console.log('🚀 Démarrage de la migration...');

        const query = `
            ALTER TABLE taux_horaires 
            ALTER COLUMN salaire_base DROP NOT NULL;
        `;

        await pool.query(query);

        console.log('✅ Migration réussie : contrainte NOT NULL supprimée de salaire_base');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

runMigration();
