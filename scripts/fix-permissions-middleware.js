// Script pour corriger le middleware des permissions
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function fixPermissionsMiddleware() {
    console.log('🔧 Correction du middleware des permissions...\n');
    
    try {
        const permissionsFile = path.join(__dirname, '../src/routes/permissions.js');
        
        console.log('1️⃣ Lecture du fichier permissions.js...');
        
        if (!fs.existsSync(permissionsFile)) {
            console.log('❌ Fichier permissions.js non trouvé !');
            return;
        }
        
        let content = fs.readFileSync(permissionsFile, 'utf8');
        console.log('✅ Fichier permissions.js lu');
        
        console.log('\n2️⃣ Remplacement du middleware requireAdminPermission...');
        
        // Nouveau middleware simplifié
        const newMiddleware = `// Middleware simplifié pour les permissions
const requireAdminPermission = async (req, res, next) => {
    try {
        // Vérifier si l'utilisateur est connecté
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Utilisateur non connecté' });
        }
        
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Permettre l'accès pour SUPER_ADMIN et ADMIN
        if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
            console.log(\`✅ Accès autorisé pour \${userRole} (\${userId})\`);
            return next();
        }
        
        // Vérifier les permissions via le PermissionManager
        try {
            const permissionManager = require('../utils/PermissionManager');
            const hasPermission = await permissionManager.hasPermission(userId, 'permission.manage');
            if (hasPermission) {
                console.log(\`✅ Permission accordée pour \${userId}\`);
                return next();
            }
        } catch (permError) {
            console.log('⚠️ Erreur PermissionManager, accès refusé:', permError.message);
        }
        
        console.log(\`❌ Accès refusé pour \${userRole} (\${userId})\`);
        return res.status(403).json({ error: 'Permissions insuffisantes' });
        
    } catch (error) {
        console.error('❌ Erreur dans le middleware de permissions:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
};`;
        
        // Remplacer l'ancien middleware
        const oldMiddlewareRegex = /\/\/ Middleware temporaire pour permettre l'accès aux administrateurs existants[\s\S]*?};/;
        
        if (oldMiddlewareRegex.test(content)) {
            content = content.replace(oldMiddlewareRegex, newMiddleware);
            console.log('✅ Ancien middleware remplacé');
        } else {
            console.log('⚠️ Ancien middleware non trouvé, ajout du nouveau...');
            // Ajouter après la ligne 6
            const insertPoint = content.indexOf('const permissionManager = require(\'../utils/PermissionManager\');');
            if (insertPoint !== -1) {
                const before = content.substring(0, insertPoint);
                const after = content.substring(insertPoint);
                content = before + newMiddleware + '\n\n' + after;
            }
        }
        
        console.log('\n3️⃣ Sauvegarde du fichier corrigé...');
        
        // Créer une sauvegarde
        const backupFile = permissionsFile + '.backup';
        fs.writeFileSync(backupFile, fs.readFileSync(permissionsFile, 'utf8'));
        console.log(`✅ Sauvegarde créée: ${backupFile}`);
        
        // Écrire le nouveau contenu
        fs.writeFileSync(permissionsFile, content);
        console.log('✅ Fichier permissions.js corrigé');
        
        console.log('\n🎉 Correction terminée !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Testez la gestion des permissions via l\'interface');
        console.log('3. Les toggles de permissions devraient maintenant fonctionner !');
        
        console.log('\n📋 Résumé des changements:');
        console.log('- Middleware simplifié et plus robuste');
        console.log('- Vérification des rôles SUPER_ADMIN et ADMIN');
        console.log('- Gestion d\'erreur améliorée');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixPermissionsMiddleware().catch(console.error);









