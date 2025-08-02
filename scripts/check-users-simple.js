const { pool } = require('../src/utils/database');

async function checkUsers() {
    try {
        console.log('🔍 Vérification des utilisateurs...');
        
        const result = await pool.query('SELECT id, nom, prenom, email, role, statut FROM users');
        
        console.log(`✅ ${result.rows.length} utilisateurs trouvés:`);
        result.rows.forEach(user => {
            console.log(`   - ${user.email} (${user.nom} ${user.prenom}) - Role: ${user.role} - Statut: ${user.statut}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsers(); 