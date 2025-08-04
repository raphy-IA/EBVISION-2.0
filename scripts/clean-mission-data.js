const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanMissionData() {
    const client = await pool.connect();
    try {
        console.log('🧹 Nettoyage des données de mission...\n');

        // 1. Vérifier les missions avec des opportunity_id invalides
        const invalidOpportunitiesQuery = `
            SELECT m.id, m.nom, m.opportunity_id
            FROM missions m
            LEFT JOIN opportunites o ON m.opportunity_id = o.id
            WHERE m.opportunity_id IS NOT NULL AND o.id IS NULL
        `;
        const invalidOpportunitiesResult = await client.query(invalidOpportunitiesQuery);
        
        console.log(`📊 Missions avec opportunity_id invalide: ${invalidOpportunitiesResult.rows.length}`);
        if (invalidOpportunitiesResult.rows.length > 0) {
            invalidOpportunitiesResult.rows.forEach((mission, index) => {
                console.log(`   ${index + 1}. ${mission.nom} (ID: ${mission.id}) - Opportunity ID: ${mission.opportunity_id}`);
            });
        }

        // 2. Mettre à jour les missions avec des opportunity_id invalides
        if (invalidOpportunitiesResult.rows.length > 0) {
            console.log('\n🔧 Mise à jour des missions avec opportunity_id invalide...');
            
            const updateQuery = `
                UPDATE missions 
                SET opportunity_id = NULL 
                WHERE opportunity_id IS NOT NULL 
                AND opportunity_id NOT IN (SELECT id FROM opportunites)
            `;
            
            const updateResult = await client.query(updateQuery);
            console.log(`   ✅ ${updateResult.rowCount} missions mises à jour`);
        }

        // 3. Vérifier les missions avec des associe_id invalides (référence users au lieu de collaborateurs)
        const invalidAssocieQuery = `
            SELECT m.id, m.nom, m.associe_id
            FROM missions m
            LEFT JOIN users u ON m.associe_id = u.id
            WHERE m.associe_id IS NOT NULL AND u.id IS NULL
        `;
        const invalidAssocieResult = await client.query(invalidAssocieQuery);
        
        console.log(`\n📊 Missions avec associe_id invalide: ${invalidAssocieResult.rows.length}`);
        if (invalidAssocieResult.rows.length > 0) {
            invalidAssocieResult.rows.forEach((mission, index) => {
                console.log(`   ${index + 1}. ${mission.nom} (ID: ${mission.id}) - Associe ID: ${mission.associe_id}`);
            });
        }

        // 4. Mettre à jour les missions avec des associe_id invalides
        if (invalidAssocieResult.rows.length > 0) {
            console.log('\n🔧 Mise à jour des missions avec associe_id invalide...');
            
            const updateAssocieQuery = `
                UPDATE missions 
                SET associe_id = NULL 
                WHERE associe_id IS NOT NULL 
                AND associe_id NOT IN (SELECT id FROM users)
            `;
            
            const updateAssocieResult = await client.query(updateAssocieQuery);
            console.log(`   ✅ ${updateAssocieResult.rowCount} missions mises à jour`);
        }

        console.log('\n✅ Nettoyage terminé !');

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

cleanMissionData(); 