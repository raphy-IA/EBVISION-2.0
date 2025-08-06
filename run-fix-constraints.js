const fs = require('fs');
const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'postgres'
});

async function runFixConstraints() {
    try {
        console.log('🔧 Exécution du script de correction des contraintes...\n');
        
        // Lire le fichier SQL
        const sqlFile = fs.readFileSync('fix-time-sheets-constraints.sql', 'utf8');
        
        // Exécuter le script SQL
        const result = await pool.query(sqlFile);
        
        console.log('✅ Script de correction exécuté avec succès !');
        console.log('📊 Résultats:', result);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution du script:', error.message);
        
        // Si c'est un problème d'authentification, donner des instructions
        if (error.code === '28P01') {
            console.log('\n💡 Pour résoudre le problème d\'authentification PostgreSQL:');
            console.log('1. Vérifiez que PostgreSQL est démarré');
            console.log('2. Vérifiez les identifiants dans le script');
            console.log('3. Ou exécutez manuellement le script SQL dans pgAdmin');
        }
    } finally {
        await pool.end();
    }
}

runFixConstraints(); 