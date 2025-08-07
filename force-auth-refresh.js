const { pool } = require('./src/utils/database');
const { generateToken } = require('./src/middleware/auth');

async function forceAuthRefresh() {
    console.log('🔄 Force refresh de l\'authentification pour Raphaël Ngos...');
    
    const client = await pool.connect();
    try {
        // 1. Récupérer les données de Raphaël Ngos
        const raphaelResult = await client.query(`
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.role,
                c.id as collaborateur_id
            FROM users u
            LEFT JOIN collaborateurs c ON u.id = c.user_id
            WHERE u.id = 'b306cee5-cab6-453a-b753-cdaa54cad0d4'
        `);
        
        if (raphaelResult.rows.length === 0) {
            console.log('❌ Raphaël Ngos non trouvé');
            return;
        }
        
        const raphael = raphaelResult.rows[0];
        console.log('📋 Données de Raphaël:', raphael);
        
        // 2. Générer un nouveau token
        const newToken = generateToken(raphael);
        console.log('\n🎯 Nouveau token JWT pour Raphaël:');
        console.log(newToken);
        
        // 3. Mettre à jour last_login
        await client.query(`
            UPDATE users 
            SET last_login = NOW()
            WHERE id = $1
        `, [raphael.id]);
        
        console.log('\n✅ Last login mis à jour');
        
        // 4. Instructions pour l'utilisateur
        console.log('\n📋 Instructions:');
        console.log('1. Ouvrez la console du navigateur (F12)');
        console.log('2. Supprimez l\'ancien token: localStorage.removeItem("authToken")');
        console.log('3. Déconnectez-vous de l\'application');
        console.log('4. Reconnectez-vous avec Raphaël Ngos');
        console.log('5. Ou utilisez ce token directement:');
        console.log('   localStorage.setItem("authToken", "' + newToken + '")');
        console.log('6. Rechargez la page');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        client.release();
    }
}

forceAuthRefresh().catch(console.error);
