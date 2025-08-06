const fs = require('fs');
const path = require('path');

function fixAuthRedirect() {
    console.log('🔧 CORRECTION DU SYSTÈME DE REDIRECTION AUTH');
    console.log('============================================');

    try {
        // 1. Vérifier et corriger auth.js
        console.log('\n📝 1. CORRECTION DE auth.js');
        
        const authJsPath = path.join(__dirname, '../public/js/auth.js');
        let authJsContent = fs.readFileSync(authJsPath, 'utf8');
        
        // Vérifier que les redirections pointent vers /login.html
        if (!authJsContent.includes('window.location.href = \'/login.html\'')) {
            console.log('⚠️ Redirection incorrecte détectée dans auth.js');
            
            // Remplacer les redirections incorrectes
            authJsContent = authJsContent.replace(
                /window\.location\.href = ['"]\/['"]/g,
                'window.location.href = \'/login.html\''
            );
            
            fs.writeFileSync(authJsPath, authJsContent);
            console.log('✅ auth.js corrigé');
        } else {
            console.log('✅ auth.js déjà correct');
        }

        // 2. Vérifier et corriger les pages HTML
        console.log('\n📝 2. VÉRIFICATION DES PAGES HTML');
        
        const publicDir = path.join(__dirname, '../public');
        const htmlFiles = fs.readdirSync(publicDir).filter(file => file.endsWith('.html'));
        
        let correctedFiles = 0;
        
        htmlFiles.forEach(file => {
            if (file === 'login.html') return; // Ignorer la page de login
            
            const filePath = path.join(publicDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Vérifier si la page inclut auth.js
            if (content.includes('auth.js')) {
                console.log(`   - ${file}: Inclut auth.js ✅`);
                
                // Vérifier que la page a une structure de base
                if (!content.includes('<html') || !content.includes('</html>')) {
                    console.log(`   ⚠️ ${file}: Structure HTML incomplète`);
                }
            } else {
                console.log(`   - ${file}: N'inclut pas auth.js ⚠️`);
                
                // Ajouter auth.js si c'est une page principale
                const mainPages = ['dashboard.html', 'collaborateurs.html', 'missions.html', 'opportunities.html'];
                if (mainPages.includes(file)) {
                    console.log(`   📝 Ajout d'auth.js à ${file}`);
                    
                    // Ajouter auth.js après les autres scripts
                    const scriptTag = '    <script src="js/auth.js"></script>';
                    if (!content.includes(scriptTag)) {
                        // Trouver la position pour insérer auth.js
                        const insertPosition = content.lastIndexOf('</head>');
                        if (insertPosition !== -1) {
                            content = content.slice(0, insertPosition) + 
                                    '\n    ' + scriptTag + '\n' + 
                                    content.slice(insertPosition);
                            fs.writeFileSync(filePath, content);
                            correctedFiles++;
                            console.log(`   ✅ auth.js ajouté à ${file}`);
                        }
                    }
                }
            }
        });
        
        console.log(`✅ ${correctedFiles} fichiers corrigés`);

        // 3. Créer un script de vérification d'authentification global
        console.log('\n📝 3. CRÉATION D\'UN SCRIPT DE VÉRIFICATION GLOBAL');
        
        const globalAuthScript = `
// Script de vérification d'authentification global
(function() {
    'use strict';
    
    // Vérifier l'authentification au chargement de la page
    document.addEventListener('DOMContentLoaded', function() {
        // Si on est sur la page de login, ne rien faire
        if (window.location.pathname === '/login.html' || 
            window.location.pathname === '/' || 
            window.location.pathname.includes('login')) {
            return;
        }
        
        // Vérifier si un token existe
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('🔒 Aucun token trouvé, redirection vers la page de connexion');
            window.location.href = '/login.html';
            return;
        }
        
        // Vérifier la validité du token
        fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                console.log('🔒 Token invalide, redirection vers la page de connexion');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
            } else {
                console.log('✅ Token valide, utilisateur authentifié');
            }
        })
        .catch(error => {
            console.error('❌ Erreur lors de la vérification du token:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        });
    });
})();
`;
        
        const globalAuthPath = path.join(__dirname, '../public/js/global-auth.js');
        fs.writeFileSync(globalAuthPath, globalAuthScript);
        console.log('✅ Script global-auth.js créé');

        // 4. Ajouter le script global aux pages principales
        console.log('\n📝 4. AJOUT DU SCRIPT GLOBAL AUX PAGES PRINCIPALES');
        
        const mainPages = ['dashboard.html', 'collaborateurs.html', 'missions.html', 'opportunities.html', 'analytics.html'];
        let updatedPages = 0;
        
        mainPages.forEach(page => {
            const filePath = path.join(publicDir, page);
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Ajouter le script global s'il n'est pas déjà présent
                const globalScriptTag = '    <script src="js/global-auth.js"></script>';
                if (!content.includes(globalScriptTag)) {
                    const insertPosition = content.lastIndexOf('</head>');
                    if (insertPosition !== -1) {
                        content = content.slice(0, insertPosition) + 
                                '\n    ' + globalScriptTag + '\n' + 
                                content.slice(insertPosition);
                        fs.writeFileSync(filePath, content);
                        updatedPages++;
                        console.log(`   ✅ Script global ajouté à ${page}`);
                    }
                } else {
                    console.log(`   - ${page}: Script global déjà présent`);
                }
            }
        });
        
        console.log(`✅ ${updatedPages} pages mises à jour`);

        // 5. Créer un guide de test
        console.log('\n📝 5. CRÉATION D\'UN GUIDE DE TEST');
        
        const testGuide = `# Guide de Test - Système d'Authentification

## Tests à effectuer

### 1. Test de redirection automatique
1. Ouvrir http://localhost:3000/dashboard.html sans être connecté
2. Vérifier que vous êtes redirigé vers http://localhost:3000/login.html

### 2. Test de connexion
1. Aller sur http://localhost:3000/login.html
2. Se connecter avec :
   - Email: test@trs.com
   - Mot de passe: Test123!
3. Vérifier que vous êtes redirigé vers le dashboard

### 3. Test de déconnexion
1. Être connecté sur une page
2. Cliquer sur "Déconnexion"
3. Vérifier que vous êtes redirigé vers la page de connexion

### 4. Test de session expirée
1. Être connecté
2. Supprimer le token dans localStorage (F12 > Application > Local Storage)
3. Recharger la page
4. Vérifier que vous êtes redirigé vers la page de connexion

## Pages testées
- ✅ dashboard.html
- ✅ collaborateurs.html
- ✅ missions.html
- ✅ opportunities.html
- ✅ analytics.html

## Utilisateur de test
- Email: test@trs.com
- Mot de passe: Test123!
- Statut: ACTIF
- Rôle: ADMIN
`;
        
        const guidePath = path.join(__dirname, '../GUIDE_TEST_AUTH.md');
        fs.writeFileSync(guidePath, testGuide);
        console.log('✅ Guide de test créé: GUIDE_TEST_AUTH.md');

        console.log('\n✅ CORRECTION TERMINÉE AVEC SUCCÈS');
        console.log('\n🎯 PROCHAINES ÉTAPES:');
        console.log('1. Redémarrer le serveur: npm start');
        console.log('2. Tester la redirection: http://localhost:3000/dashboard.html');
        console.log('3. Se connecter avec: test@trs.com / Test123!');
        console.log('4. Vérifier que toutes les pages protègent l\'accès');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
        throw error;
    }
}

// Exécuter la correction
if (require.main === module) {
    fixAuthRedirect();
    console.log('\n🎉 Correction terminée');
}

module.exports = { fixAuthRedirect }; 