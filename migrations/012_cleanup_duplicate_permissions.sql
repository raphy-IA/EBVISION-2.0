-- Migration: Nettoyage des permissions en double
-- Date: 2025-12-17
-- Description: Supprime les permissions dupliquées et migre les associations

BEGIN;

-- ============================================================================
-- PARTIE 1: NETTOYAGE DES PERMISSIONS NAVIGATION
-- ============================================================================

-- Créer une table temporaire pour stocker les permissions à supprimer
CREATE TEMP TABLE permissions_to_delete AS
WITH duplicates AS (
    SELECT 
        name,
        category,
        ARRAY_AGG(id ORDER BY created_at, id) as ids,
        ARRAY_AGG(code ORDER BY created_at, id) as codes
    FROM permissions
    WHERE category = 'navigation'
    GROUP BY name, category
    HAVING COUNT(*) > 1
)
SELECT 
    UNNEST(ids[2:array_length(ids, 1)]) as delete_id,
    ids[1] as keep_id
FROM duplicates;

-- Migrer les associations role_permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, ptd.keep_id
FROM role_permissions rp
JOIN permissions_to_delete ptd ON rp.permission_id = ptd.delete_id
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp2
    WHERE rp2.role_id = rp.role_id
    AND rp2.permission_id = ptd.keep_id
);

-- Migrer les associations user_permissions
INSERT INTO user_permissions (user_id, permission_id)
SELECT DISTINCT up.user_id, ptd.keep_id
FROM user_permissions up
JOIN permissions_to_delete ptd ON up.permission_id = ptd.delete_id
WHERE NOT EXISTS (
    SELECT 1 FROM user_permissions up2
    WHERE up2.user_id = up.user_id
    AND up2.permission_id = ptd.keep_id
);

-- Supprimer les anciennes associations
DELETE FROM role_permissions
WHERE permission_id IN (SELECT delete_id FROM permissions_to_delete);

DELETE FROM user_permissions
WHERE permission_id IN (SELECT delete_id FROM permissions_to_delete);

-- Supprimer les permissions en double
DELETE FROM permissions
WHERE id IN (SELECT delete_id FROM permissions_to_delete);

-- ============================================================================
-- PARTIE 2: NETTOYAGE DES AUTRES CATÉGORIES (api, dashboard, objectives, time)
-- ============================================================================

DROP TABLE IF EXISTS permissions_to_delete;

CREATE TEMP TABLE permissions_to_delete AS
WITH duplicates AS (
    SELECT 
        name,
        category,
        ARRAY_AGG(id ORDER BY created_at, id) as ids,
        ARRAY_AGG(code ORDER BY created_at, id) as codes
    FROM permissions
    WHERE category IN ('api', 'dashboard', 'objectives', 'time')
    GROUP BY name, category
    HAVING COUNT(*) > 1
)
SELECT 
    UNNEST(ids[2:array_length(ids, 1)]) as delete_id,
    ids[1] as keep_id
FROM duplicates;

-- Migrer les associations
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, ptd.keep_id
FROM role_permissions rp
JOIN permissions_to_delete ptd ON rp.permission_id = ptd.delete_id
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp2
    WHERE rp2.role_id = rp.role_id
    AND rp2.permission_id = ptd.keep_id
);

INSERT INTO user_permissions (user_id, permission_id)
SELECT DISTINCT up.user_id, ptd.keep_id
FROM user_permissions up
JOIN permissions_to_delete ptd ON up.permission_id = ptd.delete_id
WHERE NOT EXISTS (
    SELECT 1 FROM user_permissions up2
    WHERE up2.user_id = up.user_id
    AND up2.permission_id = ptd.keep_id
);

-- Supprimer les anciennes associations
DELETE FROM role_permissions
WHERE permission_id IN (SELECT delete_id FROM permissions_to_delete);

DELETE FROM user_permissions
WHERE permission_id IN (SELECT delete_id FROM permissions_to_delete);

