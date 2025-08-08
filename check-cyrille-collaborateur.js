const { pool } = require('./src/utils/database');

async function checkCyrilleCollaborateur() {
    try {
        console.log('🔍 Vérification du collaborateur Cyrille Djiki...');
        
        // 1. Vérifier si le collaborateur existe
        const collaborateurQuery = `
            SELECT c.*, bu.nom as business_unit_nom
            FROM collaborateurs c
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            WHERE c.nom = 'Djiki' AND c.prenom = 'Cyrille'
        `;
        
        const collaborateurResult = await pool.query(collaborateurQuery);
        console.log('📊 Collaborateurs trouvés:', collaborateurResult.rows.length);
        
        if (collaborateurResult.rows.length > 0) {
            const collaborateur = collaborateurResult.rows[0];
            console.log('✅ Collaborateur trouvé:', {
                id: collaborateur.id,
                nom: collaborateur.nom,
                prenom: collaborateur.prenom,
                business_unit_id: collaborateur.business_unit_id,
                business_unit_nom: collaborateur.business_unit_nom
            });
            
            // 2. Vérifier l'utilisateur Cyrille
            const userQuery = `
                SELECT * FROM users 
                WHERE nom = 'Djiki' AND prenom = 'Cyrille'
            `;
            
            const userResult = await pool.query(userQuery);
            console.log('📊 Utilisateurs trouvés:', userResult.rows.length);
            
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                console.log('✅ Utilisateur trouvé:', {
                    id: user.id,
                    nom: user.nom,
                    prenom: user.prenom,
                    collaborateur_id: user.collaborateur_id
                });
                
                // 3. Si l'utilisateur n'est pas lié au collaborateur, le lier
                if (!user.collaborateur_id) {
                    console.log('🔗 Liaison de l\'utilisateur au collaborateur...');
                    
                    const updateQuery = `
                        UPDATE users 
                        SET collaborateur_id = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    
                    await pool.query(updateQuery, [collaborateur.id, user.id]);
                    console.log('✅ Utilisateur lié au collaborateur avec succès');
                    
                    // Vérifier la mise à jour
                    const verifyQuery = `
                        SELECT * FROM users WHERE id = $1
                    `;
                    const verifyResult = await pool.query(verifyQuery, [user.id]);
                    console.log('✅ Vérification après mise à jour:', {
                        id: verifyResult.rows[0].id,
                        collaborateur_id: verifyResult.rows[0].collaborateur_id
                    });
                } else {
                    console.log('ℹ️ L\'utilisateur est déjà lié au collaborateur');
                }
            } else {
                console.log('❌ Utilisateur Cyrille Djiki non trouvé');
            }
        } else {
            console.log('❌ Collaborateur Cyrille Djiki non trouvé');
            
            // Créer le collaborateur s'il n'existe pas
            console.log('➕ Création du collaborateur Cyrille Djiki...');
            
            // D'abord, trouver la business unit "Administration"
            const buQuery = `
                SELECT id FROM business_units WHERE nom ILIKE '%administration%'
            `;
            const buResult = await pool.query(buQuery);
            
            if (buResult.rows.length > 0) {
                const businessUnitId = buResult.rows[0].id;
                console.log('✅ Business unit Administration trouvée:', businessUnitId);
                
                // Créer le collaborateur
                const createCollaborateurQuery = `
                    INSERT INTO collaborateurs (
                        nom, prenom, initiales, email, telephone, business_unit_id,
                        type_collaborateur_id, poste_actuel_id, grade_actuel_id, date_embauche, statut
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *
                `;
                
                const collaborateurData = [
                    'Djiki', 'Cyrille', 'CD', 'cdjiki@eb-partnersgroup.cm', '+237',
                    businessUnitId, 1, 1, 1, '2020-01-01', 'ACTIF'
                ];
                
                const newCollaborateurResult = await pool.query(createCollaborateurQuery, collaborateurData);
                const newCollaborateur = newCollaborateurResult.rows[0];
                console.log('✅ Collaborateur créé:', newCollaborateur.id);
                
                // Maintenant lier l'utilisateur
                const userQuery = `
                    SELECT * FROM users 
                    WHERE nom = 'Djiki' AND prenom = 'Cyrille'
                `;
                const userResult = await pool.query(userQuery);
                
                if (userResult.rows.length > 0) {
                    const user = userResult.rows[0];
                    const updateQuery = `
                        UPDATE users 
                        SET collaborateur_id = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    
                    await pool.query(updateQuery, [newCollaborateur.id, user.id]);
                    console.log('✅ Utilisateur lié au nouveau collaborateur');
                }
            } else {
                console.log('❌ Business unit Administration non trouvée');
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkCyrilleCollaborateur();
