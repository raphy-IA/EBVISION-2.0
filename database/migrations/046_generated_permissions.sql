-- Insertion des permissions par catégorie
-- Dashboard
INSERT INTO permissions (code, name, nom, description, category, module) VALUES
(''dashboard.view'', ''Voir le dashboard'', ''Voir le dashboard'', ''Accès au tableau de bord principal'', ''dashboard'', ''dashboard''),
(''dashboard.edit'', ''Modifier le dashboard'', ''Modifier le dashboard'', ''Modification des widgets et configuration'', ''dashboard'', ''dashboard''),
(''dashboard.admin'', ''Administrer le dashboard'', ''Administrer le dashboard'', ''Configuration complète du dashboard'', ''dashboard'', ''dashboard'')
ON CONFLICT (code) DO NOTHING;

-- Opportunities
INSERT INTO permissions (code, name, nom, description, category, module) VALUES
(''opportunities.view'', ''Voir les opportunités'', ''Voir les opportunités'', ''Lecture des opportunités'', ''opportunities'', ''opportunities''),
(''opportunities.create'', ''Créer des opportunités'', ''Créer des opportunités'', ''Création de nouvelles opportunités'', ''opportunities'', ''opportunities''),
(''opportunities.edit'', ''Modifier les opportunités'', ''Modifier les opportunités'', ''Modification des opportunités existantes'', ''opportunities'', ''opportunities''),
(''opportunities.delete'', ''Supprimer les opportunités'', ''Supprimer les opportunités'', ''Suppression d''opportunités'', ''opportunities'', ''opportunities''),
(''opportunities.validate'', ''Valider les étapes'', ''Valider les étapes'', ''Validation des étapes d''opportunités'', ''opportunities'', ''opportunities'')
ON CONFLICT (code) DO NOTHING;

-- Campaigns
INSERT INTO permissions (code, name, nom, description, category, module) VALUES
(''campaigns.view'', ''Voir les campagnes'', ''Voir les campagnes'', ''Lecture des campagnes de prospection'', ''campaigns'', ''campaigns''),
(''campaigns.create'', ''Créer des campagnes'', ''Créer des campagnes'', ''Création de nouvelles campagnes'', ''campaigns'', ''campaigns''),
(''campaigns.edit'', ''Modifier les campagnes'', ''Modifier les campagnes'', ''Modification des campagnes existantes'', ''campaigns'', ''campaigns''),
(''campaigns.delete'', ''Supprimer les campagnes'', ''Supprimer les campagnes'', ''Suppression de campagnes'', ''campaigns'', ''campaigns''),
(''campaigns.execute'', ''Exécuter les campagnes'', ''Exécuter les campagnes'', ''Exécution des campagnes de prospection'', ''campaigns'', ''campaigns''),
(''campaigns.validate'', ''Valider les campagnes'', ''Valider les campagnes'', ''Validation des campagnes'', ''campaigns'', ''campaigns'')
ON CONFLICT (code) DO NOTHING;

-- Missions
INSERT INTO permissions (code, name, nom, description, category, module) VALUES
(''missions.view'', ''Voir les missions'', ''Voir les missions'', ''Lecture des missions'', ''missions'', ''missions''),
(''missions.create'', ''Créer des missions'', ''Créer des missions'', ''Création de nouvelles missions'', ''missions'', ''missions''),
(''missions.edit'', ''Modifier les missions'', ''Modifier les missions'', ''Modification des missions existantes'', ''missions'', ''missions''),
(''missions.delete'', ''Supprimer les missions'', ''Supprimer les missions'', ''Suppression de missions'', ''missions'', ''missions''),
(''missions.assign'', ''Assigner des missions'', ''Assigner des missions'', ''Assignation de missions aux collaborateurs'', ''missions'', ''missions'')
ON CONFLICT (code) DO NOTHING;

-- Clients
INSERT INTO permissions (code, name, nom, description, category, module) VALUES
(''clients.view'', ''Voir les clients'', ''Voir les clients'', ''Lecture des données clients'', ''clients'', ''clients''),
(''clients.create'', ''Créer des clients'', ''Créer des clients'', ''Création de nouveaux clients'', ''clients'', ''clients''),
(''clients.edit'', ''Modifier les clients'', ''Modifier les clients'', ''Modification des données clients'', ''clients'', ''clients''),
(''clients.delete'', ''Supprimer les clients'', ''Supprimer les clients'', ''Suppression de clients'', ''clients'', ''clients'')
ON CONFLICT (code) DO NOTHING;

-- Users
INSERT INTO permissions (code, name, nom, description, category, module) VALUES
(''users.view'', ''Voir les utilisateurs'', ''Voir les utilisateurs'', ''Lecture des données utilisateurs'', ''users'', ''users''),
(''users.create'', ''Créer des utilisateurs'', ''Créer des utilisateurs'', ''Création de nouveaux utilisateurs'', ''users'', ''users''),
(''users.edit'', ''Modifier les utilisateurs'', ''Modifier les utilisateurs'', ''Modification des données utilisateurs'', ''users'', ''users''),
(''users.delete'', ''Supprimer les utilisateurs'', ''Supprimer les utilisateurs'', ''Suppression d''utilisateurs'', ''users'', ''users''),
(''users.permissions'', ''Gérer les permissions'', ''Gérer les permissions'', ''Gestion des permissions utilisateurs'', ''users'', ''users'')
ON CONFLICT (code) DO NOTHING;

-- Reports
INSERT INTO permissions (code, name, nom, description, category, module) VALUES
(''reports.view'', ''Voir les rapports'', ''Voir les rapports'', ''Accès aux rapports'', ''reports'', ''reports''),
(''reports.create'', ''Créer des rapports'', ''Créer des rapports'', ''Création de nouveaux rapports'', ''reports'', ''reports''),
(''reports.export'', ''Exporter les rapports'', ''Exporter les rapports'', ''Export des rapports'', ''reports'', ''reports''),
(''reports.admin'', ''Administrer les rapports'', ''Administrer les rapports'', ''Configuration des rapports'', ''reports'', ''reports'')
ON CONFLICT (code) DO NOTHING;

-- Config
INSERT INTO permissions (code, name, nom, description, category, module) VALUES
(''config.view'', ''Voir la configuration'', ''Voir la configuration'', ''Lecture de la configuration système'', ''config'', ''config''),
(''config.edit'', ''Modifier la configuration'', ''Modifier la configuration'', ''Modification de la configuration'', ''config'', ''config''),
(''config.admin'', ''Administrer la configuration'', ''Administrer la configuration'', ''Configuration complète du système'', ''config'', ''config''),
(''permissions.manage'', ''Gérer les permissions'', ''Gérer les permissions'', ''Gestion du système de permissions'', ''config'', ''config'')
ON CONFLICT (code) DO NOTHING;

