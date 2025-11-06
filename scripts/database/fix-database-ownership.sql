-- ============================================================
-- SCRIPT SQL : CHANGEMENT DE PROPRIÉTAIRE DES TABLES
-- ============================================================
-- 
-- Ce script doit être exécuté en tant que superuser (postgres)
-- pour donner la propriété de toutes les tables à ewm_user
--
-- Usage: sudo -u postgres psql -d ewm_db -f scripts/database/fix-database-ownership.sql
-- ============================================================

-- Changer le propriétaire de toutes les tables existantes
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

-- Changer le propriétaire de toutes les séquences
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, sequencename 
              FROM pg_sequences 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.schemaname) || '.' || quote_ident(r.sequencename) || ' OWNER TO ewm_user';
    END LOOP;
END $$;

-- Accorder tous les droits (redondant mais sécurisant)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ewm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ewm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ewm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ewm_user;

-- Vérification : afficher les propriétaires des tables
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

