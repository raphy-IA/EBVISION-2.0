-- ============================================================
-- SCRIPT SQL : CORRECTION DES PERMISSIONS DE BASE DE DONNÉES
-- ============================================================
-- 
-- Ce script doit être exécuté en tant que superuser (postgres)
-- pour donner les droits nécessaires à l'utilisateur ewm_user
--
-- Usage: psql -U postgres -d ewm_db -f scripts/database/fix-database-permissions.sql
-- ============================================================

-- Accorder tous les droits sur toutes les tables existantes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ewm_user;

-- Accorder les droits sur les séquences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ewm_user;

-- Définir les droits par défaut pour les futures tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ewm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ewm_user;

-- Donner le droit de créer des tables (si nécessaire)
ALTER USER ewm_user CREATEDB;

-- Vérifier les droits accordés
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE grantee = 'ewm_user' 
ORDER BY table_name;

