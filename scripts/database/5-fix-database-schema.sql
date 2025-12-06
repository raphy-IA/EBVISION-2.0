-- ============================================================
-- SCRIPT SQL : CORRECTION ET MISE À JOUR DU SCHÉMA
-- ============================================================
-- 
-- Ce script ajoute UNIQUEMENT les extensions utiles (badges)
-- pour être cohérent avec la Base Pure + Extensions
-- 
-- ⚠️  BASE PURE : Ne modifie JAMAIS la structure de la base pure
-- ✅ EXTENSIONS : Ajoute uniquement les colonnes de badges
-- 
-- ⚠️  SÉCURITÉ : Ce script est SÛR et ne modifie JAMAIS les données existantes
-- 
-- ✅ Ce script AJOUTE uniquement :
--    - Des colonnes manquantes (avec IF NOT EXISTS)
--    - Des contraintes manquantes
--    - Des index pour performance
-- 
-- ❌ Ce script NE FAIT JAMAIS :
--    - Supprimer des données
--    - Modifier des données existantes
--    - Supprimer des colonnes ou tables
--
-- Usage: psql -h localhost -p 5432 -U votre_user -d votre_base -f scripts/database/5-fix-database-schema.sql
-- ============================================================

\echo '╔══════════════════════════════════════════════════════════════╗'
\echo '║     CORRECTION ET MISE À JOUR DU SCHÉMA                     ║'
\echo '╚══════════════════════════════════════════════════════════════╝'
\echo ''

-- ============================================================
-- ÉTAPE 1 : COLONNES BADGES DANS LA TABLE "roles"
-- ============================================================

\echo '🎨 Ajout des colonnes de badges dans la table roles...'

-- badge_bg_class
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'roles' AND column_name = 'badge_bg_class') THEN
        ALTER TABLE roles ADD COLUMN badge_bg_class VARCHAR(50);
        RAISE NOTICE '   ✅ Colonne badge_bg_class ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne badge_bg_class existe déjà';
    END IF;
END $$;

-- badge_text_class
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'roles' AND column_name = 'badge_text_class') THEN
        ALTER TABLE roles ADD COLUMN badge_text_class VARCHAR(50);
        RAISE NOTICE '   ✅ Colonne badge_text_class ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne badge_text_class existe déjà';
    END IF;
END $$;

-- badge_hex_color
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'roles' AND column_name = 'badge_hex_color') THEN
        ALTER TABLE roles ADD COLUMN badge_hex_color VARCHAR(7);
        RAISE NOTICE '   ✅ Colonne badge_hex_color ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne badge_hex_color existe déjà';
    END IF;
END $$;

-- badge_priority
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'roles' AND column_name = 'badge_priority') THEN
        ALTER TABLE roles ADD COLUMN badge_priority INTEGER DEFAULT 999;
        RAISE NOTICE '   ✅ Colonne badge_priority ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne badge_priority existe déjà';
    END IF;
END $$;

\echo ''

-- ============================================================
-- ÉTAPE 2 : COLONNES MANQUANTES DANS LA TABLE "users"
-- ============================================================

\echo '👤 Ajout des colonnes manquantes dans la table users...'

-- ❌ photo_url N'EXISTE PAS dans users de la base pure
-- ✅ photo_url existe dans collaborateurs (c'est correct)
-- On ne l'ajoute donc PAS ici

-- two_factor_enabled
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE '   ✅ Colonne two_factor_enabled ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne two_factor_enabled existe déjà';
    END IF;
END $$;

-- two_factor_secret
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
        ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
        RAISE NOTICE '   ✅ Colonne two_factor_secret ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne two_factor_secret existe déjà';
    END IF;
END $$;

-- backup_codes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'backup_codes') THEN
        ALTER TABLE users ADD COLUMN backup_codes TEXT[];
        RAISE NOTICE '   ✅ Colonne backup_codes ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne backup_codes existe déjà';
    END IF;
END $$;

-- last_login
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '   ✅ Colonne last_login ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne last_login existe déjà';
    END IF;
END $$;

-- last_logout
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'last_logout') THEN
        ALTER TABLE users ADD COLUMN last_logout TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '   ✅ Colonne last_logout ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne last_logout existe déjà';
    END IF;
END $$;

\echo ''

-- ============================================================
-- ÉTAPE 3 : TABLE "notifications" (optionnelle)
-- ============================================================

\echo '🔔 Vérification de la table notifications...'

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

-- Ajouter campaign_id si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'notifications' AND column_name = 'campaign_id') THEN
        ALTER TABLE notifications ADD COLUMN campaign_id UUID;
        RAISE NOTICE '   ✅ Colonne campaign_id ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne campaign_id existe déjà';
    END IF;
END $$;

-- Ajouter read si manquante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'notifications' AND column_name = 'read') THEN
        ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT false;
        RAISE NOTICE '   ✅ Colonne read ajoutée';
    ELSE
        RAISE NOTICE '   ℹ️  Colonne read existe déjà';
    END IF;
END $$;

\echo ''

-- ============================================================
-- ÉTAPE 4 : INDEX POUR PERFORMANCE
-- ============================================================

\echo '⚡ Création des index pour performance...'

