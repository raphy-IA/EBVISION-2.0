const { pool } = require('../src/utils/database');

async function cleanAndMigrate() {
    try {
        console.log('🧹 Nettoyage des migrations problématiques...');
        
        // Supprimer les migrations problématiques
        await pool.query('DELETE FROM migrations WHERE filename IN ($1, $2, $3)', [
            '021_create_opportunity_stages.sql',
            '022_fix_missing_columns.sql',
            '024_refactor_opportunity_stages_advanced.sql'
        ]);
        console.log('✅ Migrations problématiques supprimées');
        
        // Supprimer les anciennes tables si elles existent
        await pool.query('DROP TABLE IF EXISTS opportunity_stages CASCADE');
        console.log('✅ Ancienne table opportunity_stages supprimée');
        
        console.log('🔄 Exécution des nouvelles migrations...');
        
        // Exécuter la migration 024
        const migration024 = `
        -- Migration 024: Refactorisation complète du système d'étapes d'opportunités
        -- Date: 2025-07-21

        -- 1. Table des types d'opportunités
        CREATE TABLE IF NOT EXISTS opportunity_types (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            default_probability INTEGER DEFAULT 50,
            default_duration_days INTEGER DEFAULT 30,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Table des étapes par type d'opportunité (template)
        CREATE TABLE IF NOT EXISTS opportunity_stage_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            opportunity_type_id UUID NOT NULL REFERENCES opportunity_types(id) ON DELETE CASCADE,
            stage_name VARCHAR(100) NOT NULL,
            stage_order INTEGER NOT NULL,
            description TEXT,
            required_documents JSONB DEFAULT '[]',
            required_actions JSONB DEFAULT '[]',
            max_duration_days INTEGER DEFAULT 10,
            min_duration_days INTEGER DEFAULT 1,
            is_mandatory BOOLEAN DEFAULT TRUE,
            can_skip BOOLEAN DEFAULT FALSE,
            validation_required BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(opportunity_type_id, stage_order)
        );

        -- 3. Table des étapes d'opportunité (instances)
        CREATE TABLE IF NOT EXISTS opportunity_stages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
            stage_template_id UUID NOT NULL REFERENCES opportunity_stage_templates(id),
            stage_name VARCHAR(100) NOT NULL,
            stage_order INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED')),
            start_date TIMESTAMP,
            completed_date TIMESTAMP,
            due_date TIMESTAMP,
            notes TEXT,
            risk_level VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
            priority_level VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority_level IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
            documents JSONB DEFAULT '[]',
            actions JSONB DEFAULT '[]',
            validated_by UUID REFERENCES users(id),
            validated_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 4. Table des actions sur les étapes
        CREATE TABLE IF NOT EXISTS stage_actions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            stage_id UUID NOT NULL REFERENCES opportunity_stages(id) ON DELETE CASCADE,
            action_type VARCHAR(50) NOT NULL,
            action_title VARCHAR(200) NOT NULL,
            action_description TEXT,
            action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            performed_by UUID NOT NULL REFERENCES users(id),
            duration_minutes INTEGER,
            outcome VARCHAR(20) DEFAULT 'SUCCESS' CHECK (outcome IN ('SUCCESS', 'FAILURE', 'PENDING', 'CANCELLED')),
            notes TEXT,
            attachments JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 5. Table des documents d'étapes
        CREATE TABLE IF NOT EXISTS stage_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            stage_id UUID NOT NULL REFERENCES opportunity_stages(id) ON DELETE CASCADE,
            document_name VARCHAR(200) NOT NULL,
            document_type VARCHAR(50) NOT NULL,
            file_path VARCHAR(500),
            file_size INTEGER,
            is_required BOOLEAN DEFAULT FALSE,
            is_provided BOOLEAN DEFAULT FALSE,
            provided_date TIMESTAMP,
            provided_by UUID REFERENCES users(id),
            validation_status VARCHAR(20) DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'APPROVED', 'REJECTED')),
            validated_by UUID REFERENCES users(id),
            validated_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 6. Table des paramètres de risque
        CREATE TABLE IF NOT EXISTS risk_parameters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            parameter_name VARCHAR(100) NOT NULL UNIQUE,
            parameter_value INTEGER NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Index pour optimiser les performances
        CREATE INDEX IF NOT EXISTS idx_opportunity_stages_opportunity_id ON opportunity_stages(opportunity_id);
        CREATE INDEX IF NOT EXISTS idx_opportunity_stages_status ON opportunity_stages(status);
        CREATE INDEX IF NOT EXISTS idx_opportunity_stages_risk ON opportunity_stages(risk_level);
        CREATE INDEX IF NOT EXISTS idx_opportunity_stages_priority ON opportunity_stages(priority_level);
        CREATE INDEX IF NOT EXISTS idx_opportunity_stages_due_date ON opportunity_stages(due_date);
        CREATE INDEX IF NOT EXISTS idx_stage_actions_stage_id ON stage_actions(stage_id);
        CREATE INDEX IF NOT EXISTS idx_stage_documents_stage_id ON stage_documents(stage_id);
        CREATE INDEX IF NOT EXISTS idx_stage_templates_type_id ON opportunity_stage_templates(opportunity_type_id);

        -- Triggers pour mettre à jour updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_update_opportunity_types_updated_at
            BEFORE UPDATE ON opportunity_types
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER trigger_update_opportunity_stage_templates_updated_at
            BEFORE UPDATE ON opportunity_stage_templates
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER trigger_update_opportunity_stages_updated_at
            BEFORE UPDATE ON opportunity_stages
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Données de base
        INSERT INTO opportunity_types (name, description, default_probability, default_duration_days) VALUES
            ('Audit', 'Mission d''audit comptable et financier', 80, 45),
            ('Conseil', 'Mission de conseil en gestion', 70, 30),
            ('Formation', 'Formation professionnelle', 90, 15),
            ('Expertise', 'Expertise comptable et fiscale', 75, 25),
            ('Consulting', 'Consulting en organisation', 65, 40)
        ON CONFLICT (name) DO NOTHING;

        -- Paramètres de risque par défaut
        INSERT INTO risk_parameters (parameter_name, parameter_value, description) VALUES
            ('CRITICAL_RISK_DAYS', 3, 'Nombre de jours avant la date limite pour considérer un risque critique'),
            ('HIGH_RISK_DAYS', 7, 'Nombre de jours avant la date limite pour considérer un risque élevé'),
            ('MEDIUM_RISK_DAYS', 14, 'Nombre de jours avant la date limite pour considérer un risque moyen'),
            ('URGENT_PRIORITY_DAYS', 2, 'Nombre de jours avant la date limite pour considérer une priorité urgente'),
            ('HIGH_PRIORITY_DAYS', 5, 'Nombre de jours avant la date limite pour considérer une priorité élevée')
        ON CONFLICT (parameter_name) DO NOTHING;
        `;
        
        await pool.query(migration024);
        console.log('✅ Migration 024 exécutée');
        
        // Marquer la migration comme exécutée
        await pool.query(`
            INSERT INTO migrations (filename, executed_at) 
            VALUES ('024_refactor_opportunity_stages_advanced.sql', CURRENT_TIMESTAMP)
            ON CONFLICT (filename) DO NOTHING
        `);
        
        console.log('🎉 Nettoyage et migration terminés avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage et de la migration:', error);
    } finally {
        await pool.end();
    }
}

cleanAndMigrate(); 