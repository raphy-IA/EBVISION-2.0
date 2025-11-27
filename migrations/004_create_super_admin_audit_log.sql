-- Migration: Création de la table d'audit pour les actions SUPER_ADMIN
-- Description: Cette table enregistre toutes les actions sensibles effectuées par ou sur les SUPER_ADMIN
-- Date: 2025-10-02

-- Création de la table super_admin_audit_log
CREATE TABLE IF NOT EXISTS super_admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Index pour améliorer les performances des requêtes
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Création des index
CREATE INDEX IF NOT EXISTS idx_super_admin_audit_user_id ON super_admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_audit_action ON super_admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_super_admin_audit_timestamp ON super_admin_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_super_admin_audit_target_user ON super_admin_audit_log(target_user_id);

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE super_admin_audit_log IS 'Journal d''audit des actions sensibles liées aux SUPER_ADMIN';
COMMENT ON COLUMN super_admin_audit_log.user_id IS 'ID de l''utilisateur qui effectue l''action';
COMMENT ON COLUMN super_admin_audit_log.action IS 'Type d''action (ex: SUPER_ADMIN_ROLE_GRANTED, SUPER_ADMIN_USER_MODIFIED)';
COMMENT ON COLUMN super_admin_audit_log.target_user_id IS 'ID de l''utilisateur cible de l''action (si applicable)';
COMMENT ON COLUMN super_admin_audit_log.details IS 'Détails supplémentaires de l''action au format JSON';
COMMENT ON COLUMN super_admin_audit_log.ip_address IS 'Adresse IP de l''utilisateur';
COMMENT ON COLUMN super_admin_audit_log.user_agent IS 'User-Agent du navigateur';
COMMENT ON COLUMN super_admin_audit_log.timestamp IS 'Horodatage de l''action';

-- Types d'actions tracées:
-- - SUPER_ADMIN_ROLE_GRANTED: Rôle SUPER_ADMIN attribué
-- - SUPER_ADMIN_ROLE_REVOKED: Rôle SUPER_ADMIN révoqué
-- - SUPER_ADMIN_USER_CREATED: Utilisateur SUPER_ADMIN créé
-- - SUPER_ADMIN_USER_MODIFIED: Utilisateur SUPER_ADMIN modifié
-- - SUPER_ADMIN_USER_DELETED: Utilisateur SUPER_ADMIN supprimé
-- - SUPER_ADMIN_LOGIN: Connexion d'un SUPER_ADMIN
-- - SUPER_ADMIN_PASSWORD_CHANGED: Changement de mot de passe d'un SUPER_ADMIN
-- - SUPER_ADMIN_PERMISSION_MODIFIED: Modification de permissions sensibles
-- - SUPER_ADMIN_UNAUTHORIZED_ACCESS_ATTEMPT: Tentative d'accès non autorisé à des fonctions SUPER_ADMIN

COMMIT;
























