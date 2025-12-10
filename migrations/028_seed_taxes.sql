-- Migration: Ajouter les taxes usuelles du Cameroun
-- Description: Insère les taxes communes (TVA, AIR, etc.)

DO $$
DECLARE
    tax_record RECORD;
BEGIN
    -- Liste des taxes à insérer
    FOR tax_record IN 
        SELECT * FROM (VALUES 
            ('TVA', 19.25, 'ADDED', 'Taxe sur la Valeur Ajoutée', true),
            ('AIR (2.2%)', 2.20, 'DEDUCTED', 'Acompte Impôt sur le Revenu (Régime Réel)', true),
            ('AIR (5.5%)', 5.50, 'DEDUCTED', 'Acompte Impôt sur le Revenu (Régime Simplifié)', true),
            ('AIR (10%)', 10.00, 'DEDUCTED', 'Acompte Impôt sur le Revenu (Non-Résidents/Non-Immatriculés)', true),
            ('TS (2.2%)', 2.20, 'DEDUCTED', 'Taxe Spéciale', false)
        ) AS t(name, rate, type, description, is_active)
    LOOP
        -- Vérifier si la taxe existe déjà par nom
        IF EXISTS (SELECT 1 FROM taxes WHERE name = tax_record.name) THEN
            -- Mettre à jour si nécessaire
            UPDATE taxes 
            SET rate = tax_record.rate,
                type = tax_record.type,
                description = tax_record.description,
                is_active = tax_record.is_active,
                updated_at = NOW()
            WHERE name = tax_record.name;
        ELSE
            -- Insérer si n'existe pas
            INSERT INTO taxes (name, rate, type, description, is_active)
            VALUES (tax_record.name, tax_record.rate, tax_record.type, tax_record.description, tax_record.is_active);
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Taxes usuelles insérées/mises à jour avec succès';
END $$;
