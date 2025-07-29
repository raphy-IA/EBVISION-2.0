const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données (même que server.js)
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'trs_affichage',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function createTables() {
    try {
        console.log('🔗 Connexion à la base de données...');
        
        // Créer les tables des étapes d'opportunité
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
        
        console.log('📄 Création des tables...');
        await pool.query(createTablesSQL);
        
        // Créer les index
        const createIndexesSQL = `
            CREATE INDEX IF NOT EXISTS idx_opportunity_stages_opportunity_id ON opportunity_stages(opportunity_id);
            CREATE INDEX IF NOT EXISTS idx_opportunity_stages_stage_name ON opportunity_stages(stage_name);
            CREATE INDEX IF NOT EXISTS idx_opportunity_stages_status ON opportunity_stages(status);
            CREATE INDEX IF NOT EXISTS idx_stage_validations_stage_id ON stage_validations(stage_id);
            CREATE INDEX IF NOT EXISTS idx_stage_documents_stage_id ON stage_documents(stage_id);
        `;
        
        console.log('📊 Création des index...');
        await pool.query(createIndexesSQL);
        
        // Créer le trigger pour updated_at
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
        
        console.log('⚡ Création du trigger...');
        await pool.query(createTriggerSQL);
        
        console.log('✅ Tables des étapes d\'opportunité créées avec succès !');
        
        // Vérifier que les tables existent
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('opportunity_stages', 'stage_validations', 'stage_documents')
        `);
        
        console.log('\n📋 Tables créées:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la création des tables:', error.message);
    } finally {
        await pool.end();
    }
}

createTables(); 