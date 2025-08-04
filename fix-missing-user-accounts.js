const { pool } = require('./src/utils/database');
const UserAccessService = require('./src/services/userAccessService');

async function fixMissingUserAccounts() {
    try {
        console.log('🔧 Correction des comptes utilisateur manquants...\n');
        
        // 1. Récupérer les collaborateurs sans compte utilisateur
        console.log('1️⃣ Recherche des collaborateurs sans compte utilisateur...');
        const collaborateursSansUser = await pool.query(`
            SELECT id, nom, prenom, email, created_at
            FROM collaborateurs 
            WHERE user_id IS NULL
            ORDER BY created_at DESC
        `);
        
        console.log(`📊 ${collaborateursSansUser.rows.length} collaborateurs sans compte utilisateur trouvés`);
        
        if (collaborateursSansUser.rows.length === 0) {
            console.log('✅ Tous les collaborateurs ont déjà un compte utilisateur !');
            await pool.end();
            return;
        }
        
        // 2. Créer des comptes utilisateur pour chaque collaborateur
        console.log('\n2️⃣ Création des comptes utilisateur...');
        
        for (let i = 0; i < collaborateursSansUser.rows.length; i++) {
            const collaborateur = collaborateursSansUser.rows[i];
            console.log(`\n--- Traitement ${i + 1}/${collaborateursSansUser.rows.length}: ${collaborateur.prenom} ${collaborateur.nom} ---`);
            
            try {
                // Vérifier si un utilisateur avec cet email existe déjà
                const existingUser = await pool.query(`
                    SELECT id, email, login
                    FROM users 
                    WHERE email = $1
                `, [collaborateur.email]);
                
                if (existingUser.rows.length > 0) {
                    console.log(`⚠️ Un utilisateur avec l'email ${collaborateur.email} existe déjà`);
                    console.log(`   - Login: ${existingUser.rows[0].login}`);
                    console.log(`   - ID: ${existingUser.rows[0].id}`);
                    
                    // Lier le collaborateur à l'utilisateur existant
                    await pool.query(`
                        UPDATE collaborateurs 
                        SET user_id = $1 
                        WHERE id = $2
                    `, [existingUser.rows[0].id, collaborateur.id]);
                    
                    console.log(`✅ Collaborateur lié à l'utilisateur existant`);
                } else {
                    // Créer un nouveau compte utilisateur
                    const userAccessResult = await UserAccessService.createUserAccessForCollaborateur(collaborateur);
                    
                    if (userAccessResult.success) {
                        console.log(`✅ Compte utilisateur créé avec succès`);
                        console.log(`   - Email: ${userAccessResult.user.email}`);
                        console.log(`   - Login: ${userAccessResult.user.login}`);
                        console.log(`   - Mot de passe temporaire: ${userAccessResult.tempPassword}`);
                        console.log(`   - Rôle: ${userAccessResult.user.role}`);
                    } else {
                        console.log(`❌ Erreur lors de la création: ${userAccessResult.error}`);
                    }
                }
                
            } catch (error) {
                console.log(`❌ Erreur pour ${collaborateur.prenom} ${collaborateur.nom}: ${error.message}`);
            }
        }
        
        // 3. Vérifier le résultat final
        console.log('\n3️⃣ Vérification finale...');
        const finalCheck = await pool.query(`
            SELECT COUNT(*) as total,
                   COUNT(user_id) as avec_user,
                   COUNT(*) - COUNT(user_id) as sans_user
            FROM collaborateurs
        `);
        
        const stats = finalCheck.rows[0];
        console.log(`📊 Statistiques finales:`);
        console.log(`   - Total collaborateurs: ${stats.total}`);
        console.log(`   - Avec compte utilisateur: ${stats.avec_user}`);
        console.log(`   - Sans compte utilisateur: ${stats.sans_user}`);
        
        if (parseInt(stats.sans_user) === 0) {
            console.log('🎉 Tous les collaborateurs ont maintenant un compte utilisateur !');
        } else {
            console.log(`⚠️ ${stats.sans_user} collaborateurs n'ont toujours pas de compte utilisateur`);
        }
        
        await pool.end();
        
        console.log('\n✅ Correction terminée !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

fixMissingUserAccounts(); 