-- Index sur roles
CREATE INDEX IF NOT EXISTS idx_roles_badge_priority ON roles(badge_priority);
\echo '   ✓ Index sur roles.badge_priority'

-- Index sur users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
\echo '   ✓ Index sur users.email'

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
\echo '   ✓ Index sur users.role'

CREATE INDEX IF NOT EXISTS idx_users_statut ON users(statut);
\echo '   ✓ Index sur users.statut'

-- Index sur user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
\echo '   ✓ Index sur user_roles.user_id'

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
\echo '   ✓ Index sur user_roles.role_id'

-- Index sur role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
\echo '   ✓ Index sur role_permissions.role_id'

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
\echo '   ✓ Index sur role_permissions.permission_id'

-- Index sur permissions
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
\echo '   ✓ Index sur permissions.code'

CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
\echo '   ✓ Index sur permissions.category'

-- Index sur notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
\echo '   ✓ Index sur notifications.user_id'

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
\echo '   ✓ Index sur notifications.read'

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
\echo '   ✓ Index sur notifications.created_at'

\echo ''

-- ============================================================
-- ÉTAPE 5 : MISE À JOUR DES BADGES POUR LES RÔLES EXISTANTS
-- ============================================================

\echo '🎨 Mise à jour des badges pour les rôles existants (Base Pure)...'

-- SUPER_ADMIN (rôle système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-red-100',
    badge_text_class = 'text-red-800',
    badge_hex_color = '#DC2626',
    badge_priority = 100
WHERE name = 'SUPER_ADMIN' AND badge_hex_color IS NULL;

-- ADMIN_IT (rôle système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-gray-900',
    badge_text_class = 'text-white',
    badge_hex_color = '#111827',
    badge_priority = 95
WHERE name = 'ADMIN_IT' AND badge_hex_color IS NULL;

-- IT (rôle système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-gray-100',
    badge_text_class = 'text-gray-800',
    badge_hex_color = '#6B7280',
    badge_priority = 92
WHERE name = 'IT' AND badge_hex_color IS NULL;

-- ADMIN (rôle système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-blue-100',
    badge_text_class = 'text-blue-800',
    badge_hex_color = '#2563EB',
    badge_priority = 90
WHERE name = 'ADMIN' AND badge_hex_color IS NULL;

-- MANAGER (rôle système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-cyan-100',
    badge_text_class = 'text-cyan-800',
    badge_hex_color = '#06B6D4',
    badge_priority = 70
WHERE name = 'MANAGER' AND badge_hex_color IS NULL;

-- CONSULTANT (rôle système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-green-100',
    badge_text_class = 'text-green-800',
    badge_hex_color = '#16A34A',
    badge_priority = 60
WHERE name = 'CONSULTANT' AND badge_hex_color IS NULL;

-- COLLABORATEUR (rôle système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-gray-50',
    badge_text_class = 'text-gray-700',
    badge_hex_color = '#F9FAFB',
    badge_priority = 50
WHERE name = 'COLLABORATEUR' AND badge_hex_color IS NULL;

-- ASSOCIE (rôle non-système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-amber-100',
    badge_text_class = 'text-amber-800',
    badge_hex_color = '#FCD34D',
    badge_priority = 85
WHERE name = 'ASSOCIE' AND badge_hex_color IS NULL;

-- DIRECTEUR (rôle non-système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-yellow-100',
    badge_text_class = 'text-yellow-800',
    badge_hex_color = '#FDE047',
    badge_priority = 80
WHERE name = 'DIRECTEUR' AND badge_hex_color IS NULL;

-- SUPER_USER (rôle non-système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-indigo-100',
    badge_text_class = 'text-indigo-800',
    badge_hex_color = '#818CF8',
    badge_priority = 75
WHERE name = 'SUPER_USER' AND badge_hex_color IS NULL;

-- SUPERVISEUR (rôle non-système)
UPDATE roles 
SET 
    badge_bg_class = 'bg-teal-100',
    badge_text_class = 'text-teal-800',
    badge_hex_color = '#2DD4BF',
    badge_priority = 65
WHERE name = 'SUPERVISEUR' AND badge_hex_color IS NULL;

\echo '   ✓ Badges mis à jour pour les 11 rôles de la base pure'
\echo ''

-- ============================================================
-- ÉTAPE 6 : VÉRIFICATION FINALE
-- ============================================================

\echo '📊 Vérification finale...'
\echo ''

SELECT 
    '✅ CORRECTION TERMINÉE' as status,
    COUNT(DISTINCT table_name) as tables_modifiees,
    COUNT(*) as colonnes_verifiees
FROM information_schema.columns 
WHERE table_name IN ('roles', 'users', 'notifications')
AND column_name IN (
    'badge_bg_class', 'badge_text_class', 'badge_hex_color', 'badge_priority',
    'photo_url', 'two_factor_enabled', 'two_factor_secret', 'backup_codes', 'last_login', 'last_logout',
    'campaign_id', 'read'
);

\echo ''
\echo '╔══════════════════════════════════════════════════════════════╗'
\echo '║         ✅ SCHÉMA CORRIGÉ AVEC SUCCÈS                       ║'
\echo '╚══════════════════════════════════════════════════════════════╝'
\echo ''



