-- Migration des données existantes vers le système de permissions
-- Date: 2025-08-29

-- 1. Insertion des rôles système
INSERT INTO user_roles (name, description, is_system_role) VALUES
('SUPER_ADMIN', 'Super administrateur - Accès total à toutes les fonctionnalités', true),
('ADMIN_IT', 'Administrateur IT - Gestion technique et maintenance', true),
('IT', 'Technicien IT - Support technique et maintenance', true),
('ADMIN', 'Administrateur - Gestion métier et configuration', true),
('MANAGER', 'Manager - Gestion d''équipe et supervision', true),
('CONSULTANT', 'Consultant - Utilisateur standard avec accès complet aux données', true),
('COLLABORATEUR', 'Collaborateur - Accès limité aux données de sa BU', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Insertion des permissions par catégorie
-- Dashboard
INSERT INTO permissions (code, name, description, category) VALUES
('dashboard.view', 'Voir le dashboard', 'Accès au tableau de bord principal', 'dashboard'),
('dashboard.edit', 'Modifier le dashboard', 'Modification des widgets et configuration', 'dashboard'),
('dashboard.admin', 'Administrer le dashboard', 'Configuration complète du dashboard', 'dashboard')
ON CONFLICT (code) DO NOTHING;

-- Opportunités
INSERT INTO permissions (code, name, description, category) VALUES
('opportunities.view', 'Voir les opportunités', 'Lecture des opportunités', 'opportunities'),
('opportunities.create', 'Créer des opportunités', 'Création de nouvelles opportunités', 'opportunities'),
('opportunities.edit', 'Modifier les opportunités', 'Modification des opportunités existantes', 'opportunities'),
('opportunities.delete', 'Supprimer les opportunités', 'Suppression d''opportunités', 'opportunities'),
('opportunities.validate', 'Valider les étapes', 'Validation des étapes d''opportunités', 'opportunities')
ON CONFLICT (code) DO NOTHING;

-- Campagnes
INSERT INTO permissions (code, name, description, category) VALUES
('campaigns.view', 'Voir les campagnes', 'Lecture des campagnes de prospection', 'campaigns'),
('campaigns.create', 'Créer des campagnes', 'Création de nouvelles campagnes', 'campaigns'),
('campaigns.edit', 'Modifier les campagnes', 'Modification des campagnes existantes', 'campaigns'),
('campaigns.delete', 'Supprimer les campagnes', 'Suppression de campagnes', 'campaigns'),
('campaigns.execute', 'Exécuter les campagnes', 'Exécution des campagnes de prospection', 'campaigns'),
('campaigns.validate', 'Valider les campagnes', 'Validation des campagnes', 'campaigns')
ON CONFLICT (code) DO NOTHING;

-- Missions
INSERT INTO permissions (code, name, description, category) VALUES
('missions.view', 'Voir les missions', 'Lecture des missions', 'missions'),
('missions.create', 'Créer des missions', 'Création de nouvelles missions', 'missions'),
('missions.edit', 'Modifier les missions', 'Modification des missions existantes', 'missions'),
('missions.delete', 'Supprimer les missions', 'Suppression de missions', 'missions'),
('missions.assign', 'Assigner des missions', 'Assignation de missions aux collaborateurs', 'missions')
ON CONFLICT (code) DO NOTHING;

-- Clients
INSERT INTO permissions (code, name, description, category) VALUES
('clients.view', 'Voir les clients', 'Lecture des données clients', 'clients'),
('clients.create', 'Créer des clients', 'Création de nouveaux clients', 'clients'),
('clients.edit', 'Modifier les clients', 'Modification des données clients', 'clients'),
('clients.delete', 'Supprimer les clients', 'Suppression de clients', 'clients')
ON CONFLICT (code) DO NOTHING;

-- Utilisateurs
INSERT INTO permissions (code, name, description, category) VALUES
('users.view', 'Voir les utilisateurs', 'Lecture des données utilisateurs', 'users'),
('users.create', 'Créer des utilisateurs', 'Création de nouveaux utilisateurs', 'users'),
('users.edit', 'Modifier les utilisateurs', 'Modification des données utilisateurs', 'users'),
('users.delete', 'Supprimer les utilisateurs', 'Suppression d''utilisateurs', 'users'),
('users.permissions', 'Gérer les permissions', 'Gestion des permissions utilisateurs', 'users')
ON CONFLICT (code) DO NOTHING;

-- Rapports
INSERT INTO permissions (code, name, description, category) VALUES
('reports.view', 'Voir les rapports', 'Accès aux rapports', 'reports'),
('reports.create', 'Créer des rapports', 'Création de nouveaux rapports', 'reports'),
('reports.export', 'Exporter les rapports', 'Export des rapports', 'reports'),
('reports.admin', 'Administrer les rapports', 'Configuration des rapports', 'reports')
ON CONFLICT (code) DO NOTHING;

-- Configuration
INSERT INTO permissions (code, name, description, category) VALUES
('config.view', 'Voir la configuration', 'Lecture de la configuration système', 'config'),
('config.edit', 'Modifier la configuration', 'Modification de la configuration', 'config'),
('config.admin', 'Administrer la configuration', 'Configuration complète du système', 'config'),
('permissions.manage', 'Gérer les permissions', 'Gestion du système de permissions', 'config')
ON CONFLICT (code) DO NOTHING;

-- 3. Configuration des permissions par rôle par défaut

-- SUPER_ADMIN - Toutes les permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    ur.id as role_id,
    p.id as permission_id
FROM user_roles ur
CROSS JOIN permissions p
WHERE ur.name = 'SUPER_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ADMIN_IT - Permissions techniques
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    ur.id as role_id,
    p.id as permission_id
FROM user_roles ur
JOIN permissions p ON p.code IN (
    'dashboard.view', 'dashboard.edit', 'dashboard.admin',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'config.view', 'config.edit', 'config.admin',
    'permissions.manage'
)
WHERE ur.name = 'ADMIN_IT'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ADMIN - Permissions métier
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    ur.id as role_id,
    p.id as permission_id
FROM user_roles ur
JOIN permissions p ON p.code IN (
    'dashboard.view', 'dashboard.edit',
    'opportunities.view', 'opportunities.create', 'opportunities.edit', 'opportunities.delete', 'opportunities.validate',
    'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.delete', 'campaigns.execute', 'campaigns.validate',
    'missions.view', 'missions.create', 'missions.edit', 'missions.delete', 'missions.assign',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'users.view', 'users.create', 'users.edit',
    'reports.view', 'reports.create', 'reports.export',
    'config.view', 'config.edit'
)
WHERE ur.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- MANAGER - Permissions de gestion
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    ur.id as role_id,
    p.id as permission_id
FROM user_roles ur
JOIN permissions p ON p.code IN (
    'dashboard.view', 'dashboard.edit',
    'opportunities.view', 'opportunities.create', 'opportunities.edit', 'opportunities.validate',
    'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.execute',
    'missions.view', 'missions.create', 'missions.edit', 'missions.assign',
    'clients.view', 'clients.create', 'clients.edit',
    'reports.view', 'reports.create', 'reports.export'
)
WHERE ur.name = 'MANAGER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CONSULTANT - Permissions standard
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    ur.id as role_id,
    p.id as permission_id
FROM user_roles ur
JOIN permissions p ON p.code IN (
    'dashboard.view',
    'opportunities.view', 'opportunities.create', 'opportunities.edit',
    'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.execute',
    'missions.view', 'missions.create', 'missions.edit',
    'clients.view', 'clients.create', 'clients.edit',
    'reports.view', 'reports.export'
)
WHERE ur.name = 'CONSULTANT'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- COLLABORATEUR - Permissions limitées
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    ur.id as role_id,
    p.id as permission_id
FROM user_roles ur
JOIN permissions p ON p.code IN (
    'dashboard.view',
    'opportunities.view', 'opportunities.create',
    'campaigns.view', 'campaigns.execute',
    'missions.view', 'missions.create',
    'clients.view',
    'reports.view'
)
WHERE ur.name = 'COLLABORATEUR'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Migration des utilisateurs existants vers le nouveau système
-- Assigner le rôle ADMIN aux utilisateurs existants avec role = 'ADMIN'
UPDATE users 
SET role_id = (SELECT id FROM user_roles WHERE name = 'ADMIN')
WHERE role = 'ADMIN' AND role_id IS NULL;

-- Assigner le rôle MANAGER aux utilisateurs existants avec role = 'MANAGER'
UPDATE users 
SET role_id = (SELECT id FROM user_roles WHERE name = 'MANAGER')
WHERE role = 'MANAGER' AND role_id IS NULL;

-- Assigner le rôle CONSULTANT aux utilisateurs existants avec role = 'CONSULTANT'
UPDATE users 
SET role_id = (SELECT id FROM user_roles WHERE name = 'CONSULTANT')
WHERE role = 'CONSULTANT' AND role_id IS NULL;

-- Assigner le rôle COLLABORATEUR par défaut aux autres utilisateurs
UPDATE users 
SET role_id = (SELECT id FROM user_roles WHERE name = 'COLLABORATEUR')
WHERE role_id IS NULL;

-- 5. Configuration des accès BU par défaut
-- Chaque utilisateur a accès à sa BU par défaut
INSERT INTO user_business_unit_access (user_id, business_unit_id, access_level, granted)
SELECT 
    u.id as user_id,
    c.business_unit_id,
    'ADMIN' as access_level,
    true as granted
FROM users u
JOIN collaborateurs c ON u.collaborateur_id = c.id
WHERE c.business_unit_id IS NOT NULL
ON CONFLICT (user_id, business_unit_id) DO NOTHING;












