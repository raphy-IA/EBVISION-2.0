-- Migration 004: Ajouter la colonne sigle à la table companies
-- Date: 2025-08-25

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
    ) THEN
        -- Ajouter la colonne sigle à la table companies
        ALTER TABLE public.companies
        ADD COLUMN IF NOT EXISTS sigle VARCHAR(50);

        -- Créer un index pour améliorer les performances de recherche sur le sigle
        CREATE INDEX IF NOT EXISTS idx_companies_sigle
        ON public.companies (sigle)
        WHERE sigle IS NOT NULL;

        -- Ajouter un commentaire pour documenter la colonne
        COMMENT ON COLUMN public.companies.sigle IS 'Sigle ou acronyme de l''entreprise (ex: EDF, SNCF, etc.)';
    ELSE
        RAISE NOTICE 'Migration 004_add_sigle_column_companies ignorée : table "companies" absente.';
    END IF;
END$$;
