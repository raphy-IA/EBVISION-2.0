const { query } = require('../src/utils/database');

async function checkExistingUsers() {
    console.log('🔍 Vérification des utilisateurs existants...\n');

    try {
        const sql = `
            SELECT id, nom, prenom, email, grade, statut, created_at
            FROM users
            ORDER BY nom, prenom
        `;

        const result = await query(sql);
        
        console.log(`📊 Nombre d'utilisateurs trouvés: ${result.rows.length}\n`);
        
        if (result.rows.length === 0) {
            console.log('❌ Aucun utilisateur trouvé dans la base de données');
            return;
        }

        console.log('📋 Liste des utilisateurs:');
        result.rows.forEach((user, index) => {
            console.log(`${index + 1}. ${user.nom} ${user.prenom} (${user.email})`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Grade: ${user.grade}`);
            console.log(`   Statut: ${user.statut}`);
            console.log(`   Créé le: ${user.created_at}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

checkExistingUsers(); 