require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function testObjectiveCreation() {
    try {
        console.log('🚀 Démarrage du test de création d\'objectif...');

        // 1. Récupérer un type d'objectif valide
        const typeRes = await pool.query('SELECT id, code, label FROM objective_types LIMIT 1');
        if (typeRes.rows.length === 0) {
            console.error('❌ Aucun type d\'objectif trouvé dans la base !');
            return;
        }
        const type = typeRes.rows[0];
        console.log(`✅ Type d'objectif trouvé: ${type.label} (ID: ${type.id})`);

        // 2. Récupérer un collaborateur valide
        const collabRes = await pool.query('SELECT id, nom, prenom FROM collaborateurs LIMIT 1');
        if (collabRes.rows.length === 0) {
            console.error('❌ Aucun collaborateur trouvé !');
            return;
        }
        const collab = collabRes.rows[0];
        console.log(`✅ Collaborateur trouvé: ${collab.prenom} ${collab.nom} (ID: ${collab.id})`);

        // 3. Récupérer une année fiscale valide
        const fyRes = await pool.query('SELECT id FROM fiscal_years WHERE statut = \'EN_COURS\' LIMIT 1');
        const fyId = fyRes.rows.length > 0 ? fyRes.rows[0].id : null;
        console.log(`✅ Année fiscale: ${fyId}`);

        // 4. Tenter l'insertion directe via SQL (simulation du modèle)
        const insertSql = `
            INSERT INTO individual_objectives(
                collaborator_id, target_value, description, assigned_by, 
                fiscal_year_id, objective_type_id, title
            )
            VALUES($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const newObj = await pool.query(insertSql, [
            collab.id,
            100,
            'Test Objectif Backend Script',
            '00000000-0000-0000-0000-000000000000', // Fake UUID for assigned_by
            fyId,
            type.id,
            'Titre Test'
        ]);

        console.log('✅ Objectif inséré avec succès !');
        console.log('📝 Données insérées :', newObj.rows[0]);

        // 5. Vérification
        if (newObj.rows[0].objective_type_id === type.id) {
            console.log('🎉 SUCCÈS : objective_type_id a bien été enregistré !');
        } else {
            console.error(`❌ ÉCHEC : objective_type_id est ${newObj.rows[0].objective_type_id} (attendu: ${type.id})`);
        }

        // Nettoyage
        await pool.query('DELETE FROM individual_objectives WHERE id = $1', [newObj.rows[0].id]);
        console.log('🧹 Objectif de test supprimé.');

    } catch (error) {
        console.error('❌ Erreur critique :', error);
    } finally {
        await pool.end();
    }
}

testObjectiveCreation();
