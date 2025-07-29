-- Migration 027: Création de la table notifications
-- Date: 2025-07-21

-- Créer la table notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES opportunity_stages(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_opportunity_id ON notifications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_stage_id ON notifications(stage_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Créer un index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Ajouter la migration à la table des migrations
INSERT INTO migrations (filename, executed_at) VALUES ('027_create_notifications_table.sql', CURRENT_TIMESTAMP) ON CONFLICT (filename) DO NOTHING; 