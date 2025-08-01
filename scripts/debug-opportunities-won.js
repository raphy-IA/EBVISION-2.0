const axios = require('axios');
require('dotenv').config();

async function testOpportunitiesWon() {
    try {
        console.log('🔍 Test de l\'API /api/opportunities/won-for-mission');
        
        // Test 1: Vérifier si le serveur répond
        console.log('\n1. Test de connexion au serveur...');
        const healthResponse = await axios.get('http://localhost:3000/api/health');
        console.log('✅ Serveur accessible:', healthResponse.status);
        
        // Test 2: Vérifier la structure de la base de données
        console.log('\n2. Vérification de la structure de la base de données...');
        const { Pool } = require('pg');
        
        // Utiliser les variables d'environnement correctes
        const pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'eb_vision_2_0',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'your_password'
        });
        
        // Vérifier les tables
        const tables = ['opportunities', 'missions', 'opportunity_types', 'clients', 'collaborateurs', 'business_units'];
        
        for (const table of tables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`✅ Table ${table}: ${result.rows[0].count} enregistrements`);
            } catch (error) {
                console.log(`❌ Table ${table}: ${error.message}`);
            }
        }
        
        // Test 3: Vérifier les opportunités gagnées
        console.log('\n3. Vérification des opportunités gagnées...');
        const wonOpportunities = await pool.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN statut = 'GAGNEE' THEN 1 END) as gagnees,
                   COUNT(CASE WHEN statut = 'WON' THEN 1 END) as won
            FROM opportunities
        `);
        console.log('📊 Opportunités:', wonOpportunities.rows[0]);
        
        // Test 4: Vérifier les missions existantes
        console.log('\n4. Vérification des missions...');
        const missions = await pool.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN opportunity_id IS NOT NULL THEN 1 END) as avec_opportunite
            FROM missions
        `);
        console.log('📊 Missions:', missions.rows[0]);
        
        // Test 5: Test de la requête complète
        console.log('\n5. Test de la requête complète...');
        const testQuery = `
            SELECT 
                o.*,
                c.nom as client_nom,
                c.email as client_email,
                col.nom as collaborateur_nom,
                col.prenom as collaborateur_prenom,
                bu.nom as business_unit_nom,
                bu.code as business_unit_code,
                ot.name as opportunity_type_nom,
                ot.description as opportunity_type_description
            FROM opportunities o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN collaborateurs col ON o.collaborateur_id = col.id
            LEFT JOIN business_units bu ON o.business_unit_id = bu.id
            LEFT JOIN opportunity_types ot ON o.opportunity_type_id = ot.id
            WHERE o.statut IN ('GAGNEE', 'WON')
            AND NOT EXISTS (
                SELECT 1 FROM missions m WHERE m.opportunity_id = o.id
            )
            ORDER BY o.created_at DESC
            LIMIT 5
        `;
        
        try {
            const result = await pool.query(testQuery);
            console.log('✅ Requête SQL réussie:', result.rows.length, 'opportunités trouvées');
            
            if (result.rows.length > 0) {
                console.log('📋 Première opportunité:', {
                    id: result.rows[0].id,
                    nom: result.rows[0].nom,
                    statut: result.rows[0].statut,
                    client_nom: result.rows[0].client_nom,
                    business_unit_nom: result.rows[0].business_unit_nom,
                    opportunity_type_nom: result.rows[0].opportunity_type_nom
                });
            }
        } catch (error) {
            console.log('❌ Erreur SQL:', error.message);
            
            // Test alternatif sans opportunity_types
            console.log('\n6. Test sans la table opportunity_types...');
            const simpleQuery = `
                SELECT 
                    o.*,
                    c.nom as client_nom,
                    c.email as client_email,
                    col.nom as collaborateur_nom,
                    col.prenom as collaborateur_prenom,
                    bu.nom as business_unit_nom,
                    bu.code as business_unit_code
                FROM opportunities o
                LEFT JOIN clients c ON o.client_id = c.id
                LEFT JOIN collaborateurs col ON o.collaborateur_id = col.id
                LEFT JOIN business_units bu ON o.business_unit_id = bu.id
                WHERE o.statut IN ('GAGNEE', 'WON')
                AND NOT EXISTS (
                    SELECT 1 FROM missions m WHERE m.opportunity_id = o.id
                )
                ORDER BY o.created_at DESC
                LIMIT 5
            `;
            
            try {
                const simpleResult = await pool.query(simpleQuery);
                console.log('✅ Requête simple réussie:', simpleResult.rows.length, 'opportunités trouvées');
            } catch (simpleError) {
                console.log('❌ Erreur requête simple:', simpleError.message);
            }
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
    }
}

testOpportunitiesWon().catch(console.error); 