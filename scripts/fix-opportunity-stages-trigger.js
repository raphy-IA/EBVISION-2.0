const { pool } = require('../src/utils/database');

async function fixOpportunityStagesTrigger() {
    try {
        console.log('🔧 Correction de la fonction create_opportunity_stages...');
        
        // Supprimer l'ancienne fonction si elle existe
        await pool.query(`
            DROP FUNCTION IF EXISTS create_opportunity_stages(uuid);
        `);
        
        // Créer la nouvelle fonction avec gestion des cas sans templates
        await pool.query(`
            CREATE OR REPLACE FUNCTION create_opportunity_stages(opp_id UUID)
            RETURNS VOID AS $$
            DECLARE
                stage_record RECORD;
                stage_counter INTEGER := 0;
            BEGIN
                -- Supprimer les étapes existantes si elles existent
                DELETE FROM opportunity_stages WHERE opportunity_id = opp_id;
                
                -- Créer les étapes par défaut
                FOR stage_record IN 
                    SELECT 
                        ost.id as template_id,
                        ost.stage_name,
                        ost.stage_order,
                        ost.description,
                        ost.required_documents,
                        ost.required_actions,
                        ost.max_duration_days,
                        ost.min_duration_days,
                        ost.validation_required
                    FROM opportunity_stage_templates ost
                    INNER JOIN opportunities o ON o.opportunity_type_id = ost.opportunity_type_id
                    WHERE o.id = opp_id
                    ORDER BY ost.stage_order
                LOOP
                    stage_counter := stage_counter + 1;
                    
                    INSERT INTO opportunity_stages (
                        opportunity_id,
                        stage_template_id,
                        stage_name,
                        stage_order,
                        status,
                        start_date,
                        due_date,
                        notes,
                        documents,
                        actions
                    ) VALUES (
                        opp_id,
                        stage_record.template_id,
                        stage_record.stage_name,
                        stage_counter,
                        CASE 
                            WHEN stage_counter = 1 THEN 'IN_PROGRESS'
                            ELSE 'PENDING'
                        END,
                        CASE 
                            WHEN stage_counter = 1 THEN CURRENT_DATE
                            ELSE NULL
                        END,
                        CASE 
                            WHEN stage_record.max_duration_days IS NOT NULL 
                            THEN CURRENT_DATE + (stage_record.max_duration_days || ' days')::INTERVAL
                            ELSE NULL
                        END,
                        stage_record.description,
                        stage_record.required_documents,
                        stage_record.required_actions
                    );
                END LOOP;
                
                -- Si aucun template trouvé, créer des étapes par défaut sans stage_template_id
                IF stage_counter = 0 THEN
                    -- Créer un template temporaire pour éviter l'erreur NOT NULL
                    INSERT INTO opportunity_stage_templates (
                        opportunity_type_id, stage_name, stage_order, description
                    ) VALUES (
                        (SELECT opportunity_type_id FROM opportunities WHERE id = opp_id),
                        'PROSPECTION',
                        1,
                        'Étape de prospection par défaut'
                    ) ON CONFLICT DO NOTHING;
                    
                    -- Récupérer l'ID du template créé
                    INSERT INTO opportunity_stages (
                        opportunity_id,
                        stage_template_id,
                        stage_name,
                        stage_order,
                        status,
                        start_date
                    ) VALUES (
                        opp_id,
                        (SELECT id FROM opportunity_stage_templates 
                         WHERE opportunity_type_id = (SELECT opportunity_type_id FROM opportunities WHERE id = opp_id)
                         AND stage_name = 'PROSPECTION' LIMIT 1),
                        'PROSPECTION',
                        1,
                        'IN_PROGRESS',
                        CURRENT_DATE
                    );
                END IF;
            END;
            $$ LANGUAGE plpgsql;
        `);
        
        console.log('✅ Fonction create_opportunity_stages corrigée');
        
        // Vérifier que la fonction existe
        const functionCheck = await pool.query(`
            SELECT proname, prosrc 
            FROM pg_proc 
            WHERE proname = 'create_opportunity_stages';
        `);
        
        if (functionCheck.rows.length > 0) {
            console.log('✅ Fonction vérifiée et disponible');
        } else {
            console.log('❌ Fonction non trouvée après création');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
    } finally {
        await pool.end();
    }
}

fixOpportunityStagesTrigger(); 