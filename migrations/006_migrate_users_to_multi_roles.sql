-- Migration: Migrer les utilisateurs existants vers le système de rôles multiples
-- Date: 2025-10-03
-- Description: 
--   - Créer des entrées dans user_roles pour tous les utilisateurs ayant un rôle dans users.role
--   - Ne pas supprimer le champ users.role pour maintenir la compatibilité
--   - Permet une transition en douceur vers le système de rôles multiples uniquement

-- ===================================================================
-- ÉTAPE 1: Vérifier l'existence de la table user_roles
-- ===================================================================

-- Créer la table user_roles si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id) -- Un utilisateur ne peut avoir qu'une seule fois le même rôle
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ===================================================================
-- ÉTAPE 2: Migrer les utilisateurs avec un rôle dans users.role
-- ===================================================================

DO $$
DECLARE
    users_migrated INTEGER := 0;
    users_skipped INTEGER := 0;
    users_without_role INTEGER := 0;
    role_not_found INTEGER := 0;
    user_record RECORD;
    role_uuid UUID;
BEGIN
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  MIGRATION: Utilisateurs vers système de rôles multiples      ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- Parcourir tous les utilisateurs
    FOR user_record IN 
        SELECT id, nom, prenom, email, role 
        FROM users 
        WHERE statut = 'ACTIF'
        ORDER BY created_at
    LOOP
        -- Vérifier si l'utilisateur a déjà des rôles dans user_roles
        IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_record.id) THEN
            users_skipped := users_skipped + 1;
            RAISE NOTICE '⏭️  [SKIP] % % (%) - A déjà des rôles multiples', 
                user_record.prenom, user_record.nom, user_record.email;
            CONTINUE;
        END IF;
        
        -- Vérifier si l'utilisateur a un rôle défini
        IF user_record.role IS NULL OR user_record.role = '' THEN
            users_without_role := users_without_role + 1;
            RAISE WARNING '⚠️  [WARNING] % % (%) - Pas de rôle défini dans users.role', 
                user_record.prenom, user_record.nom, user_record.email;
            CONTINUE;
        END IF;
        
        -- Rechercher l'UUID du rôle dans la table roles
        SELECT id INTO role_uuid 
        FROM roles 
        WHERE name = user_record.role;
        
        IF role_uuid IS NULL THEN
            role_not_found := role_not_found + 1;
            RAISE WARNING '❌ [ERROR] % % (%) - Rôle "%s" non trouvé dans la table roles', 
                user_record.prenom, user_record.nom, user_record.email, user_record.role;
            CONTINUE;
        END IF;
        
        -- Insérer le rôle dans user_roles
        BEGIN
            INSERT INTO user_roles (user_id, role_id, created_at)
            VALUES (user_record.id, role_uuid, NOW());
            
            users_migrated := users_migrated + 1;
            RAISE NOTICE '✅ [SUCCESS] % % (%) - Rôle "%s" migré', 
                user_record.prenom, user_record.nom, user_record.email, user_record.role;
        EXCEPTION
            WHEN unique_violation THEN
                users_skipped := users_skipped + 1;
                RAISE NOTICE '⏭️  [SKIP] % % (%) - Rôle déjà présent', 
                    user_record.prenom, user_record.nom, user_record.email;
        END;
    END LOOP;
    
    -- Afficher le résumé
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  RÉSUMÉ DE LA MIGRATION                                        ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '✅ Utilisateurs migrés avec succès : %', users_migrated;
    RAISE NOTICE '⏭️  Utilisateurs ignorés (ont déjà des rôles) : %', users_skipped;
    RAISE NOTICE '⚠️  Utilisateurs sans rôle défini : %', users_without_role;
    RAISE NOTICE '❌ Rôles non trouvés dans la table roles : %', role_not_found;
    RAISE NOTICE '';
    
    -- Vérification finale
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  VÉRIFICATION FINALE                                           ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    
    -- Compter les utilisateurs actifs sans rôles multiples
    DECLARE
        users_without_multi_roles INTEGER;
    BEGIN
        SELECT COUNT(*) INTO users_without_multi_roles
        FROM users u
        WHERE u.statut = 'ACTIF'
        AND NOT EXISTS (
            SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
        );
        
        IF users_without_multi_roles > 0 THEN
            RAISE WARNING '⚠️  % utilisateur(s) actif(s) n''ont toujours pas de rôles multiples', 
                users_without_multi_roles;
            RAISE NOTICE '';
            RAISE NOTICE 'Liste des utilisateurs concernés:';
            
            FOR user_record IN 
                SELECT id, nom, prenom, email, role 
                FROM users u
                WHERE u.statut = 'ACTIF'
                AND NOT EXISTS (
                    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
                )
            LOOP
                RAISE NOTICE '  - % % (%) - Rôle legacy: %', 
                    user_record.prenom, user_record.nom, user_record.email, 
                    COALESCE(user_record.role, 'NULL');
            END LOOP;
        ELSE
            RAISE NOTICE '✅ Tous les utilisateurs actifs ont des rôles multiples!';
        END IF;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  MIGRATION TERMINÉE                                            ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    
