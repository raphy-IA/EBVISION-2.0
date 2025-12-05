-- Migration: Ajouter des établissements financiers par défaut
-- Description: Insère les principales banques et institutions de mobile money du Cameroun

-- Vérifier si des établissements existent déjà
DO $$
BEGIN
    -- Insérer uniquement si la table est vide
    IF NOT EXISTS (SELECT 1 FROM financial_institutions LIMIT 1) THEN
        
        -- Banques principales du Cameroun
        INSERT INTO financial_institutions (code, name, type, country, created_at, updated_at) VALUES
        ('SGBC', 'Société Générale Cameroun', 'BANK', 'Cameroun', NOW(), NOW()),
        ('BICEC', 'Banque Internationale du Cameroun pour l''Épargne et le Crédit', 'BANK', 'Cameroun', NOW(), NOW()),
        ('AFRILAND', 'Afriland First Bank', 'BANK', 'Cameroun', NOW(), NOW()),
        ('ECOBANK', 'Ecobank Cameroun', 'BANK', 'Cameroun', NOW(), NOW()),
        ('UBA', 'United Bank for Africa Cameroun', 'BANK', 'Cameroun', NOW(), NOW()),
        ('SCB', 'Standard Chartered Bank Cameroun', 'BANK', 'Cameroun', NOW(), NOW()),
        ('CBC', 'Commercial Bank of Cameroon', 'BANK', 'Cameroun', NOW(), NOW()),
        ('BGFI', 'BGFI Bank Cameroun', 'BANK', 'Cameroun', NOW(), NOW()),
        ('UBC', 'Union Bank of Cameroon', 'BANK', 'Cameroun', NOW(), NOW()),
        ('CCA', 'Crédit Communautaire d''Afrique', 'BANK', 'Cameroun', NOW(), NOW()),
        
        -- Mobile Money
        ('MTN-MM', 'MTN Mobile Money', 'MOBILE_MONEY', 'Cameroun', NOW(), NOW()),
        ('OM', 'Orange Money', 'MOBILE_MONEY', 'Cameroun', NOW(), NOW()),
        ('EU-MM', 'Express Union Mobile Money', 'MOBILE_MONEY', 'Cameroun', NOW(), NOW()),
        ('YUP', 'YUP (Nexttel)', 'MOBILE_MONEY', 'Cameroun', NOW(), NOW()),
        
        -- Microfinance
        ('CEC', 'Caisse d''Épargne du Cameroun', 'OTHER', 'Cameroun', NOW(), NOW()),
        ('MC2', 'Mutuelles Communautaires de Croissance', 'OTHER', 'Cameroun', NOW(), NOW());
        
        RAISE NOTICE 'Établissements financiers par défaut insérés avec succès';
    ELSE
        RAISE NOTICE 'Des établissements financiers existent déjà, insertion ignorée';
    END IF;
END $$;
