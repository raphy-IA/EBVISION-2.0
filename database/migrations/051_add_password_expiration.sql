-- Migration pour l'expiration des mots de passe
-- Date: 2025-01-02
-- Description: Ajout des colonnes pour la gestion de l'expiration des mots de passe

-- Ajouter les colonnes pour l'expiration des mots de passe
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expiry_days INTEGER DEFAULT 90;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- Mettre à jour les utilisateurs existants avec une date de changement par défaut
UPDATE users 
SET password_changed_at = created_at 
WHERE password_changed_at IS NULL;

-- Calculer les dates d'expiration pour les utilisateurs existants
UPDATE users 
SET password_expires_at = password_changed_at + INTERVAL '90 days'
WHERE password_expires_at IS NULL;

-- Index pour optimiser les requêtes d'expiration
CREATE INDEX IF NOT EXISTS idx_users_password_expires_at ON users(password_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_force_password_change ON users(force_password_change);
CREATE INDEX IF NOT EXISTS idx_users_password_changed_at ON users(password_changed_at);

-- Commentaires
COMMENT ON COLUMN users.password_changed_at IS 'Date de la dernière modification du mot de passe';
COMMENT ON COLUMN users.password_expires_at IS 'Date d\'expiration du mot de passe';
COMMENT ON COLUMN users.password_expiry_days IS 'Nombre de jours avant expiration du mot de passe';
COMMENT ON COLUMN users.force_password_change IS 'Force le changement de mot de passe à la prochaine connexion';

-- Fonction pour vérifier l'expiration des mots de passe
CREATE OR REPLACE FUNCTION check_password_expiry()
RETURNS TABLE(
    user_id UUID,
    email VARCHAR,
    days_until_expiry INTEGER,
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        EXTRACT(DAY FROM (u.password_expires_at - NOW()))::INTEGER as days_until_expiry,
        (u.password_expires_at < NOW()) as is_expired
    FROM users u
    WHERE u.password_expires_at IS NOT NULL
    AND u.active = true;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour forcer le changement de mot de passe pour les utilisateurs expirés
CREATE OR REPLACE FUNCTION force_password_change_expired()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE users 
    SET force_password_change = true
    WHERE password_expires_at < NOW()
    AND active = true
    AND force_password_change = false;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour notifier les utilisateurs dont le mot de passe expire bientôt
CREATE OR REPLACE FUNCTION get_users_password_expiring_soon(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE(
    user_id UUID,
    email VARCHAR,
    nom VARCHAR,
    prenom VARCHAR,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.nom,
        u.prenom,
        EXTRACT(DAY FROM (u.password_expires_at - NOW()))::INTEGER as days_until_expiry
    FROM users u
    WHERE u.password_expires_at IS NOT NULL
    AND u.password_expires_at BETWEEN NOW() AND NOW() + INTERVAL '1 day' * days_ahead
    AND u.active = true
    AND u.force_password_change = false
    ORDER BY u.password_expires_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Créer une vue pour les statistiques de mots de passe
CREATE OR REPLACE VIEW password_statistics AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN password_expires_at < NOW() THEN 1 END) as expired_passwords,
    COUNT(CASE WHEN password_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' THEN 1 END) as expiring_soon,
    COUNT(CASE WHEN force_password_change = true THEN 1 END) as forced_changes,
    AVG(EXTRACT(DAY FROM (password_expires_at - password_changed_at))) as avg_password_age_days
FROM users
WHERE active = true;

-- Commentaire sur la vue
COMMENT ON VIEW password_statistics IS 'Statistiques sur l\'état des mots de passe des utilisateurs';





















