// Script pour obtenir les credentials du SUPER_ADMIN
const { pool } = require('../src/utils/database');

async function getSuperAdminCredentials() {
    try {
        console.log('🔍 Recherche des credentials du SUPER_ADMIN...\n');
        
        const result = await pool.query(`
            SELECT id, nom, prenom, email, login, role, statut, created_at
            FROM users 
            WHERE role = 'SUPER_ADMIN'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        if (result.rows.length > 0) {
            const admin = result.rows[0];
            console.log('👤 SUPER_ADMIN trouvé:');
            console.log('   📧 Email:', admin.email);
            console.log('   🔑 Login:', admin.login);
            console.log('   📅 Créé le:', admin.created_at);
            console.log('   ⚡ Statut:', admin.statut);
            console.log('\n💡 Utilisez ces credentials pour vous connecter:');
            console.log(`   Email: ${admin.email}`);
            console.log('   Mot de passe: (le mot de passe défini lors de la création)');
        } else {
            console.log('❌ Aucun SUPER_ADMIN trouvé');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

getSuperAdminCredentials();