END $$;

-- ===================================================================
-- ÉTAPE 3: Créer une fonction pour synchroniser automatiquement
-- ===================================================================

-- Cette fonction peut être appelée si vous devez resynchroniser manuellement
CREATE OR REPLACE FUNCTION sync_user_role_to_multi_roles(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role VARCHAR;
    v_role_id UUID;
BEGIN
    -- Récupérer le rôle de l'utilisateur
    SELECT role INTO v_user_role
    FROM users
    WHERE id = p_user_id;
    
    IF v_user_role IS NULL OR v_user_role = '' THEN
        RAISE WARNING 'Utilisateur % n''a pas de rôle défini', p_user_id;
        RETURN FALSE;
    END IF;
    
    -- Récupérer l'ID du rôle
    SELECT id INTO v_role_id
    FROM roles
    WHERE name = v_user_role;
    
    IF v_role_id IS NULL THEN
        RAISE WARNING 'Rôle % non trouvé dans la table roles', v_user_role;
        RETURN FALSE;
    END IF;
    
    -- Vérifier si le rôle existe déjà dans user_roles
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role_id = v_role_id) THEN
        RAISE NOTICE 'Rôle déjà présent pour l''utilisateur %', p_user_id;
        RETURN TRUE;
    END IF;
    
    -- Insérer le rôle
    INSERT INTO user_roles (user_id, role_id, created_at)
    VALUES (p_user_id, v_role_id, NOW());
    
    RAISE NOTICE 'Rôle % ajouté pour l''utilisateur %', v_user_role, p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- ÉTAPE 4: Statistiques finales
-- ===================================================================

DO $$
DECLARE
    total_users INTEGER;
    users_with_multi_roles INTEGER;
    total_role_assignments INTEGER;
    users_with_multiple_roles INTEGER;
BEGIN
    -- Compter les utilisateurs
    SELECT COUNT(*) INTO total_users FROM users WHERE statut = 'ACTIF';
    
    -- Compter les utilisateurs avec rôles multiples
    SELECT COUNT(DISTINCT user_id) INTO users_with_multi_roles FROM user_roles;
    
    -- Compter le nombre total d'assignations de rôles
    SELECT COUNT(*) INTO total_role_assignments FROM user_roles;
    
    -- Compter les utilisateurs avec plusieurs rôles
    SELECT COUNT(*) INTO users_with_multiple_roles
    FROM (
        SELECT user_id
        FROM user_roles
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) AS multi;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  STATISTIQUES FINALES                                          ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '📊 Utilisateurs actifs : %', total_users;
    RAISE NOTICE '👥 Utilisateurs avec rôles multiples : % (%.2f%%)', 
        users_with_multi_roles, 
        (users_with_multi_roles::FLOAT / NULLIF(total_users, 0) * 100)::NUMERIC(5,2);
    RAISE NOTICE '🔢 Total d''assignations de rôles : %', total_role_assignments;
    RAISE NOTICE '🎭 Utilisateurs avec plusieurs rôles : %', users_with_multiple_roles;
    RAISE NOTICE '';
END $$;

-- ===================================================================
-- NOTES IMPORTANTES
-- ===================================================================

-- 1. Cette migration NE SUPPRIME PAS le champ users.role
--    Il est conservé pour compatibilité temporaire
--
-- 2. Les nouveaux utilisateurs devraient être créés SANS définir users.role
--    et uniquement avec des entrées dans user_roles
--
-- 3. Pour synchroniser manuellement un utilisateur :
--    SELECT sync_user_role_to_multi_roles('user-uuid-here');
--
-- 4. Pour vérifier les utilisateurs sans rôles multiples :
--    SELECT u.id, u.nom, u.prenom, u.email, u.role
--    FROM users u
--    WHERE u.statut = 'ACTIF'
--    AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id);
--
-- 5. Le champ users.role pourra être supprimé dans une version future
--    après confirmation que tous les systèmes utilisent user_roles





















