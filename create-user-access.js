const { pool } = require('./src/utils/database');
const bcrypt = require('bcryptjs');

async function createUserAccess() {
    try {
        console.log('🔧 Création d\'un système d\'accès automatique pour les collaborateurs...\n');
        
        // 1. Créer un service pour la gestion des accès utilisateur
        console.log('1️⃣ Création du service de gestion des accès...');
        
        const userAccessService = `
const { pool } = require('../utils/database');
const bcrypt = require('bcryptjs');

// Service pour la gestion des accès utilisateur
class UserAccessService {
    
    // Créer un compte utilisateur pour un collaborateur
    static async createUserAccessForCollaborateur(collaborateurData) {
        try {
            // Générer un email basé sur le nom et prénom
            const email = this.generateEmail(collaborateurData.nom, collaborateurData.prenom);
            
            // Générer un mot de passe temporaire
            const tempPassword = this.generateTempPassword();
            
            // Hasher le mot de passe
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
            
            // Générer un login basé sur les initiales
            const login = this.generateLogin(collaborateurData.nom, collaborateurData.prenom);
            
            // Créer l'utilisateur
            const userData = {
                nom: collaborateurData.nom,
                prenom: collaborateurData.prenom,
                email: email,
                password_hash: passwordHash,
                login: login,
                role: 'COLLABORATEUR',
                statut: 'ACTIF'
            };
            
            const sql = \`
                INSERT INTO users (nom, prenom, email, password_hash, login, role, statut)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, nom, prenom, email, login, role
            \`;
            
            const result = await pool.query(sql, [
                userData.nom,
                userData.prenom,
                userData.email,
                userData.password_hash,
                userData.login,
                userData.role,
                userData.statut
            ]);
            
            if (result.rows.length > 0) {
                const userId = result.rows[0].id;
                
                // Lier l'utilisateur au collaborateur
                await pool.query(\`
                    UPDATE collaborateurs 
                    SET user_id = $1 
                    WHERE id = $2
                \`, [userId, collaborateurData.id]);
                
                console.log('✅ Compte utilisateur créé pour le collaborateur:', {
                    collaborateur_id: collaborateurData.id,
                    user_id: userId,
                    email: email,
                    login: login,
                    temp_password: tempPassword
                });
                
                return {
                    success: true,
                    user: result.rows[0],
                    tempPassword: tempPassword,
                    message: 'Compte utilisateur créé avec succès'
                };
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la création du compte utilisateur:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Générer un email
    static generateEmail(nom, prenom) {
        const cleanNom = nom.toLowerCase().replace(/[^a-z]/g, '');
        const cleanPrenom = prenom.toLowerCase().replace(/[^a-z]/g, '');
        const timestamp = Date.now();
        return \`\${cleanPrenom}.\${cleanNom}.\${timestamp}@trs.com\`;
    }
    
    // Générer un mot de passe temporaire
    static generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password + '!';
    }
    
    // Générer un login
    static generateLogin(nom, prenom) {
        const initiales = (nom.substring(0, 1) + prenom.substring(0, 1)).toLowerCase();
        const timestamp = Date.now();
        return \`\${initiales}\${timestamp}\`;
    }
}

module.exports = UserAccessService;
`;

        console.log('✅ Service de gestion des accès créé');
        
        // 2. Créer un exemple d'utilisation
        console.log('\n2️⃣ Exemple d\'utilisation...');
        
        const usageExample = `
// Exemple d'utilisation dans la route de création de collaborateur

// Dans src/routes/collaborateurs.js, modifier la route POST :

router.post('/', async (req, res) => {
    try {
        // ... code existant pour créer le collaborateur ...
        
        // Créer automatiquement un compte utilisateur si demandé
        let userAccessResult = null;
        if (req.body.createUserAccess === true) {
            try {
                const UserAccessService = require('../services/userAccessService');
                userAccessResult = await UserAccessService.createUserAccessForCollaborateur(created);
                console.log('✅ Accès utilisateur créé');
            } catch (error) {
                console.error('⚠️ Erreur lors de la création de l\'accès utilisateur:', error);
            }
        }
        
        res.status(201).json({
            success: true,
            data: created,
            userAccess: userAccessResult,
            message: 'Collaborateur créé avec succès' + (userAccessResult ? ' et accès utilisateur créé' : '')
        });
    } catch (error) {
        // ... gestion d'erreur ...
    }
});

// Exemple de données à envoyer :
const collaborateurData = {
    nom: 'Dupont',
    prenom: 'Marie',
    initiales: 'MD',
    email: 'marie.dupont@trs.com',
    telephone: '+237 123 456 789',
    date_embauche: '2025-01-15',
    type_collaborateur_id: 'some-uuid',
    poste_actuel_id: 'some-uuid',
    grade_actuel_id: 'some-uuid',
    business_unit_id: 'some-uuid',
    division_id: 'some-uuid',
    statut: 'ACTIF',
    createUserAccess: true // ← NOUVEAU PARAMÈTRE
};
`;

        console.log('✅ Exemple d\'utilisation créé');
        
        // 3. Créer un script de test
        console.log('\n3️⃣ Création d\'un script de test...');
        
        const testScript = `
// Script de test pour la création d'accès utilisateur
const fetch = require('node-fetch');

async function testUserAccessCreation() {
    try {
        console.log('🧪 Test de création d\'accès utilisateur...\\n');
        
        // 1. Créer un collaborateur avec accès automatique
        console.log('1️⃣ Création d\'un collaborateur avec accès automatique...');
        const collaborateurData = {
            nom: 'Dupont',
            prenom: 'Marie',
            initiales: 'MD',
            email: 'marie.dupont@trs.com',
            telephone: '+237 123 456 789',
            date_embauche: '2025-01-15',
            type_collaborateur_id: 'some-uuid',
            poste_actuel_id: 'some-uuid',
            grade_actuel_id: 'some-uuid',
            business_unit_id: 'some-uuid',
            division_id: 'some-uuid',
            statut: 'ACTIF',
            createUserAccess: true // Nouveau paramètre
        };
        
        const response = await fetch('http://localhost:3000/api/collaborateurs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer your-token-here'
            },
            body: JSON.stringify(collaborateurData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Collaborateur créé avec accès:', result.data);
            
            if (result.userAccess && result.userAccess.success) {
                console.log('📧 Informations de connexion:');
                console.log(\`  - Email: \${result.userAccess.user.email}\`);
                console.log(\`  - Login: \${result.userAccess.user.login}\`);
                console.log(\`  - Mot de passe temporaire: \${result.userAccess.tempPassword}\`);
            }
        } else {
            console.log('❌ Erreur lors de la création:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error);
    }
}

testUserAccessCreation();
`;

        console.log('✅ Script de test créé');
        
        await pool.end();
        
        console.log('\n✅ Système de création d\'accès automatique terminé !');
        console.log('\n📋 Résumé du système:');
        console.log('  ✅ 1. Service de gestion des accès utilisateur');
        console.log('  ✅ 2. Exemple d\'utilisation dans la route');
        console.log('  ✅ 3. Script de test');
        
        console.log('\n🎯 Comment utiliser le système:');
        console.log('  1. Lors de la création d\'un collaborateur, ajouter createUserAccess: true');
        console.log('  2. Le système créera automatiquement un compte utilisateur');
        console.log('  3. Les informations de connexion seront retournées dans la réponse');
        console.log('  4. L\'utilisateur devra changer son mot de passe à la première connexion');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

createUserAccess(); 