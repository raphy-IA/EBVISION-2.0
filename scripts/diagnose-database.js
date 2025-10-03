const { exec } = require('child_process');
const fs = require('fs');

async function diagnoseDatabase() {
    console.log('🔍 Diagnostic de la base de données...\n');
    
    // 1. Vérifier si PostgreSQL est installé
    console.log('1️⃣ Vérification de PostgreSQL...');
    exec('which psql', (error, stdout, stderr) => {
        if (error) {
            console.log('   ❌ PostgreSQL n\'est pas installé ou pas dans le PATH');
        } else {
            console.log(`   ✅ PostgreSQL trouvé: ${stdout.trim()}`);
        }
    });
    
    // 2. Vérifier les variables d'environnement
    console.log('\n2️⃣ Variables d\'environnement PostgreSQL...');
    const envVars = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
    envVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`   ${varName}: ${varName === 'PGPASSWORD' ? '***' : value}`);
        } else {
            console.log(`   ${varName}: non définie`);
        }
    });
    
    // 3. Vérifier le fichier .env
    console.log('\n3️⃣ Fichier .env...');
    if (fs.existsSync('.env')) {
        console.log('   ✅ Fichier .env trouvé');
        const envContent = fs.readFileSync('.env', 'utf8');
        const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        lines.forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                const displayValue = key.includes('PASSWORD') ? '***' : value;
                console.log(`   ${key}: ${displayValue}`);
            }
        });
    } else {
        console.log('   ❌ Fichier .env non trouvé');
    }
    
    // 4. Tester différentes configurations de connexion
    console.log('\n4️⃣ Test de différentes configurations...');
    
    const configs = [
        { name: 'localhost', host: 'localhost' },
        { name: '127.0.0.1', host: '127.0.0.1' },
        { name: 'Variables env', host: process.env.PGHOST || 'localhost' }
    ];
    
    configs.forEach(config => {
        console.log(`   Test avec ${config.name} (${config.host})...`);
        exec(`psql -h ${config.host} -p 5432 -U eb_admin20 -d eb_vision_2_0 -c "SELECT 1;" 2>&1`, (error, stdout, stderr) => {
            if (error) {
                console.log(`     ❌ Erreur: ${error.message}`);
            } else {
                console.log(`     ✅ Connexion réussie`);
            }
        });
    });
    
    // 5. Vérifier les processus PostgreSQL
    console.log('\n5️⃣ Processus PostgreSQL...');
    exec('ps aux | grep postgres', (error, stdout, stderr) => {
        if (stdout) {
            const lines = stdout.split('\n').filter(line => line.includes('postgres') && !line.includes('grep'));
            if (lines.length > 0) {
                console.log('   ✅ PostgreSQL est en cours d\'exécution');
                lines.slice(0, 3).forEach(line => {
                    console.log(`     ${line.trim()}`);
                });
            } else {
                console.log('   ❌ Aucun processus PostgreSQL trouvé');
            }
        } else {
            console.log('   ❌ PostgreSQL n\'est pas en cours d\'exécution');
        }
    });
    
    console.log('\n💡 Suggestions :');
    console.log('   1. Vérifiez vos informations de base de données PlanetHoster');
    console.log('   2. Créez le fichier .env avec les bonnes informations');
    console.log('   3. Vérifiez que la base de données existe');
    console.log('   4. Vérifiez que l\'utilisateur a les permissions');
}

diagnoseDatabase();









