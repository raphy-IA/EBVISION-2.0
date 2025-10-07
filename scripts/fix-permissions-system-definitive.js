// SCRIPT DÉFINITIF - Correction complète du système de permissions EB-Vision 2.0
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function fixPermissionsSystemDefinitive() {
    console.log('🔧 CORRECTION DÉFINITIVE du système de permissions EB-Vision 2.0...\n');
    
    try {
        console.log('1️⃣ CORRECTION DU PERMISSIONMANAGER...');
        
        // Créer un PermissionManager fonctionnel
        const permissionManagerContent = `const { pool } = require('./database');

class PermissionManager {
    /**
     * Vérifier si un utilisateur a une permission spécifique
     * @param {string} userId - ID de l'utilisateur
     * @param {string} permissionName - Nom de la permission
     * @returns {Promise<boolean>} - True si l'utilisateur a la permission
     */
    static async hasPermission(userId, permissionName) {
        try {
            const client = await pool.connect();
            
            // Vérifier les permissions directes de l'utilisateur
            const userPermResult = await client.query(\`
                SELECT COUNT(*) as count
                FROM user_permissions up
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.user_id = $1 AND up.granted = true
                AND (p.name = $2 OR p.code = $2)
            \`, [userId, permissionName]);
            
            if (parseInt(userPermResult.rows[0].count) > 0) {
                client.release();
                return true;
            }
            
            // Vérifier les permissions via le rôle de l'utilisateur
            const rolePermResult = await client.query(\`
                SELECT COUNT(*) as count
                FROM users u
                JOIN roles r ON u.role = r.name
                JOIN role_permissions rp ON r.id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE u.id = $1 AND (p.name = $2 OR p.code = $2)
            \`, [userId, permissionName]);
            
            client.release();
            return parseInt(rolePermResult.rows[0].count) > 0;
            
        } catch (error) {
            console.error('❌ Erreur PermissionManager.hasPermission:', error.message);
            return false;
        }
    }
    
    /**
     * Vérifier si un utilisateur a un rôle spécifique
     * @param {string} userId - ID de l'utilisateur
     * @param {string} roleName - Nom du rôle
     * @returns {Promise<boolean>} - True si l'utilisateur a le rôle
     */
    static async hasRole(userId, roleName) {
        try {
            const client = await pool.connect();
            
            const result = await client.query(\`
                SELECT COUNT(*) as count
                FROM users u
                JOIN roles r ON u.role = r.name
                WHERE u.id = $1 AND r.name = $2
            \`, [userId, roleName]);
            
            client.release();
            return parseInt(result.rows[0].count) > 0;
            
        } catch (error) {
            console.error('❌ Erreur PermissionManager.hasRole:', error.message);
            return false;
        }
    }
    
    /**
     * Obtenir toutes les permissions d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<Array>} - Liste des permissions
     */
    static async getUserPermissions(userId) {
        try {
            const client = await pool.connect();
            
            // Permissions directes
            const userPerms = await client.query(\`
                SELECT p.id, p.code, p.name, p.description, p.category, up.granted
                FROM user_permissions up
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.user_id = $1
            \`, [userId]);
            
            // Permissions via le rôle
            const rolePerms = await client.query(\`
                SELECT p.id, p.code, p.name, p.description, p.category, true as granted
                FROM users u
                JOIN roles r ON u.role = r.name
                JOIN role_permissions rp ON r.id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE u.id = $1
            \`, [userId]);
            
            client.release();
            
            // Combiner et dédupliquer
            const allPerms = [...userPerms.rows, ...rolePerms.rows];
            const uniquePerms = new Map();
            
            allPerms.forEach(perm => {
                if (!uniquePerms.has(perm.code) || perm.granted) {
                    uniquePerms.set(perm.code, perm);
                }
            });
            
            return Array.from(uniquePerms.values());
            
        } catch (error) {
            console.error('❌ Erreur PermissionManager.getUserPermissions:', error.message);
            return [];
        }
    }
}

module.exports = PermissionManager;`;
        
        const permissionManagerPath = path.join(__dirname, '../src/utils/PermissionManager.js');
        fs.writeFileSync(permissionManagerPath, permissionManagerContent);
        console.log('✅ PermissionManager.js créé et corrigé');
        
        console.log('\n2️⃣ CORRECTION DU MIDDLEWARE DES PERMISSIONS...');
        
        // Corriger le middleware dans permissions.js
        const permissionsPath = path.join(__dirname, '../src/routes/permissions.js');
        let permissionsContent = fs.readFileSync(permissionsPath, 'utf8');
        
        // Nouveau middleware simplifié et robuste
        const newMiddleware = `// Middleware simplifié et robuste pour les permissions
const requireAdminPermission = async (req, res, next) => {
    try {
        // Vérifier si l'utilisateur est connecté
        if (!req.user || !req.user.id) {
            console.log('❌ Utilisateur non connecté');
            return res.status(401).json({ error: 'Utilisateur non connecté' });
        }
        
        const userId = req.user.id;
        const userRole = req.user.role;
        
        console.log(\`🔍 Vérification des permissions pour \${userRole} (\${userId})\`);
        
        // Permettre l'accès pour SUPER_ADMIN et ADMIN
        if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
            console.log(\`✅ Accès autorisé pour \${userRole}\`);
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
        
        if (oldMiddlewareRegex.test(permissionsContent)) {
            permissionsContent = permissionsContent.replace(oldMiddlewareRegex, newMiddleware);
            console.log('✅ Ancien middleware remplacé');
        } else {
            console.log('⚠️ Ancien middleware non trouvé, ajout du nouveau...');
            const insertPoint = permissionsContent.indexOf('const permissionManager = require(\'../utils/PermissionManager\');');
            if (insertPoint !== -1) {
                const before = permissionsContent.substring(0, insertPoint);
                const after = permissionsContent.substring(insertPoint);
                permissionsContent = before + newMiddleware + '\n\n' + after;
            }
        }
        
        // Sauvegarder et écrire
        const backupPath = permissionsPath + '.backup';
        fs.writeFileSync(backupPath, fs.readFileSync(permissionsPath, 'utf8'));
        fs.writeFileSync(permissionsPath, permissionsContent);
        console.log('✅ Middleware des permissions corrigé');
        
        console.log('\n3️⃣ VÉRIFICATION DE LA STRUCTURE DES TABLES...');
        
        // Créer un script de vérification des tables
        const checkTablesScript = `// Script de vérification des tables de permissions
require('dotenv').config();
const { Pool } = require('pg');

async function checkTablesStructure() {
    console.log('🔍 Vérification de la structure des tables de permissions...\\n');
    
    try {
        const pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
            user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
            password: process.env.DB_PASSWORD || '87ifet-Z)&',
            ssl: false
        });
        
        const tables = ['roles', 'permissions', 'role_permissions', 'user_permissions', 'users'];
        
        for (const table of tables) {
            try {
                const result = await pool.query(\`SELECT COUNT(*) as count FROM \${table}\`);
                console.log(\`📊 \${table}: \${result.rows[0].count} enregistrements\`);
                
                // Vérifier la structure
                const structure = await pool.query(\`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = \$1 
                    ORDER BY ordinal_position
                \`, [table]);
                
                console.log(\`   📋 Structure de \${table}:\`);
                structure.rows.forEach(col => {
                    console.log(\`      - \${col.column_name}: \${col.data_type} (\${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'})\`);
                });
                
            } catch (error) {
                console.log(\`   ❌ Erreur avec \${table}: \${error.message}\`);
            }
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

checkTablesStructure().catch(console.error);`;
        
        const checkTablesPath = path.join(__dirname, 'check-tables-structure.js');
        fs.writeFileSync(checkTablesPath, checkTablesScript);
        console.log('✅ Script de vérification des tables créé');
        
        console.log('\n🎉 CORRECTION DÉFINITIVE TERMINÉE !');
        console.log('\n📋 RÉSUMÉ DES CORRECTIONS:');
        console.log('✅ PermissionManager.js - Créé et corrigé');
        console.log('✅ Middleware des permissions - Simplifié et robuste');
        console.log('✅ Script de vérification - Créé pour diagnostic');
        
        console.log('\n💡 PROCHAINES ÉTAPES:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Vérifiez la structure: node scripts/check-tables-structure.js');
        console.log('3. Testez la gestion des permissions via l\'interface');
        console.log('4. Les toggles de permissions devraient maintenant fonctionner !');
        
        console.log('\n🔧 EN CAS DE PROBLÈME:');
        console.log('- Vérifiez les logs: pm2 logs eb-vision-2-0');
        console.log('- Vérifiez la structure des tables');
        console.log('- Assurez-vous que les permissions d\'API sont bien associées au SUPER_ADMIN');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixPermissionsSystemDefinitive().catch(console.error);











