-- Seed 001: Données initiales
-- Date: 2024-01-01
-- Description: Insertion des données de base nécessaires pour EB-Vision 2.0

-- Insertion des rôles de base
INSERT INTO roles (nom, description) VALUES
('ADMIN', 'Administrateur système avec tous les droits'),
('PARTNER', 'Associé avec droits étendus'),
('MANAGER', 'Manager avec droits de gestion d\'équipe'),
('SENIOR', 'Collaborateur senior'),
('ASSISTANT', 'Assistant/collaborateur junior');

-- Insertion des permissions par module
INSERT INTO permissions (nom, description, module) VALUES
-- Permissions utilisateurs
('users:create', 'Créer des utilisateurs', 'USERS'),
('users:read', 'Lire les informations utilisateurs', 'USERS'),
('users:update', 'Modifier les utilisateurs', 'USERS'),
('users:delete', 'Supprimer des utilisateurs', 'USERS'),
('users:manage_roles', 'Gérer les rôles des utilisateurs', 'USERS'),

-- Permissions divisions
('divisions:create', 'Créer des divisions', 'DIVISIONS'),
('divisions:read', 'Lire les informations divisions', 'DIVISIONS'),
('divisions:update', 'Modifier les divisions', 'DIVISIONS'),
('divisions:delete', 'Supprimer des divisions', 'DIVISIONS'),

-- Permissions clients
('clients:create', 'Créer des clients', 'CLIENTS'),
('clients:read', 'Lire les informations clients', 'CLIENTS'),
('clients:update', 'Modifier les clients', 'CLIENTS'),
('clients:delete', 'Supprimer des clients', 'CLIENTS'),

-- Permissions contacts
('contacts:create', 'Créer des contacts', 'CONTACTS'),
('contacts:read', 'Lire les informations contacts', 'CONTACTS'),
('contacts:update', 'Modifier les contacts', 'CONTACTS'),
('contacts:delete', 'Supprimer des contacts', 'CONTACTS'),

-- Permissions années fiscales
('fiscal_years:create', 'Créer des années fiscales', 'FISCAL_YEARS'),
('fiscal_years:read', 'Lire les informations années fiscales', 'FISCAL_YEARS'),
('fiscal_years:update', 'Modifier les années fiscales', 'FISCAL_YEARS'),
('fiscal_years:delete', 'Supprimer des années fiscales', 'FISCAL_YEARS'),

-- Permissions missions
('missions:create', 'Créer des missions', 'MISSIONS'),
('missions:read', 'Lire les informations missions', 'MISSIONS'),
('missions:update', 'Modifier les missions', 'MISSIONS'),
('missions:delete', 'Supprimer des missions', 'MISSIONS'),

-- Permissions temps
('time:create', 'Saisir du temps', 'TIME'),
('time:read', 'Lire les saisies de temps', 'TIME'),
('time:update', 'Modifier les saisies de temps', 'TIME'),
('time:delete', 'Supprimer des saisies de temps', 'TIME'),
('time:validate', 'Valider les saisies de temps', 'TIME'),

-- Permissions facturation
('billing:create', 'Créer des factures', 'BILLING'),
('billing:read', 'Lire les factures', 'BILLING'),
('billing:update', 'Modifier les factures', 'BILLING'),
('billing:delete', 'Supprimer des factures', 'BILLING'),

-- Permissions rapports
('reports:read', 'Accéder aux rapports', 'REPORTS'),
('reports:export', 'Exporter les rapports', 'REPORTS'),

-- Permissions système
('system:settings', 'Gérer les paramètres système', 'SYSTEM'),
('system:backup', 'Effectuer des sauvegardes', 'SYSTEM');

-- Association des permissions aux rôles
-- ADMIN: toutes les permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE nom = 'ADMIN'),
    id
FROM permissions;

-- PARTNER: toutes les permissions sauf système
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE nom = 'PARTNER'),
    id
FROM permissions
WHERE module != 'SYSTEM';

-- MANAGER: permissions de gestion d'équipe
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE nom = 'MANAGER'),
    id
FROM permissions
WHERE nom IN (
    'users:read',
    'users:update',
    'divisions:read',
    'clients:create',
    'clients:read',
    'clients:update',
    'contacts:create',
    'contacts:read',
    'contacts:update',
    'missions:create',
    'missions:read',
    'missions:update',
    'time:read',
    'time:validate',
    'billing:read',
    'reports:read',
    'reports:export'
);

-- SENIOR: permissions de base + saisie temps
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE nom = 'SENIOR'),
    id
FROM permissions
WHERE nom IN (
    'users:read',
    'divisions:read',
    'clients:read',
    'contacts:read',
    'missions:read',
    'time:create',
    'time:read',
    'time:update',
    'billing:read',
    'reports:read'
);

-- ASSISTANT: permissions limitées
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE nom = 'ASSISTANT'),
    id
FROM permissions
WHERE nom IN (
    'users:read',
    'divisions:read',
    'clients:read',
    'contacts:read',
    'missions:read',
    'time:create',
    'time:read',
    'time:update'
);

-- Insertion des divisions de base (basées sur vos données CSV)
INSERT INTO divisions (nom, code, budget_annuel, statut) VALUES
('Tax', 'TAX', 500000.00, 'ACTIF'),
('Legal Services', 'LEGAL', 400000.00, 'ACTIF'),
('Audit', 'AUDIT', 600000.00, 'ACTIF'),
('Assurance', 'ASSUR', 300000.00, 'ACTIF'),
('Douane', 'DOUANE', 200000.00, 'ACTIF'),
('Finances', 'FIN', 350000.00, 'ACTIF'),
('Ressources Humaines', 'RH', 150000.00, 'ACTIF'),
('Support', 'SUPPORT', 100000.00, 'ACTIF');

-- Insertion des années fiscales de base
INSERT INTO fiscal_years (annee, date_debut, date_fin, budget_global, statut) VALUES
(2024, '2024-01-01', '2024-12-31', 2500000.00, 'EN_COURS'),
(2025, '2025-01-01', '2025-12-31', 2800000.00, 'OUVERTE');

-- Création d'un utilisateur administrateur par défaut
-- Mot de passe: Admin123! (à changer en production)
INSERT INTO users (nom, prenom, email, password_hash, initiales, grade, division_id, date_embauche, taux_horaire, statut) VALUES
('Administrateur', 'Système', 'admin@eb-vision.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i8eO', 'ADMIN', 'PARTNER', 
 (SELECT id FROM divisions WHERE code = 'SUPPORT'), '2024-01-01', 150.00, 'ACTIF');

-- Attribution du rôle admin à l'utilisateur admin
INSERT INTO user_roles (user_id, role_id) VALUES
((SELECT id FROM users WHERE email = 'admin@eb-vision.com'), (SELECT id FROM roles WHERE nom = 'ADMIN'));

-- Attribution de toutes les permissions à l'admin
INSERT INTO user_permissions (user_id, permission_id)
SELECT 
    (SELECT id FROM users WHERE email = 'admin@eb-vision.com'),
    id
FROM permissions; 