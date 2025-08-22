// Script simple pour créer une validation avec un collaborateur existant
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function createSimpleValidation() {
    console.log('🧪 Création d\'une validation simple\n');
    
    try {
        // 1. Trouver un collaborateur avec un user_id
        console.log('1️⃣ Recherche d\'un collaborateur avec user_id...');
        const collab = await pool.query(`
            SELECT c.id, c.nom, c.prenom, c.user_id
            FROM collaborateurs c
            WHERE c.user_id IS NOT NULL
            LIMIT 1
        `);
        
        if (collab.rows.length === 0) {
            console.log('   ❌ Aucun collaborateur avec user_id trouvé');
            return;
        }
        
        const demandeur = collab.rows[0];
        console.log(`   ✅ Collaborateur trouvé: ${demandeur.prenom} ${demandeur.nom} (ID: ${demandeur.id})`);
        
        // 2. Trouver une campagne en brouillon
        console.log('\n2️⃣ Recherche d\'une campagne en brouillon...');
        const campaign = await pool.query(`
            SELECT id, name FROM prospecting_campaigns 
            WHERE validation_statut = 'BROUILLON' 
            LIMIT 1
        `);
        
        if (campaign.rows.length === 0) {
            console.log('   ❌ Aucune campagne en brouillon trouvée');
            return;
        }
        
        const camp = campaign.rows[0];
        console.log(`   ✅ Campagne trouvée: "${camp.name}" (ID: ${camp.id})`);
        
        // 3. Créer la validation
        console.log('\n3️⃣ Création de la validation...');
        const validationResult = await pool.query(`
            INSERT INTO prospecting_campaign_validations 
            (campaign_id, demandeur_id, niveau_validation, statut_validation, commentaire_demandeur, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [
            camp.id,
            demandeur.id,
            'BUSINESS_UNIT',
            'EN_ATTENTE',
            'Test de validation - Veuillez valider cette campagne de test',
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expire dans 7 jours
        ]);
        
        const validationId = validationResult.rows[0].id;
        console.log(`   ✅ Validation créée avec l'ID: ${validationId}`);
        
        // 4. Vérifier
        console.log('\n4️⃣ Vérification...');
        const newValidation = await pool.query(`
            SELECT pcv.*, pc.name as campaign_name
            FROM prospecting_campaign_validations pcv
            JOIN prospecting_campaigns pc ON pcv.campaign_id = pc.id
            WHERE pcv.id = $1
        `, [validationId]);
        
        if (newValidation.rows.length > 0) {
            const validation = newValidation.rows[0];
            console.log(`   ✅ Validation confirmée: "${validation.campaign_name}" - Statut: ${validation.statut_validation}`);
            console.log(`   📅 Expire le: ${validation.expires_at}`);
        }
        
        console.log('\n🎉 Validation de test créée avec succès !');
        console.log(`🔗 Vous pouvez maintenant tester la page: http://localhost:3000/prospecting-validations.html`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création:', error);
    } finally {
        await pool.end();
    }
}

createSimpleValidation();
