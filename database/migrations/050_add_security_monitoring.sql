-- Migration pour le monitoring de sécurité
-- Date: 2025-01-02
-- Description: Ajout des tables pour le monitoring et l'audit de sécurité

-- Table des logs de sécurité
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    reason TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des alertes de sécurité
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    details JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des IPs bloquées
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter les colonnes de blocage aux utilisateurs
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_email ON security_logs(email);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_success ON security_logs(success);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_security_alerts_alert_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires_at ON blocked_ips(expires_at);

CREATE INDEX IF NOT EXISTS idx_users_blocked_until ON users(blocked_until);

-- Commentaires
COMMENT ON TABLE security_logs IS 'Logs de sécurité pour audit et monitoring';
COMMENT ON TABLE security_alerts IS 'Alertes de sécurité générées automatiquement';
COMMENT ON TABLE blocked_ips IS 'IPs temporairement bloquées pour sécurité';

COMMENT ON COLUMN security_logs.action IS 'Type d\'action: LOGIN_ATTEMPT, PASSWORD_CHANGE, etc.';
COMMENT ON COLUMN security_logs.success IS 'Indique si l\'action a réussi';
COMMENT ON COLUMN security_logs.details IS 'Détails supplémentaires en JSON';

COMMENT ON COLUMN security_alerts.alert_type IS 'Type d\'alerte: MULTIPLE_FAILED_LOGINS, etc.';
COMMENT ON COLUMN security_alerts.severity IS 'Niveau de sévérité de l\'alerte';
COMMENT ON COLUMN security_alerts.details IS 'Détails de l\'alerte en JSON';

COMMENT ON COLUMN blocked_ips.reason IS 'Raison du blocage de l\'IP';
COMMENT ON COLUMN blocked_ips.expires_at IS 'Date d\'expiration du blocage';

COMMENT ON COLUMN users.blocked_until IS 'Date jusqu\'à laquelle l\'utilisateur est bloqué';
COMMENT ON COLUMN users.block_reason IS 'Raison du blocage de l\'utilisateur';

-- Fonction pour nettoyer les logs anciens (plus de 90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM security_logs WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM blocked_ips WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les alertes résolues anciennes (plus de 30 jours)
CREATE OR REPLACE FUNCTION cleanup_old_security_alerts()
RETURNS void AS $$
BEGIN
    DELETE FROM security_alerts 
    WHERE resolved = true 
    AND resolved_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Créer un job de nettoyage (nécessite pg_cron)
-- SELECT cron.schedule('cleanup-security-logs', '0 2 * * *', 'SELECT cleanup_old_security_logs();');
-- SELECT cron.schedule('cleanup-security-alerts', '0 3 * * *', 'SELECT cleanup_old_security_alerts();');





















