-- Migration: Ajouter les établissements financiers du Cameroun
-- Description: Insère ou met à jour les 7 principales banques du Cameroun

DO $$
DECLARE
    institution RECORD;
BEGIN
    -- Liste des banques à insérer
    FOR institution IN 
        SELECT * FROM (VALUES 
            ('AFB', 'Afriland First Bank', 'BANK', 'CMR', 'AFRICMCA'),
            ('SGC', 'Société Générale Cameroun', 'BANK', 'CMR', 'SOGECMCA'),
            ('BICEC', 'Banque Internationale du Cameroun pour l''Epargne et le Crédit', 'BANK', 'CMR', 'BICECCMA'),
            ('UBA', 'United Bank for Africa', 'BANK', 'CMR', 'UBACCMXXX'),
            ('ECO', 'Ecobank Cameroun', 'BANK', 'CMR', 'ECOBCMCA'),
            ('BGFI', 'BGFI Bank', 'BANK', 'CMR', 'BGFICMCA'),
            ('SCB', 'SCB Cameroun', 'BANK', 'CMR', 'SCBCMCA')
        ) AS t(code, name, type, country, swift_code)
    LOOP
        -- Vérifier si le code existe déjà
        IF EXISTS (SELECT 1 FROM financial_institutions WHERE code = institution.code) THEN
            -- Mettre à jour si nécessaire
            UPDATE financial_institutions 
            SET name = institution.name,
                type = institution.type,
                country = institution.country,
                swift_code = institution.swift_code,
                updated_at = NOW()
            WHERE code = institution.code;
        ELSE
            -- Insérer si n'existe pas
            INSERT INTO financial_institutions (code, name, type, country, swift_code, is_active)
            VALUES (institution.code, institution.name, institution.type, institution.country, institution.swift_code, true);
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Établissements financiers mis à jour succès';
END $$;
