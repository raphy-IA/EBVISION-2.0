const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function testMigration() {
    const client = await pool.connect();

    try {
        console.log('🔍 Test de la migration par parties...\n');

        // Lire le fichier
        const migrationPath = path.join(__dirname, '../migrations/009_refactor_objectives_system.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Diviser en parties
        const parts = migrationSQL.split('-- ============================================');

        console.log(`📊 Fichier divisé en ${parts.length} parties\n`);

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            if (!part) continue;

            const firstLine = part.split('\n')[0];
            console.log(`\n📝 Partie ${i + 1}: ${firstLine.substring(0, 60)}...`);

            try {
                await client.query(part);
                console.log(`   ✅ OK`);
            } catch (error) {
                console.log(`   ❌ ERREUR: ${error.message}`);
                console.log(`   Position: ${error.position}`);

                // Afficher les lignes autour de l'erreur
                if (error.position) {
                    const lines = part.split('\n');
                    let charCount = 0;
                    for (let j = 0; j < lines.length; j++) {
                        charCount += lines[j].length + 1; // +1 pour \n
                        if (charCount >= error.position) {
                            console.log(`   Ligne ${j + 1}: ${lines[j]}`);
                            if (j > 0) console.log(`   Ligne ${j}: ${lines[j - 1]}`);
                            if (j < lines.length - 1) console.log(`   Ligne ${j + 2}: ${lines[j + 1]}`);
                            break;
                        }
                    }
                }

                throw error;
            }
        }

        console.log('\n✅ Toutes les parties ont été exécutées avec succès!');

    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

testMigration();
