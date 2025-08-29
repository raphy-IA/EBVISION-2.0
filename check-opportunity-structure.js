const { pool } = require('./src/utils/database');

async function checkOpportunityStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table opportunities...');
        
        // Vérifier la structure de la table opportunities
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'opportunities' 
            ORDER BY ordinal_position;
        `;
        
        const structureResult = await pool.query(structureQuery);
        console.log('\n📊 Structure de la table opportunities:');
        structureResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // Vérifier l'opportunité spécifique
        const opportunityId = '52889cb8-3a03-4cc4-a522-e203b8aee504';
        const opportunityQuery = `
            SELECT o.*, 
                   ot.name as opportunity_type_name,
                   ot.description as opportunity_type_description,
                   c.nom as client_name,
                   bu.nom as business_unit_name,
                   d.nom as division_name
            FROM opportunities o
            LEFT JOIN opportunity_types ot ON o.opportunity_type_id = ot.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN business_units bu ON o.business_unit_id = bu.id
            LEFT JOIN divisions d ON bu.division_id = d.id
            WHERE o.id = $1;
        `;
        
        const opportunityResult = await pool.query(opportunityQuery, [opportunityId]);
        console.log('\n📊 Opportunité spécifique:');
        if (opportunityResult.rows.length > 0) {
            const opp = opportunityResult.rows[0];
            console.log('   - ID:', opp.id);
            console.log('   - Nom:', opp.nom);
            console.log('   - Type d\'opportunité ID:', opp.opportunity_type_id);
            console.log('   - Type d\'opportunité nom:', opp.opportunity_type_name);
            console.log('   - Client ID:', opp.client_id);
            console.log('   - Client nom:', opp.client_name);
            console.log('   - Business Unit ID:', opp.business_unit_id);
            console.log('   - Business Unit nom:', opp.business_unit_name);
            console.log('   - Division nom:', opp.division_name);
            console.log('   - Statut:', opp.statut);
            console.log('   - Source:', opp.source);
            console.log('   - Créé le:', opp.created_at);
        } else {
            console.log('   - Opportunité non trouvée');
        }
        
        // Vérifier les types d'opportunité disponibles
        const typesQuery = `
            SELECT id, name, description, is_active
            FROM opportunity_types
            ORDER BY name;
        `;
        
        const typesResult = await pool.query(typesQuery);
        console.log('\n📊 Types d\'opportunité disponibles:');
        typesResult.rows.forEach(row => {
            console.log(`   - ${row.name} (${row.id}): ${row.description} - Actif: ${row.is_active}`);
        });
        
        // Vérifier les étapes de cette opportunité
        const stagesQuery = `
            SELECT os.*, ost.stage_name as template_stage_name
            FROM opportunity_stages os
            LEFT JOIN opportunity_stage_templates ost ON os.stage_template_id = ost.id
            WHERE os.opportunity_id = $1
            ORDER BY os.stage_order;
        `;
        
        const stagesResult = await pool.query(stagesQuery, [opportunityId]);
        console.log('\n📊 Étapes de l\'opportunité:');
        if (stagesResult.rows.length > 0) {
            stagesResult.rows.forEach(row => {
                console.log(`   - ${row.stage_name} (${row.status}): ${row.id}`);
                console.log(`     Template: ${row.template_stage_name || 'Aucun'}`);
            });
        } else {
            console.log('   - Aucune étape trouvée');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkOpportunityStructure();

