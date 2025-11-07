-- ============================================================
-- SCRIPT SQL : CORRECTION MANUELLE DES COLONNES MANQUANTES
-- ============================================================
-- 
-- Ce script contient les commandes SQL pour ajouter manuellement
-- les colonnes manquantes identifiées par verify-and-fix-database.js
--
-- Usage: psql -U ewm_user -d ewm_db -f scripts/database/fix-database-manual.sql
-- OU exécutez ces commandes en tant que postgres/superuser
-- ============================================================

-- ============================================================
-- TABLE: users
-- ============================================================

-- Ajouter photo_url si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'photo_url') THEN
        ALTER TABLE users ADD COLUMN photo_url TEXT;
        RAISE NOTICE 'Colonne photo_url ajoutée à users';
    ELSE
        RAISE NOTICE 'Colonne photo_url existe déjà';
    END IF;
END $$;

-- Ajouter two_factor_enabled si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Colonne two_factor_enabled ajoutée à users';
    ELSE
        RAISE NOTICE 'Colonne two_factor_enabled existe déjà';
    END IF;
END $$;

-- Ajouter two_factor_secret si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
        ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
        RAISE NOTICE 'Colonne two_factor_secret ajoutée à users';
    ELSE
        RAISE NOTICE 'Colonne two_factor_secret existe déjà';
    END IF;
END $$;

-- Ajouter backup_codes si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'backup_codes') THEN
        ALTER TABLE users ADD COLUMN backup_codes TEXT[];
        RAISE NOTICE 'Colonne backup_codes ajoutée à users';
    ELSE
        RAISE NOTICE 'Colonne backup_codes existe déjà';
    END IF;
END $$;

-- Ajouter last_login si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Colonne last_login ajoutée à users';
    ELSE
        RAISE NOTICE 'Colonne last_login existe déjà';
    END IF;
END $$;

-- Ajouter last_logout si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'last_logout') THEN
        ALTER TABLE users ADD COLUMN last_logout TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Colonne last_logout ajoutée à users';
    ELSE
        RAISE NOTICE 'Colonne last_logout existe déjà';
    END IF;
END $$;

-- ============================================================
-- TABLE: notifications
-- ============================================================

-- Créer la table notifications si elle n'existe pas
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id UUID,
    stage_id UUID,
    campaign_id UUID,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter campaign_id si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'notifications' AND column_name = 'campaign_id') THEN
        ALTER TABLE notifications ADD COLUMN campaign_id UUID;
        RAISE NOTICE 'Colonne campaign_id ajoutée à notifications';
    ELSE
        RAISE NOTICE 'Colonne campaign_id existe déjà';
    END IF;
END $$;

-- ============================================================
-- TABLES OPTIONNELLES: pages, menu_sections, menu_items
-- ============================================================

-- Créer la table pages si elle n'existe pas
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table menu_sections si elle n'existe pas
CREATE TABLE IF NOT EXISTS menu_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table menu_items si elle n'existe pas
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    section_id UUID REFERENCES menu_sections(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vérification finale
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'notifications', 'pages', 'menu_sections', 'menu_items')
ORDER BY table_name, ordinal_position;



