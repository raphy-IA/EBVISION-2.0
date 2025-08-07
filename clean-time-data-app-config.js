// Script de nettoyage utilisant la configuration de l'application
require('dotenv').config();
const { Pool } = require('pg');

// Configuration de la base de données (identique à l'application)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Gestion des événements du pool (comme dans l'application)
pool.on('connect', (client) => {
    console.log('🔗 Nouvelle connexion établie');
});

pool.on('error', (err, client) => {
    console.error('❌ Erreur inattendue du pool:', err);
});

pool.on('remove', (client) => {
    console.log('🔌 Connexion retirée du pool');
});

async function cleanTimeData() {
    const client = await pool.connect();
    
    try {
        console.log('🧹 Début du nettoyage des données de temps...');
        console.log('📋 Configuration utilisée:');
        console.log(`  - Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`  - Port: ${process.env.DB_PORT || 5432}`);
        console.log(`  - Database: ${process.env.DB_NAME || 'eb_vision_2_0'}`);
        console.log(`  - User: ${process.env.DB_USER || 'postgres'}`);
        console.log(`  - Password: ${process.env.DB_PASSWORD ? '***' : 'password'}`);
        
        // Test de connexion
        console.log('\n🔍 Test de connexion...');
        const testResult = await client.query('SELECT NOW()');
        console.log('✅ Connexion réussie - Heure du serveur:', testResult.rows[0].now);
        
        // Vérifier les tables existantes
        console.log('\n📋 Vérification des tables...');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('time_entries', 'time_sheets')
        `);
        
        console.log('📋 Tables trouvées:', tables.rows.map(row => row.table_name));
        
        // Compter les données existantes
        let totalEntries = 0;
        let totalSheets = 0;
        
        if (tables.rows.some(row => row.table_name === 'time_entries')) {
            const countEntries = await client.query('SELECT COUNT(*) FROM time_entries;');
            totalEntries = parseInt(countEntries.rows[0].count);
            console.log(`📊 Entrées de temps existantes: ${totalEntries}`);
        }
        
        if (tables.rows.some(row => row.table_name === 'time_sheets')) {
            const countSheets = await client.query('SELECT COUNT(*) FROM time_sheets;');
            totalSheets = parseInt(countSheets.rows[0].count);
            console.log(`📊 Feuilles de temps existantes: ${totalSheets}`);
        }
        
        if (totalEntries === 0 && totalSheets === 0) {
            console.log('\n✅ Aucune donnée à supprimer - base déjà vide');
            return;
        }
        
        // Demander confirmation
        console.log('\n⚠️ ATTENTION: Cette opération va supprimer définitivement toutes les données de temps!');
        console.log(`📊 Données à supprimer: ${totalEntries} entrées + ${totalSheets} feuilles de temps`);
        
        // Supprimer les données
        console.log('\n🗑️ Suppression des données...');
        
        if (tables.rows.some(row => row.table_name === 'time_entries')) {
            console.log('🗑️ Suppression des entrées de temps...');
            const deleteTimeEntries = await client.query('DELETE FROM time_entries;');
            console.log(`✅ ${deleteTimeEntries.rowCount} entrées de temps supprimées`);
        }
        
        if (tables.rows.some(row => row.table_name === 'time_sheets')) {
            console.log('🗑️ Suppression des feuilles de temps...');
            const deleteTimeSheets = await client.query('DELETE FROM time_sheets;');
            console.log(`✅ ${deleteTimeSheets.rowCount} feuilles de temps supprimées`);
        }
        
        // Vérifier que les tables sont vides
        console.log('\n🔍 Vérification que les tables sont vides...');
        
        const checkTimeEntries = await client.query('SELECT COUNT(*) FROM time_entries;');
        const checkTimeSheets = await client.query('SELECT COUNT(*) FROM time_sheets;');
        
        const remainingEntries = parseInt(checkTimeEntries.rows[0].count);
        const remainingSheets = parseInt(checkTimeSheets.rows[0].count);
        
        console.log(`📊 Nombre d'entrées de temps restantes: ${remainingEntries}`);
        console.log(`📊 Nombre de feuilles de temps restantes: ${remainingSheets}`);
        
        if (remainingEntries === 0 && remainingSheets === 0) {
            console.log('\n🎉 Nettoyage terminé avec succès!');
            console.log('📋 Les tables sont maintenant vides et prêtes pour les tests.');
            console.log('\n📋 Prochaines étapes:');
            console.log('1. Allez sur http://localhost:3000/time-sheet-modern.html');
            console.log('2. Saisissez des heures chargeables (HC) et non-chargeables (HNC)');
            console.log('3. Sauvegardez et vérifiez qu\'il n\'y a plus d\'erreurs 400');
        } else {
            console.log('\n❌ Erreur: Les tables ne sont pas complètement vides');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
        console.error('💡 Vérifiez que PostgreSQL est démarré et que les identifiants sont corrects');
    } finally {
        client.release();
        await pool.end();
        console.log('🔒 Pool de connexions fermé');
    }
}

// Fonction pour afficher l'aide
function showHelp() {
    console.log('🧹 Script de nettoyage des données de temps');
    console.log('');
    console.log('Usage: node clean-time-data-app-config.js');
    console.log('');
    console.log('Ce script utilise la même configuration de base de données que l\'application principale.');
    console.log('Il supprime toutes les données des tables time_entries et time_sheets.');
    console.log('');
    console.log('⚠️ ATTENTION: Cette opération est irréversible!');
    console.log('');
    console.log('Configuration utilisée:');
    console.log('  - Variables d\'environnement (.env) ou valeurs par défaut');
    console.log('  - Même configuration que l\'application principale');
}

// Vérifier les arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Exécuter le nettoyage
console.log('🚀 Démarrage du script de nettoyage...');
cleanTimeData().catch(console.error); 