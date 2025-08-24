const { pool } = require('./src/utils/database');
const bcrypt = require('bcryptjs');

async function checkUserPassword() {
    try {
        console.log('🔍 VÉRIFICATION DU MOT DE PASSE UTILISATEUR');
        console.log('===========================================\n');

        // Vérifier un utilisateur actif
        const userResult = await pool.query(`
            SELECT id, nom, prenom, email, login, password_hash, statut
            FROM users 
            WHERE statut = 'ACTIF' AND login = 'cdjiki'
        `);

        if (userResult.rows.length === 0) {
            console.log('❌ Aucun utilisateur actif trouvé avec le login cdjiki');
            return;
        }

        const user = userResult.rows[0];
        console.log('✅ Utilisateur trouvé:');
        console.log(`   - Nom: ${user.prenom} ${user.nom}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Login: ${user.login}`);
        console.log(`   - Statut: ${user.statut}`);
        console.log(`   - Password hash: ${user.password_hash ? 'Présent' : 'Absent'}`);

        // Tester quelques mots de passe courants
        const testPasswords = [
            'password123',
            'Password123',
            'Password123!',
            'cdjiki123',
            'admin123',
            'test123'
        ];

        console.log('\n🧪 TEST DES MOTS DE PASSE:');
        for (const password of testPasswords) {
            const isValid = await bcrypt.compare(password, user.password_hash);
            console.log(`   - "${password}": ${isValid ? '✅ Valide' : '❌ Invalide'}`);
        }

        // Créer un nouveau mot de passe si nécessaire
        console.log('\n🔧 CRÉATION D\'UN NOUVEAU MOT DE PASSE:');
        const newPassword = 'Test123!';
        const saltRounds = 12;
        const newHash = await bcrypt.hash(newPassword, saltRounds);
        
        await pool.query(`
            UPDATE users 
            SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [newHash, user.id]);

        console.log(`✅ Nouveau mot de passe créé: "${newPassword}"`);
        console.log(`   - Hash: ${newHash.substring(0, 20)}...`);

        console.log('\n🎯 INFORMATIONS DE CONNEXION:');
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Login: ${user.login}`);
        console.log(`   - Mot de passe: ${newPassword}`);

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
checkUserPassword();
