const { query } = require('../src/utils/database');

async function diagnoseAuthCollaborateurRelation() {
    console.log('🔍 DIAGNOSTIC DE LA RELATION AUTH-COLLABORATEUR');
    console.log('================================================');

    try {
        // 1. Vérifier la structure des tables
        console.log('\n📋 1. VÉRIFICATION DE LA STRUCTURE DES TABLES');
        
        const usersStructure = await query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        const collaborateursStructure = await query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs' 
            ORDER BY ordinal_position
        `);

        console.log('✅ Structure table users:', usersStructure.rows.map(r => r.column_name));
        console.log('✅ Structure table collaborateurs:', collaborateursStructure.rows.map(r => r.column_name));

        // 2. Vérifier les contraintes
        console.log('\n🔗 2. VÉRIFICATION DES CONTRAINTES');
        
        const constraints = await query(`
            SELECT 
                tc.table_name, 
                tc.constraint_name, 
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            LEFT JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name IN ('users', 'collaborateurs')
            ORDER BY tc.table_name, tc.constraint_name
        `);

        console.log('✅ Contraintes trouvées:');
        constraints.rows.forEach(constraint => {
            console.log(`   - ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
        });

        // 3. Vérifier les données existantes
        console.log('\n📊 3. ANALYSE DES DONNÉES EXISTANTES');
        
        const usersCount = await query('SELECT COUNT(*) as count FROM users');
        const collaborateursCount = await query('SELECT COUNT(*) as count FROM collaborateurs');
        
        console.log(`✅ Nombre d'utilisateurs: ${usersCount.rows[0].count}`);
        console.log(`✅ Nombre de collaborateurs: ${collaborateursCount.rows[0].count}`);

        // 4. Vérifier les relations existantes
        console.log('\n🔗 4. VÉRIFICATION DES RELATIONS EXISTANTES');
        
        const usersWithCollaborateur = await query(`
            SELECT COUNT(*) as count 
            FROM users u 
            WHERE u.collaborateur_id IS NOT NULL
        `);
        
        const collaborateursWithUser = await query(`
            SELECT COUNT(*) as count 
            FROM collaborateurs c 
            WHERE c.user_id IS NOT NULL
        `);

        console.log(`✅ Utilisateurs avec collaborateur_id: ${usersWithCollaborateur.rows[0].count}`);
        console.log(`✅ Collaborateurs avec user_id: ${collaborateursWithUser.rows[0].count}`);

        // 5. Identifier les problèmes
        console.log('\n⚠️ 5. IDENTIFICATION DES PROBLÈMES');
        
        // Utilisateurs sans collaborateur
        const usersWithoutCollaborateur = await query(`
            SELECT u.id, u.nom, u.prenom, u.email, u.collaborateur_id
            FROM users u 
            WHERE u.collaborateur_id IS NULL
        `);
        
        // Collaborateurs sans utilisateur
        const collaborateursWithoutUser = await query(`
            SELECT c.id, c.nom, c.prenom, c.email, c.user_id
            FROM collaborateurs c 
            WHERE c.user_id IS NULL
        `);

        console.log(`⚠️ Utilisateurs sans collaborateur: ${usersWithoutCollaborateur.rows.length}`);
        usersWithoutCollaborateur.rows.forEach(user => {
            console.log(`   - ${user.nom} ${user.prenom} (${user.email})`);
        });

        console.log(`⚠️ Collaborateurs sans utilisateur: ${collaborateursWithoutUser.rows.length}`);
        collaborateursWithoutUser.rows.forEach(collab => {
            console.log(`   - ${collab.nom} ${collab.prenom} (${collab.email})`);
        });

        // 6. Proposer des corrections
        console.log('\n🔧 6. PROPOSITIONS DE CORRECTIONS');
        
        if (usersWithoutCollaborateur.rows.length > 0) {
            console.log('📝 Pour les utilisateurs sans collaborateur:');
            console.log('   - Créer des profils collaborateurs correspondants');
            console.log('   - Ou lier à des collaborateurs existants par email');
        }
        
        if (collaborateursWithoutUser.rows.length > 0) {
            console.log('📝 Pour les collaborateurs sans utilisateur:');
            console.log('   - Créer des comptes utilisateurs correspondants');
            console.log('   - Ou lier à des utilisateurs existants par email');
        }

        // 7. Vérifier les utilisateurs de test
        console.log('\n🧪 7. VÉRIFICATION DES UTILISATEURS DE TEST');
        
        const testUser = await query(`
            SELECT u.*, c.nom as collaborateur_nom, c.prenom as collaborateur_prenom
            FROM users u
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            WHERE u.email = 'test@trs.com'
        `);

        if (testUser.rows.length > 0) {
            const user = testUser.rows[0];
            console.log(`✅ Utilisateur de test trouvé: ${user.nom} ${user.prenom}`);
            console.log(`   - Email: ${user.email}`);
            console.log(`   - Collaborateur lié: ${user.collaborateur_nom || 'Aucun'} ${user.collaborateur_prenom || ''}`);
            console.log(`   - Statut: ${user.statut}`);
        } else {
            console.log('❌ Utilisateur de test non trouvé');
        }

        console.log('\n✅ DIAGNOSTIC TERMINÉ');
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    }
}

