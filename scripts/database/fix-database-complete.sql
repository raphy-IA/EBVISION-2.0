-- ============================================================
-- SCRIPT SQL COMPLET : CORRECTION DE LA BASE DE DONNÉES
-- ============================================================
-- 
-- ⚠️  SÉCURITÉ : Ce script est SÛR et ne modifie JAMAIS les données existantes
-- 
-- ✅ Ce script AJOUTE uniquement :
--    - Des colonnes manquantes (avec IF NOT EXISTS)
--    - Des tables optionnelles manquantes (avec IF NOT EXISTS)
--    - Change le propriétaire des tables (pour les permissions)
-- 
-- ❌ Ce script NE FAIT JAMAIS :
--    - Supprimer des données
--    - Modifier des données existantes
--    - Supprimer des colonnes ou tables
--    - Écraser des données
--
-- Ce script doit être exécuté en tant que superuser (postgres)
--
-- Usage: sudo -u postgres psql -d ewm_db -f scripts/database/fix-database-complete.sql
-- ============================================================

-- ============================================================
-- ÉTAPE 1 : CHANGER LE PROPRIÉTAIRE DES TABLES
-- ============================================================

ALTER TABLE users OWNER TO ewm_user;
ALTER TABLE roles OWNER TO ewm_user;
ALTER TABLE permissions OWNER TO ewm_user;
ALTER TABLE user_roles OWNER TO ewm_user;
ALTER TABLE role_permissions OWNER TO ewm_user;
ALTER TABLE business_units OWNER TO ewm_user;
ALTER TABLE divisions OWNER TO ewm_user;
ALTER TABLE grades OWNER TO ewm_user;
ALTER TABLE postes OWNER TO ewm_user;
ALTER TABLE collaborateurs OWNER TO ewm_user;
ALTER TABLE clients OWNER TO ewm_user;
ALTER TABLE missions OWNER TO ewm_user;
ALTER TABLE opportunities OWNER TO ewm_user;
ALTER TABLE time_entries OWNER TO ewm_user;
ALTER TABLE invoices OWNER TO ewm_user;

-- Tables optionnelles
ALTER TABLE IF EXISTS notifications OWNER TO ewm_user;
ALTER TABLE IF EXISTS pages OWNER TO ewm_user;
ALTER TABLE IF EXISTS menu_sections OWNER TO ewm_user;
ALTER TABLE IF EXISTS menu_items OWNER TO ewm_user;

-- ============================================================
-- ÉTAPE 2 : AJOUTER LES COLONNES MANQUANTES DANS "users"
-- ============================================================

-- photo_url
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'photo_url') THEN
        ALTER TABLE users ADD COLUMN photo_url TEXT;
        RAISE NOTICE '✅ Colonne photo_url ajoutée à users';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne photo_url existe déjà';
    END IF;
END $$;

-- two_factor_enabled
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne two_factor_enabled ajoutée à users';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne two_factor_enabled existe déjà';
    END IF;
END $$;

-- two_factor_secret
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
        ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
        RAISE NOTICE '✅ Colonne two_factor_secret ajoutée à users';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne two_factor_secret existe déjà';
    END IF;
END $$;

-- backup_codes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'backup_codes') THEN
        ALTER TABLE users ADD COLUMN backup_codes TEXT[];
        RAISE NOTICE '✅ Colonne backup_codes ajoutée à users';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne backup_codes existe déjà';
    END IF;
END $$;

-- last_login
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Colonne last_login ajoutée à users';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne last_login existe déjà';
    END IF;
END $$;

-- last_logout
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'last_logout') THEN
        ALTER TABLE users ADD COLUMN last_logout TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Colonne last_logout ajoutée à users';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne last_logout existe déjà';
    END IF;
END $$;

-- ============================================================
-- ÉTAPE 3 : CRÉER/MODIFIER LA TABLE "notifications"
-- ============================================================

-- Créer la table si elle n'existe pas
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

ALTER TABLE notifications OWNER TO ewm_user;

-- Ajouter campaign_id si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'notifications' AND column_name = 'campaign_id') THEN
        ALTER TABLE notifications ADD COLUMN campaign_id UUID;
        RAISE NOTICE '✅ Colonne campaign_id ajoutée à notifications';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne campaign_id existe déjà';
    END IF;
END $$;

-- Ajouter read si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'notifications' AND column_name = 'read') THEN
        ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne read ajoutée à notifications';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne read existe déjà';
    END IF;
END $$;

-- ============================================================
-- ÉTAPE 4 : CRÉER/MODIFIER LA TABLE "pages"
-- ============================================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pages OWNER TO ewm_user;

-- Ajouter url si manquante (cas où la table existe sans cette colonne)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'pages' AND column_name = 'url') THEN
        ALTER TABLE pages ADD COLUMN url VARCHAR(500);
        -- Créer l'index unique si nécessaire
        CREATE UNIQUE INDEX IF NOT EXISTS pages_url_key ON pages(url);
        RAISE NOTICE '✅ Colonne url ajoutée à pages';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne url existe déjà';
    END IF;
END $$;

-- ============================================================
-- ÉTAPE 5 : CRÉER/MODIFIER LA TABLE "menu_sections"
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE menu_sections OWNER TO ewm_user;

-- ============================================================
-- ÉTAPE 6 : CRÉER/MODIFIER LA TABLE "menu_items"
-- ============================================================

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

ALTER TABLE menu_items OWNER TO ewm_user;

-- Ajouter label si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'menu_items' AND column_name = 'label') THEN
        ALTER TABLE menu_items ADD COLUMN label VARCHAR(255) NOT NULL DEFAULT '';
        RAISE NOTICE '✅ Colonne label ajoutée à menu_items';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne label existe déjà';
    END IF;
END $$;

-- Ajouter url si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'menu_items' AND column_name = 'url') THEN
        ALTER TABLE menu_items ADD COLUMN url VARCHAR(500) NOT NULL DEFAULT '';
        RAISE NOTICE '✅ Colonne url ajoutée à menu_items';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne url existe déjà';
    END IF;
END $$;

-- ============================================================
-- ÉTAPE 7 : ACCORDER TOUS LES DROITS
-- ============================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ewm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ewm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ewm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ewm_user;

-- ============================================================
-- ÉTAPE 8 : VÉRIFICATION FINALE
-- ============================================================

SELECT 
    '✅ CORRECTION TERMINÉE' as status,
    COUNT(DISTINCT table_name) as tables_checked
FROM information_schema.columns 
WHERE table_name IN ('users', 'notifications', 'pages', 'menu_sections', 'menu_items')
AND column_name IN (
    'photo_url', 'two_factor_enabled', 'two_factor_secret', 'backup_codes', 'last_login', 'last_logout',
    'campaign_id', 'read',
    'url',
    'label'
);