-- Supprimer les permissions en double
DELETE FROM permissions
WHERE id IN (SELECT delete_id FROM permissions_to_delete);

-- ============================================================================
-- PARTIE 3: NETTOYAGE OPPORTUNITIES & MISSIONS
-- ============================================================================

-- Définir les paires de permissions à nettoyer
DO $$
DECLARE
    v_keep_id UUID;
    v_delete_id UUID;
    v_pairs TEXT[][] := ARRAY[
        -- Opportunities
        ARRAY['opportunities', 'opportunities.create', 'opportunities:create'],
        ARRAY['opportunities', 'opportunities.edit', 'opportunities:update'],
        ARRAY['opportunities', 'opportunities.delete', 'opportunities:delete'],
        ARRAY['opportunities', 'opportunities.view', 'opportunities:read'],
        -- Missions
        ARRAY['missions', 'missions.create', 'missions:create'],
        ARRAY['missions', 'missions.edit', 'missions:update'],
        ARRAY['missions', 'missions.delete', 'missions:delete'],
        ARRAY['missions', 'missions.view', 'missions:read']
    ];
    v_pair TEXT[];
BEGIN
    FOREACH v_pair SLICE 1 IN ARRAY v_pairs
    LOOP
        -- Trouver les IDs
        SELECT id INTO v_keep_id FROM permissions 
        WHERE code = v_pair[2] AND category = v_pair[1];
        
        SELECT id INTO v_delete_id FROM permissions 
        WHERE code = v_pair[3] AND category = v_pair[1];
        
        -- Si les deux existent, migrer et supprimer
        IF v_keep_id IS NOT NULL AND v_delete_id IS NOT NULL THEN
            -- Migrer role_permissions
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT DISTINCT rp.role_id, v_keep_id
            FROM role_permissions rp
            WHERE rp.permission_id = v_delete_id
            AND NOT EXISTS (
                SELECT 1 FROM role_permissions rp2
                WHERE rp2.role_id = rp.role_id
                AND rp2.permission_id = v_keep_id
            );
            
            -- Migrer user_permissions
            INSERT INTO user_permissions (user_id, permission_id)
            SELECT DISTINCT up.user_id, v_keep_id
            FROM user_permissions up
            WHERE up.permission_id = v_delete_id
            AND NOT EXISTS (
                SELECT 1 FROM user_permissions up2
                WHERE up2.user_id = up.user_id
                AND up2.permission_id = v_keep_id
            );
            
            -- Supprimer les anciennes associations
            DELETE FROM role_permissions WHERE permission_id = v_delete_id;
            DELETE FROM user_permissions WHERE permission_id = v_delete_id;
            
            -- Supprimer la permission
            DELETE FROM permissions WHERE id = v_delete_id;
            
            RAISE NOTICE 'Nettoyé: % - % -> %', v_pair[1], v_pair[3], v_pair[2];
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

-- Compter les permissions restantes par catégorie
DO $$
DECLARE
    v_count INTEGER;
    v_duplicates INTEGER;
BEGIN
    -- Vérifier s'il reste des doublons
    SELECT COUNT(*) INTO v_duplicates
    FROM (
        SELECT name, category
        FROM permissions
        GROUP BY name, category
        HAVING COUNT(*) > 1
    ) sub;
    
    IF v_duplicates > 0 THEN
        RAISE WARNING 'ATTENTION: Il reste % groupes de permissions en double!', v_duplicates;
    ELSE
        RAISE NOTICE '✅ Aucune permission en double détectée';
    END IF;
    
    -- Afficher le nombre de permissions par catégorie
    FOR v_count IN 
        SELECT COUNT(*) 
        FROM permissions 
        GROUP BY category 
        ORDER BY category
    LOOP
        RAISE NOTICE 'Permissions par catégorie: %', v_count;
    END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK EN CAS D'ERREUR
-- ============================================================================
-- Si une erreur se produit, toutes les modifications seront annulées
-- grâce au BEGIN/COMMIT
