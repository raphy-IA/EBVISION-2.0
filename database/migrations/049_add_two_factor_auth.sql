-- Migration pour l'authentification à deux facteurs (2FA)
-- Date: 2025-01-02
-- Description: Ajout des colonnes nécessaires pour le 2FA

-- Ajouter les colonnes pour le 2FA
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_2fa_used TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT;

-- Ajouter des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled);
CREATE INDEX IF NOT EXISTS idx_users_last_2fa_used ON users(last_2fa_used);

-- Ajouter des commentaires
COMMENT ON COLUMN users.two_factor_secret IS 'Secret TOTP pour l''authentification à deux facteurs';
COMMENT ON COLUMN users.two_factor_enabled IS 'Indique si le 2FA est activé pour cet utilisateur';
COMMENT ON COLUMN users.last_2fa_used IS 'Dernière utilisation du 2FA';
COMMENT ON COLUMN users.backup_codes IS 'Codes de récupération hashés (JSON array)';

-- Créer une table pour l'audit des tentatives 2FA
CREATE TABLE IF NOT EXISTS two_factor_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    attempt_type VARCHAR(20) NOT NULL CHECK (attempt_type IN ('2FA', 'BACKUP')),
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour l'audit
CREATE INDEX IF NOT EXISTS idx_two_factor_attempts_user_id ON two_factor_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_attempts_created_at ON two_factor_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_two_factor_attempts_success ON two_factor_attempts(success);

COMMENT ON TABLE two_factor_attempts IS 'Audit des tentatives d''authentification à deux facteurs';
COMMENT ON COLUMN two_factor_attempts.attempt_type IS 'Type de tentative: 2FA ou BACKUP';
COMMENT ON COLUMN two_factor_attempts.success IS 'Indique si la tentative a réussi';





















