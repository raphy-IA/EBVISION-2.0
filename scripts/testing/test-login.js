// Charger les variables d'environnement
require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
    user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
    password: process.env.DB_PASSWORD || '87ifet-Z)&',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: false,
    family: 4
});

async function testLogin() {
    console.log('🔍 Test de connexion utilisateur...\n');
    
    try {
        const testEmail = 'admin@ebvision.com';
        const testPassword = 'admin123';
        
        console.log('📋 Test avec :');
        console.log(`   Email: ${testEmail}`);
        console.log(`   Mot de passe: ${testPassword}\n`);
        
        // 1. Vérifier que l'utilisateur existe
        console.log('1️⃣ Recherche de l\'utilisateur...');
        const userResult = await pool.query(
            'SELECT id, nom, prenom, email, password_hash, login, role, statut FROM users WHERE email = $1',
            [testEmail]
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ Utilisateur non trouvé');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('✅ Utilisateur trouvé :');
        console.log(`   ID: ${user.id}`);
        console.log(`   Nom: ${user.nom} ${user.prenom}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Login: ${user.login}`);
        console.log(`   Rôle: ${user.role}`);
        console.log(`   Statut: ${user.statut}\n`);
        
        // 2. Vérifier le mot de passe
        console.log('2️⃣ Test du mot de passe...');
        const isValidPassword = await bcrypt.compare(testPassword, user.password_hash);
        
        if (isValidPassword) {
            console.log('✅ Mot de passe correct');
        } else {
            console.log('❌ Mot de passe incorrect');
            console.log('   Hash en base:', user.password_hash);
            
            // Générer un nouveau hash pour comparaison
            const newHash = await bcrypt.hash(testPassword, 12);
            console.log('   Nouveau hash:', newHash);
        }
        
        // 3. Vérifier le statut
        console.log('\n3️⃣ Vérification du statut...');
        if (user.statut === 'ACTIF') {
            console.log('✅ Utilisateur actif');
        } else {
            console.log(`❌ Utilisateur inactif (statut: ${user.statut})`);
        }
        
        // 4. Test de l'API
        console.log('\n4️⃣ Test de l\'API de connexion...');
        const http = require('http');
        
        const postData = JSON.stringify({
            email: testEmail,
            password: testPassword
        });
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                console.log(`   Response: ${data}`);
                
                if (res.statusCode === 200) {
                    console.log('✅ API de connexion fonctionne');
                } else {
                    console.log('❌ Erreur API de connexion');
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ Erreur de connexion à l\'API:', error.message);
        });
        
        req.write(postData);
        req.end();
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
    } finally {
        await pool.end();
    }
}

testLogin();



















