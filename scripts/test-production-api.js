// Script pour tester l'API de production et identifier l'erreur 500
const https = require('https');

async function testProductionAPI() {
    console.log('🔍 Test de l\'API de production...\n');

    const options = {
        hostname: 'ebvision2.0.eb-partnersgroup.cm',
        port: 443,
        path: '/api/permissions/roles',
        method: 'GET',
        headers: {
            'User-Agent': 'EB-Vision-Diagnostic/1.0'
        }
    };

    console.log('1️⃣ Test de l\'endpoint GET /api/permissions/roles...');
    
    const req = https.request(options, (res) => {
        console.log(`📡 Status: ${res.statusCode}`);
        console.log(`📋 Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`📄 Réponse: ${data}`);
            
            if (res.statusCode === 200) {
                console.log('✅ API accessible !');
            } else if (res.statusCode === 401) {
                console.log('🔐 Authentification requise (normal)');
            } else {
                console.log(`❌ Erreur ${res.statusCode}`);
            }
        });
    });

    req.on('error', (error) => {
        console.error(`❌ Erreur de connexion: ${error.message}`);
    });

    req.end();

    // Attendre un peu puis tester un autre endpoint
    setTimeout(() => {
        console.log('\n2️⃣ Test de l\'endpoint POST /api/permissions/roles/.../permissions/...');
        
        const postOptions = {
            hostname: 'ebvision2.0.eb-partnersgroup.cm',
            port: 443,
            path: '/api/permissions/roles/test-role-id/permissions/test-permission-id',
            method: 'POST',
            headers: {
                'User-Agent': 'EB-Vision-Diagnostic/1.0',
                'Content-Type': 'application/json',
                'Content-Length': 0
            }
        };

        const postReq = https.request(postOptions, (res) => {
            console.log(`📡 Status POST: ${res.statusCode}`);
            console.log(`📋 Headers POST:`, res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📄 Réponse POST: ${data}`);
                
                if (res.statusCode === 500) {
                    console.log('❌ Erreur 500 confirmée !');
                    console.log('💡 Le problème est dans le code de l\'application');
                } else if (res.statusCode === 401) {
                    console.log('🔐 Authentification requise (normal)');
                } else {
                    console.log(`📊 Status inattendu: ${res.statusCode}`);
                }
            });
        });

        postReq.on('error', (error) => {
            console.error(`❌ Erreur de connexion POST: ${error.message}`);
        });

        postReq.end();
    }, 2000);
}

testProductionAPI().catch(console.error);











