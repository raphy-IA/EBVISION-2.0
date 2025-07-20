const fs = require('fs');
const path = require('path');
const { query, connectDatabase } = require('../src/utils/database');

async function executeSeed(filename, sqlContent) {
    try {
        console.log(`🌱 Exécution du seed: ${filename}`);
        
        // Diviser le contenu SQL en requêtes individuelles
        const queries = sqlContent
            .split(';')
            .map(query => query.trim())
            .filter(query => query.length > 0 && !query.startsWith('--'));

        // Exécuter chaque requête
        for (let i = 0; i < queries.length; i++) {
            const queryText = queries[i];
            if (queryText.trim()) {
                try {
                    await query(queryText);
                    console.log(`  ✅ Requête ${i + 1}/${queries.length} exécutée`);
                } catch (error) {
                    // Pour les seeds, on continue même en cas d'erreur (données déjà présentes)
                    console.log(`  ⚠️  Requête ${i + 1}/${queries.length} ignorée (${error.message})`);
                }
            }
        }

        console.log(`✅ Seed ${filename} terminé`);
    } catch (error) {
        console.error(`❌ Erreur lors de l'exécution du seed ${filename}:`, error);
        throw error;
    }
}

async function runSeeds() {
    try {
        console.log('🌱 Démarrage des seeds...');
        
        // Connexion à la base de données
        await connectDatabase();
        
        // Lire le dossier des seeds
        const seedsDir = path.join(__dirname, 'seeds');
        const seedFiles = fs.readdirSync(seedsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Trier par ordre alphabétique
        
        console.log('📁 Fichiers de seed trouvés:', seedFiles);
        
        // Exécuter tous les seeds
        for (const filename of seedFiles) {
            const filePath = path.join(seedsDir, filename);
            const sqlContent = fs.readFileSync(filePath, 'utf8');
            
            await executeSeed(filename, sqlContent);
        }
        
        console.log('🎉 Tous les seeds ont été exécutés avec succès!');
        
        // Afficher les informations de connexion
        console.log('\n📋 Informations de connexion:');
        console.log('👤 Email: admin@eb-vision.com');
        console.log('🔑 Mot de passe: Admin123!');
        console.log('⚠️  IMPORTANT: Changez ce mot de passe en production!');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution des seeds:', error);
        process.exit(1);
    }
}

// Exécuter les seeds si le script est appelé directement
if (require.main === module) {
    runSeeds();
}

module.exports = { runSeeds }; 