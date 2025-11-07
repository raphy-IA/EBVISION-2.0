-- Migration 006: Système de rôles multiples (OBSOLÈTE)
-- Date: Octobre 2025

-- Cette migration attend une colonne `role` dans la table `users` qui n'existe plus.
-- La table `users` a été restructurée par la migration `006_restructure_models.sql` qui a supprimé
-- les colonnes liées aux collaborateurs (dont `role`).
-- Le système de rôles multiples est déjà géré par les tables `roles`, `user_roles`, et `role_permissions`
-- créées par les migrations précédentes.
-- Pour éviter les conflits, nous marquons cette migration comme ignorée.

DO $$
BEGIN
    RAISE NOTICE 'Migration 006_migrate_to_multiple_roles_system.sql ignorée (colonne role n''existe plus dans users).';
END$$;