async function fixAuthCollaborateurRelation() {
    console.log('🔧 CORRECTION DE LA RELATION AUTH-COLLABORATEUR');
    console.log('================================================');

    try {
        // 1. Créer l'utilisateur de test s'il n'existe pas
        console.log('\n👤 1. CRÉATION DE L\'UTILISATEUR DE TEST');
        
        const testUserExists = await query(`
            SELECT id FROM users WHERE email = 'test@trs.com'
        `);

        if (testUserExists.rows.length === 0) {
            console.log('📝 Création de l\'utilisateur de test...');
            
            const bcrypt = require('bcryptjs');
            const passwordHash = await bcrypt.hash('Test123!', 12);
            
            await query(`
                INSERT INTO users (nom, prenom, email, password_hash, login, role, statut)
                VALUES ('Test', 'User', 'test@trs.com', $1, 'test', 'ADMIN', 'ACTIF')
            `, [passwordHash]);
            
            console.log('✅ Utilisateur de test créé');
        } else {
            console.log('✅ Utilisateur de test existe déjà');
        }

        // 2. Créer le collaborateur de test s'il n'existe pas
        console.log('\n👥 2. CRÉATION DU COLLABORATEUR DE TEST');
        
        const testCollaborateurExists = await query(`
            SELECT id FROM collaborateurs WHERE email = 'test@trs.com'
        `);

        if (testCollaborateurExists.rows.length === 0) {
            console.log('📝 Création du collaborateur de test...');
            
            // Récupérer les IDs nécessaires
            const businessUnit = await query('SELECT id FROM business_units LIMIT 1');
            const grade = await query('SELECT id FROM grades LIMIT 1');
            const typeCollaborateur = await query('SELECT id FROM types_collaborateurs LIMIT 1');
            const poste = await query('SELECT id FROM postes LIMIT 1');
            
            if (businessUnit.rows.length > 0 && grade.rows.length > 0 && 
                typeCollaborateur.rows.length > 0 && poste.rows.length > 0) {
                
                await query(`
                    INSERT INTO collaborateurs (
                        nom, prenom, initiales, email, business_unit_id, 
                        grade_actuel_id, type_collaborateur_id, poste_actuel_id, 
                        date_embauche, statut
                    ) VALUES ('Test', 'User', 'TU', 'test@trs.com', $1, $2, $3, $4, CURRENT_DATE, 'ACTIF')
                `, [
                    businessUnit.rows[0].id,
                    grade.rows[0].id,
                    typeCollaborateur.rows[0].id,
                    poste.rows[0].id
                ]);
                
                console.log('✅ Collaborateur de test créé');
            } else {
                console.log('⚠️ Impossible de créer le collaborateur - données de référence manquantes');
            }
        } else {
            console.log('✅ Collaborateur de test existe déjà');
        }

        // 3. Lier l'utilisateur et le collaborateur
        console.log('\n🔗 3. LIAISON UTILISATEUR-COLLABORATEUR');
        
        const user = await query('SELECT id FROM users WHERE email = $1', ['test@trs.com']);
        const collaborateur = await query('SELECT id FROM collaborateurs WHERE email = $1', ['test@trs.com']);
        
        if (user.rows.length > 0 && collaborateur.rows.length > 0) {
            // Mettre à jour l'utilisateur
            await query(`
                UPDATE users 
                SET collaborateur_id = $1 
                WHERE id = $2
            `, [collaborateur.rows[0].id, user.rows[0].id]);
            
            // Mettre à jour le collaborateur
            await query(`
                UPDATE collaborateurs 
                SET user_id = $1 
                WHERE id = $2
            `, [user.rows[0].id, collaborateur.rows[0].id]);
            
            console.log('✅ Liaison utilisateur-collaborateur créée');
        } else {
            console.log('⚠️ Impossible de créer la liaison - utilisateur ou collaborateur manquant');
        }

        // 4. Vérifier le résultat
        console.log('\n✅ 4. VÉRIFICATION DU RÉSULTAT');
        
        const finalCheck = await query(`
            SELECT 
                u.id as user_id, u.nom as user_nom, u.prenom as user_prenom, u.email as user_email,
                c.id as collaborateur_id, c.nom as collaborateur_nom, c.prenom as collaborateur_prenom, c.email as collaborateur_email
            FROM users u
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            WHERE u.email = 'test@trs.com'
        `);

        if (finalCheck.rows.length > 0) {
            const result = finalCheck.rows[0];
            console.log('✅ Liaison vérifiée:');
            console.log(`   - Utilisateur: ${result.user_nom} ${result.user_prenom} (${result.user_email})`);
            console.log(`   - Collaborateur: ${result.collaborateur_nom} ${result.collaborateur_prenom} (${result.collaborateur_email})`);
        }

        console.log('\n✅ CORRECTION TERMINÉE');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
    }
}

// Exécuter le diagnostic et la correction
async function main() {
    await diagnoseAuthCollaborateurRelation();
    console.log('\n' + '='.repeat(50) + '\n');
    await fixAuthCollaborateurRelation();
}

if (require.main === module) {
    main().then(() => {
        console.log('\n🎉 Script terminé avec succès');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = {
    diagnoseAuthCollaborateurRelation,
    fixAuthCollaborateurRelation
}; 