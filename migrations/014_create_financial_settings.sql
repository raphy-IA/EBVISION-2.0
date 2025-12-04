-- Migration vers une structure clé-valeur pour financial_settings

DO $$ 
BEGIN 
    -- Vérifier si la table existe et a l'ancienne structure (colonne default_currency)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_settings' AND column_name = 'default_currency') THEN
        -- Sauvegarder les données existantes
        CREATE TEMP TABLE temp_settings AS SELECT * FROM financial_settings;
        
        -- Dropper la table
        DROP TABLE financial_settings;
        
        -- Recréer avec la nouvelle structure
        CREATE TABLE financial_settings (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT,
            description TEXT,
            type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by UUID REFERENCES users(id)
        );
        
        -- Restaurer les données
        INSERT INTO financial_settings (key, value, description, type)
        SELECT 'default_currency', default_currency, 'Devise par défaut de l''application', 'string' FROM temp_settings LIMIT 1;
        
        INSERT INTO financial_settings (key, value, description, type)
        SELECT 'active_currencies', active_currencies::text, 'Devises disponibles', 'json' FROM temp_settings LIMIT 1;
        
        DROP TABLE temp_settings;
    ELSE
        -- Créer la table si elle n'existe pas
        CREATE TABLE IF NOT EXISTS financial_settings (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT,
            description TEXT,
            type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by UUID REFERENCES users(id)
        );
    END IF;
END $$;

-- Insertion des valeurs par défaut (si elles n'existent pas déjà)
INSERT INTO financial_settings (key, value, description, type) VALUES
('default_tva', '19.25', 'Taux de TVA par défaut (%)', 'number'),
('invoice_prefix', 'FACT-', 'Préfixe des numéros de facture', 'string'),
('invoice_footer', 'Société Anonyme au capital de 10.000.000 FCFA - RC: XXXXX - NUI: XXXXX', 'Pied de page des factures (Mentions légales)', 'string'),
('default_payment_terms', '30', 'Délai de paiement par défaut (jours)', 'number'),
('invoice_notes_default', 'Merci de votre confiance.', 'Notes par défaut sur les factures', 'string'),
('default_currency', 'XAF', 'Devise par défaut de l''application', 'string'),
('active_currencies', '["XAF", "EUR", "USD"]', 'Devises disponibles', 'json')
ON CONFLICT (key) DO NOTHING;
