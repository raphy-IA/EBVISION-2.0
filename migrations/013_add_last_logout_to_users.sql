-- Migration: Ajouter la colonne last_logout à la table users
-- Date: 2025-12-03
-- Description: Permet de tracker la dernière déconnexion des utilisateurs

-- Ajouter la colonne last_logout
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_logout TIMESTAMP;

-- Créer un index pour améliorer les performances des requêtes sur last_logout
CREATE INDEX IF NOT EXISTS idx_users_last_logout ON users(last_logout);

-- Commentaire sur la colonne
COMMENT ON COLUMN users.last_logout IS 'Date et heure de la dernière déconnexion de l''utilisateur';
