const { query } = require('../src/utils/database');

async function fixUserCollaborateurRelation() {
    console.log('🔧 CORRECTION DE LA RELATION UTILISATEUR-COLLABORATEUR');
    console.log('=====================================================');

    try {
        // 1. Vérifier l'utilisateur problématique
        console.log('\n📋 1. VÉRIFICATION DE L\'UTILISATEUR PROBLÉMATIQUE');

        const problematicUser = await query(`
            SELECT id, email, nom, prenom, collaborateur_id
            FROM users
            WHERE email = 'cdjiki@eb-partnersgroup.cm'
        `);

        if (problematicUser.rows.length > 0) {
            const user = problematicUser.rows[0];
            console.log('Utilisateur trouvé:');
            console.log(`  - ID: ${user.id}`);
            console.log(`  - Email: ${user.email}`);
            console.log(`  - Nom: ${user.nom}`);
            console.log(`  - Prénom: ${user.prenom}`);
            console.log(`  - Collaborateur ID: ${user.collaborateur_id || 'NULL'}`);
        } else {
            console.log('❌ Utilisateur cdjiki@eb-partnersgroup.cm non trouvé');
            return;
        }

        // 2. Vérifier les collaborateurs existants
        console.log('\n📋 2. COLLABORATEURS EXISTANTS');

        const collaborateurs = await query(`
            SELECT id, nom, prenom, email
            FROM collaborateurs
            ORDER BY nom, prenom
        `);

        console.log('Collaborateurs disponibles:');
        collaborateurs.rows.forEach((collab, index) => {
            console.log(`  ${index + 1}. ${collab.prenom} ${collab.nom} (${collab.email}) - ID: ${collab.id}`);
        });

        // 3. Chercher un collaborateur correspondant
        console.log('\n📋 3. RECHERCHE D\'UN COLLABORATEUR CORRESPONDANT');

        const matchingCollaborateur = await query(`
            SELECT id, nom, prenom, email
            FROM collaborateurs
            WHERE LOWER(nom) LIKE LOWER($1) OR LOWER(prenom) LIKE LOWER($2)
        `, ['%djiki%', '%cyrille%']);

        if (matchingCollaborateur.rows.length > 0) {
            console.log('Collaborateur correspondant trouvé:');
            matchingCollaborateur.rows.forEach(collab => {
                console.log(`  - ${collab.prenom} ${collab.nom} (${collab.email}) - ID: ${collab.id}`);
            });
        } else {
            console.log('⚠️ Aucun collaborateur correspondant trouvé');
        }

        // 4. Créer un collaborateur pour cet utilisateur si nécessaire
        console.log('\n📋 4. CRÉATION DU COLLABORATEUR SI NÉCESSAIRE');

        let collaborateurId = null;

        if (matchingCollaborateur.rows.length > 0) {
            // Utiliser le premier collaborateur correspondant
            collaborateurId = matchingCollaborateur.rows[0].id;
            console.log(`✅ Utilisation du collaborateur existant: ${collaborateurId}`);
        } else {
            // Créer un nouveau collaborateur
            const newCollaborateur = await query(`
                INSERT INTO collaborateurs (nom, prenom, email)
                VALUES ($1, $2, $3)
                RETURNING id
            `, ['Djiki', 'Cyrille', 'cdjiki@eb-partnersgroup.cm']);

            collaborateurId = newCollaborateur.rows[0].id;
            console.log(`✅ Nouveau collaborateur créé: ${collaborateurId}`);
        }

        // 5. Mettre à jour l'utilisateur avec le collaborateur_id
        console.log('\n📋 5. MISE À JOUR DE L\'UTILISATEUR');

        await query(`
            UPDATE users
            SET collaborateur_id = $1
            WHERE id = $2
        `, [collaborateurId, problematicUser.rows[0].id]);

        console.log('✅ Utilisateur mis à jour avec le collaborateur_id');

        // 6. Vérifier la mise à jour
        console.log('\n📋 6. VÉRIFICATION DE LA MISE À JOUR');

        const updatedUser = await query(`
            SELECT id, email, nom, prenom, collaborateur_id
            FROM users
            WHERE email = 'cdjiki@eb-partnersgroup.cm'
        `);

        if (updatedUser.rows.length > 0) {
            const user = updatedUser.rows[0];
            console.log('Utilisateur mis à jour:');
            console.log(`  - ID: ${user.id}`);
            console.log(`  - Email: ${user.email}`);
            console.log(`  - Collaborateur ID: ${user.collaborateur_id}`);
        }

        // 7. Tester la relation
        console.log('\n🧪 7. TEST DE LA RELATION');

        const testCollaborateur = await query(`
            SELECT id, nom, prenom
            FROM collaborateurs
            WHERE id = $1
        `, [collaborateurId]);

        if (testCollaborateur.rows.length > 0) {
            console.log('✅ Collaborateur trouvé:', testCollaborateur.rows[0]);
        } else {
            console.log('❌ Collaborateur non trouvé');
        }

        console.log('\n✅ Correction terminée avec succès');

    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
    }
}

fixUserCollaborateurRelation(); 