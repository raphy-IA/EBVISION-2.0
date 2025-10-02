-- Migration 005: Création des tables pour la synchronisation dynamique des permissions et menus
-- Date: 2025-10-02
-- Description: Crée les tables pages, menu_sections, menu_items pour la synchronisation automatique

-- =====================================================
-- 1. Créer la table pages (si elle n'existe pas)
-- =====================================================
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pages_path ON pages(path);
CREATE INDEX IF NOT EXISTS idx_pages_code ON pages(code);

COMMENT ON TABLE pages IS 'Stocke toutes les pages HTML de l''application pour la synchronisation des permissions';
COMMENT ON COLUMN pages.path IS 'Chemin URL de la page (ex: /dashboard.html)';
COMMENT ON COLUMN pages.title IS 'Titre de la page extrait du tag <title>';
COMMENT ON COLUMN pages.code IS 'Code de permission associé (ex: page.dashboard)';

-- =====================================================
-- 2. Créer la table menu_sections (si elle n'existe pas)
-- =====================================================
CREATE TABLE IF NOT EXISTS menu_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_sections_code ON menu_sections(code);

COMMENT ON TABLE menu_sections IS 'Sections du menu principal (ex: DASHBOARD, MARKET PIPELINE, etc.)';
COMMENT ON COLUMN menu_sections.name IS 'Nom affiché de la section (ex: DASHBOARD)';
COMMENT ON COLUMN menu_sections.code IS 'Code de la section (ex: DASHBOARD, MARKET_PIPELINE)';

-- =====================================================
-- 3. Créer la table menu_items (si elle n'existe pas)
-- =====================================================
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(section_id, code),
    UNIQUE(section_id, path)
);

CREATE INDEX IF NOT EXISTS idx_menu_items_section_id ON menu_items(section_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_code ON menu_items(code);
CREATE INDEX IF NOT EXISTS idx_menu_items_path ON menu_items(path);

COMMENT ON TABLE menu_items IS 'Items de menu à l''intérieur de chaque section';
COMMENT ON COLUMN menu_items.section_id IS 'Référence à la section parente';
COMMENT ON COLUMN menu_items.name IS 'Nom affiché de l''item (ex: Tableau de bord principal)';
COMMENT ON COLUMN menu_items.code IS 'Code unique de l''item (ex: tableau_de_bord_principal)';
COMMENT ON COLUMN menu_items.path IS 'URL de l''item (ex: dashboard.html)';
COMMENT ON COLUMN menu_items.display_order IS 'Ordre d''affichage dans le menu';

-- =====================================================
-- 4. Ajouter la colonne category à permissions (si elle n'existe pas)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'permissions' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE permissions ADD COLUMN category VARCHAR(255) DEFAULT 'General';
        COMMENT ON COLUMN permissions.category IS 'Catégorie de la permission (Pages, menu, Général, etc.)';
    END IF;
END
$$;

-- =====================================================
-- 5. Mettre à jour les permissions existantes avec une catégorie par défaut
-- =====================================================
UPDATE permissions 
SET category = CASE
    WHEN code LIKE 'page.%' THEN 'pages'
    WHEN code LIKE 'menu.%' THEN 'menu'
    ELSE 'General'
END
WHERE category IS NULL OR category = 'General';

-- =====================================================
-- 6. Créer un index sur la colonne category
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- =====================================================
-- 7. Fonction pour mettre à jour updated_at automatiquement
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Créer les triggers pour updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_sections_updated_at ON menu_sections;
CREATE TRIGGER update_menu_sections_updated_at
    BEFORE UPDATE ON menu_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Afficher un résumé
DO $$
DECLARE
    pages_count INTEGER;
    sections_count INTEGER;
    items_count INTEGER;
    permissions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pages_count FROM pages;
    SELECT COUNT(*) INTO sections_count FROM menu_sections;
    SELECT COUNT(*) INTO items_count FROM menu_items;
    SELECT COUNT(*) INTO permissions_count FROM permissions WHERE category = 'menu';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 005 terminée avec succès !';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Pages dans la base: %', pages_count;
    RAISE NOTICE 'Sections de menu: %', sections_count;
    RAISE NOTICE 'Items de menu: %', items_count;
    RAISE NOTICE 'Permissions de menu: %', permissions_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Prochaine étape: Utiliser le bouton "Synchroniser Permissions & Menus"';
    RAISE NOTICE 'sur /permissions-admin.html pour peupler ces tables automatiquement.';
    RAISE NOTICE '========================================';
END
$$;
