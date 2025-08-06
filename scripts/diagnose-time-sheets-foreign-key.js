const { query } = require('../src/utils/database');

async function diagnoseTimeSheetsForeignKey() {
    console.log('🔍 DIAGNOSTIC DE LA CLÉ ÉTRANGÈRE TIME_SHEETS');
    console.log('==============================================');

    try {
        // 1. Vérifier la structure de la table time_sheets
        console.log('\n📋 1. STRUCTURE DE LA TABLE TIME_SHEETS');

        const timeSheetsStructure = await query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'time_sheets'
            ORDER BY ordinal_position
        `);

        console.log('Colonnes de time_sheets:');
        timeSheetsStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // 2. Vérifier les contraintes de clé étrangère
        console.log('\n🔗 2. CONTRAINTES DE CLÉ ÉTRANGÈRE');

        const foreignKeys = await query(`
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'time_sheets'
        `);

        console.log('Contraintes de clé étrangère:');
        foreignKeys.rows.forEach(fk => {
            console.log(`  - ${fk.constraint_name}: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });

        // 3. Vérifier les données dans les tables
        console.log('\n📊 3. DONNÉES DANS LES TABLES');

        const usersCount = await query('SELECT COUNT(*) as count FROM users');
        const collaborateursCount = await query('SELECT COUNT(*) as count FROM collaborateurs');
        const timeSheetsCount = await query('SELECT COUNT(*) as count FROM time_sheets');

        console.log(`Utilisateurs: ${usersCount.rows[0].count}`);
        console.log(`Collaborateurs: ${collaborateursCount.rows[0].count}`);
        console.log(`Feuilles de temps: ${timeSheetsCount.rows[0].count}`);

        // 4. Vérifier l'utilisateur de test
        console.log('\n👤 4. UTILISATEUR DE TEST');

        const testUser = await query(`
            SELECT id, email, collaborateur_id
            FROM users
            WHERE email = 'test@trs.com'
        `);

        if (testUser.rows.length > 0) {
            const user = testUser.rows[0];
            console.log(`Utilisateur test: ${user.email} (ID: ${user.id})`);
            console.log(`Collaborateur ID lié: ${user.collaborateur_id || 'NULL'}`);

            // Vérifier si le collaborateur existe
            if (user.collaborateur_id) {
                const collaborateur = await query(`
                    SELECT id, nom, prenom
                    FROM collaborateurs
                    WHERE id = $1
                `, [user.collaborateur_id]);

                if (collaborateur.rows.length > 0) {
                    console.log(`✅ Collaborateur trouvé: ${collaborateur.rows[0].prenom} ${collaborateur.rows[0].nom}`);
                } else {
                    console.log(`❌ Collaborateur avec ID ${user.collaborateur_id} n'existe pas dans la table collaborateurs`);
                }
            } else {
                console.log('⚠️ Aucun collaborateur_id lié à l\'utilisateur test');
            }
        } else {
            console.log('❌ Utilisateur test@trs.com non trouvé');
        }

        // 5. Vérifier les collaborateurs existants
        console.log('\n👥 5. COLLABORATEURS EXISTANTS');

        const collaborateurs = await query(`
            SELECT id, nom, prenom, email
            FROM collaborateurs
            LIMIT 5
        `);

        console.log('Premiers collaborateurs:');
        collaborateurs.rows.forEach(collab => {
            console.log(`  - ${collab.prenom} ${collab.nom} (${collab.email}) - ID: ${collab.id}`);
        });

        // 6. Tester l'insertion avec différents collaborateur_id
        console.log('\n🧪 6. TEST D\'INSERTION');

        if (collaborateurs.rows.length > 0) {
            const testCollaborateurId = collaborateurs.rows[0].id;
            
            try {
                await query(`
                    INSERT INTO time_sheets (
                        collaborateur_id, semaine, annee, date_debut_semaine,
                        date_fin_semaine, statut, total_heures,
                        total_heures_chargeables, total_heures_non_chargeables
                    )
                    VALUES ($1, 1, 2025, '2025-01-06', '2025-01-12', 'draft', 0, 0, 0)
                    ON CONFLICT DO NOTHING
                `, [testCollaborateurId]);
                console.log('✅ Test d\'insertion réussi avec collaborateur_id valide');
                
                // Nettoyer
                await query(`
                    DELETE FROM time_sheets
                    WHERE collaborateur_id = $1
                    AND semaine = 1
                    AND annee = 2025
                `, [testCollaborateurId]);
            } catch (error) {
                console.log('❌ Test d\'insertion échoué:', error.message);
            }
        }

        console.log('\n✅ Diagnostic terminé');

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error.message);
    }
}

diagnoseTimeSheetsForeignKey(); 