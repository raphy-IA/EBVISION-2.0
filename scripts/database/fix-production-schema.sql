-- ════════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE CORRECTION DU SCHÉMA DE PRODUCTION
-- ════════════════════════════════════════════════════════════════════════════════
-- Date: 2025-12-06
-- Objectif: Synchroniser le schéma de production avec le schéma de développement
-- 
-- VÉRIFIER AVANT D'EXÉCUTER EN PRODUCTION!
-- ════════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────────
-- 1. Table: time_entries
-- ────────────────────────────────────────────────────────────────────────────────
-- Problème: colonne 'statut' manquante en production
-- Solution: Ajouter la colonne avec valeur par défaut 'saisie'

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'statut'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN statut character varying(20) NOT NULL DEFAULT 'saisie'::character varying;
        
        -- Ajouter la contrainte de vérification
        ALTER TABLE time_entries
        ADD CONSTRAINT time_entries_statut_check 
        CHECK (statut::text = ANY (ARRAY[
            'saisie'::character varying,
            'soumis'::character varying,
            'validé'::character varying,
            'rejeté'::character varying
        ]::text[]));
        
        RAISE NOTICE '✓ Colonne time_entries.statut ajoutée avec succès';
    ELSE
        RAISE NOTICE '→ Colonne time_entries.statut existe déjà';
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────────
-- 2. Table: time_sheet_approvals
-- ────────────────────────────────────────────────────────────────────────────────
-- Problème: colonnes manquantes (approver_id, statut, updated_at)
-- Solution: Ajouter ces colonnes

-- 2.1. Ajouter approver_id (alias de supervisor_id pour compatibilité)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sheet_approvals' 
        AND column_name = 'approver_id'
    ) THEN
        -- Utiliser supervisor_id comme source si elle existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'time_sheet_approvals' 
            AND column_name = 'supervisor_id'
        ) THEN
            ALTER TABLE time_sheet_approvals 
            ADD COLUMN approver_id uuid REFERENCES users(id);
            
            -- Copier les données de supervisor_id vers approver_id
            UPDATE time_sheet_approvals 
            SET approver_id = supervisor_id;
            
            RAISE NOTICE '✓ Colonne time_sheet_approvals.approver_id ajoutée et remplie';
        ELSE
            ALTER TABLE time_sheet_approvals 
            ADD COLUMN approver_id uuid REFERENCES users(id);
            
            RAISE NOTICE '✓ Colonne time_sheet_approvals.approver_id ajoutée';
        END IF;
    ELSE
        RAISE NOTICE '→ Colonne time_sheet_approvals.approver_id existe déjà';
    END IF;
END $$;

-- 2.2. Ajouter statut (basé sur 'action' si elle existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sheet_approvals' 
        AND column_name = 'statut'
    ) THEN
        ALTER TABLE time_sheet_approvals 
        ADD COLUMN statut character varying(50) DEFAULT 'en_attente'::character varying;
        
        -- Si la colonne 'action' existe, mapper les valeurs
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'time_sheet_approvals' 
            AND column_name = 'action'
        ) THEN
            UPDATE time_sheet_approvals 
            SET statut = CASE 
                WHEN action = 'approved' THEN 'approuvé'
                WHEN action = 'rejected' THEN 'rejeté'
                ELSE 'en_attente'
            END;
            
            RAISE NOTICE '✓ Colonne time_sheet_approvals.statut ajoutée et remplie depuis action';
        ELSE
            RAISE NOTICE '✓ Colonne time_sheet_approvals.statut ajoutée';
        END IF;
    ELSE
        RAISE NOTICE '→ Colonne time_sheet_approvals.statut existe déjà';
    END IF;
END $$;

-- 2.3. Ajouter updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sheet_approvals' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE time_sheet_approvals 
        ADD COLUMN updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;
        
        -- Initialiser avec created_at si elle existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'time_sheet_approvals' 
            AND column_name = 'created_at'
        ) THEN
            UPDATE time_sheet_approvals 
            SET updated_at = created_at;
            
            RAISE NOTICE '✓ Colonne time_sheet_approvals.updated_at ajoutée et initialisée';
        ELSE
            RAISE NOTICE '✓ Colonne time_sheet_approvals.updated_at ajoutée';
        END IF;
    ELSE
        RAISE NOTICE '→ Colonne time_sheet_approvals.updated_at existe déjà';
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────────
-- 3. Vérification finale
-- ────────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_time_entries_statut_exists boolean;
    v_approvals_approver_id_exists boolean;
    v_approvals_statut_exists boolean;
    v_approvals_updated_at_exists boolean;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'VÉRIFICATION FINALE';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    
    -- Vérifier time_entries.statut
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' AND column_name = 'statut'
    ) INTO v_time_entries_statut_exists;
    
    IF v_time_entries_statut_exists THEN
        RAISE NOTICE '✓ time_entries.statut: OK';
    ELSE
        RAISE NOTICE '✗ time_entries.statut: MANQUANT';
    END IF;
    
    -- Vérifier time_sheet_approvals.approver_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sheet_approvals' AND column_name = 'approver_id'
    ) INTO v_approvals_approver_id_exists;
    
    IF v_approvals_approver_id_exists THEN
        RAISE NOTICE '✓ time_sheet_approvals.approver_id: OK';
    ELSE
        RAISE NOTICE '✗ time_sheet_approvals.approver_id: MANQUANT';
    END IF;
    
    -- Vérifier time_sheet_approvals.statut
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sheet_approvals' AND column_name = 'statut'
    ) INTO v_approvals_statut_exists;
    
    IF v_approvals_statut_exists THEN
        RAISE NOTICE '✓ time_sheet_approvals.statut: OK';
    ELSE
        RAISE NOTICE '✗ time_sheet_approvals.statut: MANQUANT';
    END IF;
    
    -- Vérifier time_sheet_approvals.updated_at
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sheet_approvals' AND column_name = 'updated_at'
    ) INTO v_approvals_updated_at_exists;
    
    IF v_approvals_updated_at_exists THEN
        RAISE NOTICE '✓ time_sheet_approvals.updated_at: OK';
    ELSE
        RAISE NOTICE '✗ time_sheet_approvals.updated_at: MANQUANT';
    END IF;
    
    RAISE NOTICE '';
    
    -- Résumé
    IF v_time_entries_statut_exists 
       AND v_approvals_approver_id_exists 
       AND v_approvals_statut_exists 
       AND v_approvals_updated_at_exists THEN
        RAISE NOTICE '✅ TOUTES LES COLONNES SONT PRÉSENTES!';
    ELSE
        RAISE NOTICE '⚠️  CERTAINES COLONNES MANQUENT ENCORE';
    END IF;
    
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════════
-- FIN DU SCRIPT
-- ════════════════════════════════════════════════════════════════════════════════
