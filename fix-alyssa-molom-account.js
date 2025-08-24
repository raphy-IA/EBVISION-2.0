const { pool } = require('./src/utils/database');

async function fixAlyssaMolomAccount() {
    try {
        console.log('🔧 CORRECTION DU COMPTE ALYSSA MOLOM');
        console.log('=====================================\n');

        // 1. Vérifier l'état actuel du compte utilisateur
        console.log('1️⃣ VÉRIFICATION DU COMPTE UTILISATEUR');
        
        const userResult = await pool.query(`
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.login,
                u.role,
                u.statut,
                u.collaborateur_id,
                c.id as collaborateur_id_from_collab,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom,
                c.email as collaborateur_email
            FROM users u
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            WHERE u.login = 'amolom' OR u.email = 'amolom@eb-partnersgroup.cm'
        `);

        if (userResult.rows.length === 0) {
            console.log('❌ Aucun utilisateur trouvé avec le login amolom ou l\'email amolom@eb-partnersgroup.cm');
            return;
        }

        const user = userResult.rows[0];
        console.log('✅ Utilisateur trouvé:');
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Nom: ${user.nom} ${user.prenom}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Login: ${user.login}`);
        console.log(`   - Rôle: ${user.role}`);
        console.log(`   - Statut: ${user.statut}`);
        console.log(`   - Collaborateur ID: ${user.collaborateur_id}`);

        // 2. Vérifier le collaborateur correspondant
        console.log('\n2️⃣ VÉRIFICATION DU COLLABORATEUR');
        
        const collaborateurResult = await pool.query(`
            SELECT 
                id,
                nom,
                prenom,
                email,
                user_id
            FROM collaborateurs
            WHERE nom ILIKE '%molom%' AND prenom ILIKE '%alyssa%'
        `);

        if (collaborateurResult.rows.length === 0) {
            console.log('❌ Aucun collaborateur trouvé pour Alyssa Molom');
            return;
        }

        const collaborateur = collaborateurResult.rows[0];
        console.log('✅ Collaborateur trouvé:');
        console.log(`   - ID: ${collaborateur.id}`);
        console.log(`   - Nom: ${collaborateur.nom} ${collaborateur.prenom}`);
        console.log(`   - Email: ${collaborateur.email}`);
        console.log(`   - User ID: ${collaborateur.user_id}`);

        // 3. Corriger la liaison si nécessaire
        console.log('\n3️⃣ CORRECTION DE LA LIAISON');
        
        if (user.collaborateur_id !== collaborateur.id) {
            console.log('🔗 Correction de la liaison utilisateur-collaborateur...');
            
            await pool.query(`
                UPDATE users 
                SET collaborateur_id = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [collaborateur.id, user.id]);
            
            console.log('✅ Liaison utilisateur corrigée');
        } else {
            console.log('ℹ️ La liaison utilisateur est déjà correcte');
        }

        if (collaborateur.user_id !== user.id) {
            console.log('🔗 Correction de la liaison collaborateur-utilisateur...');
            
            await pool.query(`
                UPDATE collaborateurs 
                SET user_id = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [user.id, collaborateur.id]);
            
            console.log('✅ Liaison collaborateur corrigée');
        } else {
            console.log('ℹ️ La liaison collaborateur est déjà correcte');
        }

        // 4. Activer le compte utilisateur
        console.log('\n4️⃣ ACTIVATION DU COMPTE UTILISATEUR');
        
        if (user.statut === 'INACTIF') {
            console.log('🔄 Activation du compte utilisateur...');
            
            await pool.query(`
                UPDATE users 
                SET statut = 'ACTIF', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [user.id]);
            
            console.log('✅ Compte utilisateur activé');
        } else {
            console.log('ℹ️ Le compte utilisateur est déjà actif');
        }

        // 5. Vérification finale
        console.log('\n5️⃣ VÉRIFICATION FINALE');
        
        const finalCheck = await pool.query(`
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.login,
                u.role,
                u.statut,
                u.collaborateur_id,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom,
                c.user_id
            FROM users u
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            WHERE u.id = $1
        `, [user.id]);

        if (finalCheck.rows.length > 0) {
            const finalUser = finalCheck.rows[0];
            console.log('✅ État final du compte:');
            console.log(`   - Utilisateur: ${finalUser.prenom} ${finalUser.nom} (${finalUser.email})`);
            console.log(`   - Login: ${finalUser.login}`);
            console.log(`   - Statut: ${finalUser.statut}`);
            console.log(`   - Rôle: ${finalUser.role}`);
            console.log(`   - Collaborateur: ${finalUser.collaborateur_prenom} ${finalUser.collaborateur_nom}`);
            console.log(`   - Liaison: ${finalUser.collaborateur_id ? '✅ Lié' : '❌ Non lié'}`);
        }

        console.log('\n✅ CORRECTION TERMINÉE AVEC SUCCÈS !');
        console.log('🎯 Alyssa Molom devrait maintenant pouvoir se connecter avec:');
        console.log('   - Login: amolom');
        console.log('   - Email: amolom@eb-partnersgroup.cm');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
fixAlyssaMolomAccount();
