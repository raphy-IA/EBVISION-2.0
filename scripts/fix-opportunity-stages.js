const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'trs_affichage',
    password: 'postgres',
    port: 5432,
});

async function fixOpportunityStages() {
    try {
        console.log('🔍 Diagnostic des tables des étapes d\'opportunité...\n');
        
        // 1. Vérifier si les tables existent
        console.log('1. Vérification de l\'existence des tables...');
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('opportunity_stages', 'stage_validations', 'stage_documents')
        `);
        
        console.log('Tables trouvées:', tablesResult.rows.map(r => r.table_name));
        
        // 2. Vérifier si la table opportunities existe
        const opportunitiesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'opportunities'
        `);
        
        if (opportunitiesResult.rows.length === 0) {
            console.log('❌ Table opportunities n\'existe pas !');
            return;
        }
        
        console.log('✅ Table opportunities existe');
        
        // 3. Créer les tables si elles n'existent pas
        if (tablesResult.rows.length < 3) {
            console.log('\n2. Création des tables manquantes...');
            
            const createTablesSQL = `
                -- Table des étapes d'opportunité
                CREATE TABLE IF NOT EXISTS opportunity_stages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
                    stage_name VARCHAR(50) NOT NULL CHECK (stage_name IN ('PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE', 'GAGNEE', 'PERDUE')),
                    stage_order INTEGER NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
                    start_date DATE,
                    completion_date DATE,
                    notes TEXT,
                    documents JSONB DEFAULT '[]',
                    validated_by UUID REFERENCES users(id),
                    validated_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Table des validations d'étapes
                CREATE TABLE IF NOT EXISTS stage_validations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    stage_id UUID NOT NULL REFERENCES opportunity_stages(id) ON DELETE CASCADE,
                    validator_id UUID NOT NULL REFERENCES users(id),
                    validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    validation_notes TEXT,
                    required_documents JSONB DEFAULT '[]',
                    provided_documents JSONB DEFAULT '[]',
                    decision VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'PENDING_CHANGES')),
                    next_stage VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Table des documents d'étapes
                CREATE TABLE IF NOT EXISTS stage_documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    stage_id UUID NOT NULL REFERENCES opportunity_stages(id) ON DELETE CASCADE,
                    document_name VARCHAR(255) NOT NULL,
                    document_type VARCHAR(50) NOT NULL,
                    file_path VARCHAR(500),
                    file_size INTEGER,
                    uploaded_by UUID NOT NULL REFERENCES users(id),
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    description TEXT,
                    is_required BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;
            
            await pool.query(createTablesSQL);
            console.log('✅ Tables créées');
            
            // Créer les index
            const createIndexesSQL = `
                CREATE INDEX IF NOT EXISTS idx_opportunity_stages_opportunity_id ON opportunity_stages(opportunity_id);
                CREATE INDEX IF NOT EXISTS idx_opportunity_stages_stage_name ON opportunity_stages(stage_name);
                CREATE INDEX IF NOT EXISTS idx_opportunity_stages_status ON opportunity_stages(status);
                CREATE INDEX IF NOT EXISTS idx_stage_validations_stage_id ON stage_validations(stage_id);
                CREATE INDEX IF NOT EXISTS idx_stage_documents_stage_id ON stage_documents(stage_id);
            `;
            
            await pool.query(createIndexesSQL);
            console.log('✅ Index créés');
            
            // Créer le trigger
            const createTriggerSQL = `
                CREATE OR REPLACE FUNCTION update_opportunity_stages_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';

                DROP TRIGGER IF EXISTS update_opportunity_stages_updated_at_trigger ON opportunity_stages;
                CREATE TRIGGER update_opportunity_stages_updated_at_trigger
                    BEFORE UPDATE ON opportunity_stages
                    FOR EACH ROW
                    EXECUTE FUNCTION update_opportunity_stages_updated_at();
            `;
            
            await pool.query(createTriggerSQL);
            console.log('✅ Trigger créé');
        }
        
        // 4. Vérifier les données d'opportunités
        console.log('\n3. Vérification des données d\'opportunités...');
        const opportunitiesData = await pool.query('SELECT COUNT(*) as count FROM opportunities');
        console.log(`Nombre d'opportunités: ${opportunitiesData.rows[0].count}`);
        
        if (opportunitiesData.rows[0].count > 0) {
            const sampleOpportunity = await pool.query('SELECT id, nom FROM opportunities LIMIT 1');
            console.log(`Exemple d'opportunité: ${sampleOpportunity.rows[0].nom} (${sampleOpportunity.rows[0].id})`);
            
            // 5. Créer des étapes par défaut pour cette opportunité
            console.log('\n4. Création d\'étapes par défaut...');
            const opportunityId = sampleOpportunity.rows[0].id;
            
            const stages = [
                { name: 'PROSPECTION', order: 1 },
                { name: 'QUALIFICATION', order: 2 },
                { name: 'PROPOSITION', order: 3 },
                { name: 'NEGOCIATION', order: 4 },
                { name: 'FERMETURE', order: 5 }
            ];
            
            for (const stage of stages) {
                await pool.query(`
                    INSERT INTO opportunity_stages (opportunity_id, stage_name, stage_order, status)
                    VALUES ($1, $2, $3, 'PENDING')
                    ON CONFLICT (opportunity_id, stage_name) DO NOTHING
                `, [opportunityId, stage.name, stage.order]);
            }
            
            console.log('✅ Étapes par défaut créées');
            
            // 6. Vérifier les étapes créées
            const stagesResult = await pool.query(`
                SELECT stage_name, status FROM opportunity_stages 
                WHERE opportunity_id = $1 
                ORDER BY stage_order
            `, [opportunityId]);
            
            console.log('\nÉtapes créées:');
            stagesResult.rows.forEach(stage => {
                console.log(`  - ${stage.stage_name}: ${stage.status}`);
            });
        }
        
        console.log('\n🎉 Diagnostic et correction terminés !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

fixOpportunityStages(); 