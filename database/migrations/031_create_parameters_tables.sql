-- Migration: Création des tables de paramètres
-- Date: 2025-07-29
-- Description: Tables pour gérer les pays et secteurs d'activité

-- Table des pays
CREATE TABLE pays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    code_pays VARCHAR(3) NOT NULL UNIQUE,
    code_appel VARCHAR(10),
    devise VARCHAR(10),
    langue_principale VARCHAR(50),
    fuseau_horaire VARCHAR(50),
    capitale VARCHAR(100),
    population BIGINT,
    superficie DECIMAL(15,2),
    pib DECIMAL(20,2),
    description TEXT,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des secteurs d'activité (secteurs parents)
CREATE TABLE secteurs_activite (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE,
    description TEXT,
    couleur VARCHAR(7) DEFAULT '#3498db',
    icone VARCHAR(50),
    ordre INTEGER DEFAULT 0,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des sous-secteurs d'activité
CREATE TABLE sous_secteurs_activite (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secteur_id UUID NOT NULL REFERENCES secteurs_activite(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    description TEXT,
    couleur VARCHAR(7) DEFAULT '#3498db',
    icone VARCHAR(50),
    ordre INTEGER DEFAULT 0,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX idx_pays_code ON pays(code_pays);
CREATE INDEX idx_pays_actif ON pays(actif);
CREATE INDEX idx_secteurs_code ON secteurs_activite(code);
CREATE INDEX idx_secteurs_actif ON secteurs_activite(actif);
CREATE INDEX idx_sous_secteurs_secteur_id ON sous_secteurs_activite(secteur_id);
CREATE INDEX idx_sous_secteurs_actif ON sous_secteurs_activite(actif);

-- Triggers pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_pays_updated_at BEFORE UPDATE ON pays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_secteurs_activite_updated_at BEFORE UPDATE ON secteurs_activite FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sous_secteurs_activite_updated_at BEFORE UPDATE ON sous_secteurs_activite FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertion des données de base pour les pays
INSERT INTO pays (nom, code_pays, code_appel, devise, langue_principale, fuseau_horaire, capitale) VALUES
('France', 'FRA', '+33', 'EUR', 'Français', 'Europe/Paris', 'Paris'),
('Sénégal', 'SEN', '+221', 'XOF', 'Français', 'Africa/Dakar', 'Dakar'),
('Cameroun', 'CMR', '+237', 'XAF', 'Français', 'Africa/Douala', 'Yaoundé'),
('Côte d''Ivoire', 'CIV', '+225', 'XOF', 'Français', 'Africa/Abidjan', 'Yamoussoukro'),
('Mali', 'MLI', '+223', 'XOF', 'Français', 'Africa/Bamako', 'Bamako'),
('Burkina Faso', 'BFA', '+226', 'XOF', 'Français', 'Africa/Ouagadougou', 'Ouagadougou'),
('Niger', 'NER', '+227', 'XOF', 'Français', 'Africa/Niamey', 'Niamey'),
('Tchad', 'TCD', '+235', 'XAF', 'Français', 'Africa/Ndjamena', 'N''Djamena'),
('Guinée', 'GIN', '+224', 'GNF', 'Français', 'Africa/Conakry', 'Conakry'),
('Bénin', 'BEN', '+229', 'XOF', 'Français', 'Africa/Porto-Novo', 'Porto-Novo'),
('Togo', 'TGO', '+228', 'XOF', 'Français', 'Africa/Lome', 'Lomé'),
('Gabon', 'GAB', '+241', 'XAF', 'Français', 'Africa/Libreville', 'Libreville'),
('Congo', 'COG', '+242', 'XAF', 'Français', 'Africa/Brazzaville', 'Brazzaville'),
('République Centrafricaine', 'CAF', '+236', 'XAF', 'Français', 'Africa/Bangui', 'Bangui'),
('Comores', 'COM', '+269', 'KMF', 'Français', 'Indian/Comoro', 'Moroni'),
('Madagascar', 'MDG', '+261', 'MGA', 'Français', 'Indian/Antananarivo', 'Antananarivo'),
('Maurice', 'MUS', '+230', 'MUR', 'Français', 'Indian/Mauritius', 'Port Louis'),
('Seychelles', 'SYC', '+248', 'SCR', 'Français', 'Indian/Mahe', 'Victoria'),
('Djibouti', 'DJI', '+253', 'DJF', 'Français', 'Africa/Djibouti', 'Djibouti'),
('Allemagne', 'DEU', '+49', 'EUR', 'Allemand', 'Europe/Berlin', 'Berlin'),
('Belgique', 'BEL', '+32', 'EUR', 'Français', 'Europe/Brussels', 'Bruxelles'),
('Suisse', 'CHE', '+41', 'CHF', 'Français', 'Europe/Zurich', 'Berne'),
('Luxembourg', 'LUX', '+352', 'EUR', 'Français', 'Europe/Luxembourg', 'Luxembourg'),
('Canada', 'CAN', '+1', 'CAD', 'Français', 'America/Toronto', 'Ottawa'),
('États-Unis', 'USA', '+1', 'USD', 'Anglais', 'America/New_York', 'Washington'),
('Royaume-Uni', 'GBR', '+44', 'GBP', 'Anglais', 'Europe/London', 'Londres'),
('Espagne', 'ESP', '+34', 'EUR', 'Espagnol', 'Europe/Madrid', 'Madrid'),
('Italie', 'ITA', '+39', 'EUR', 'Italien', 'Europe/Rome', 'Rome'),
('Pays-Bas', 'NLD', '+31', 'EUR', 'Néerlandais', 'Europe/Amsterdam', 'Amsterdam');

-- Insertion des données de base pour les secteurs d'activité
INSERT INTO secteurs_activite (nom, code, description, couleur, icone, ordre) VALUES
('Audit & Conseil', 'AUDIT', 'Services d''audit et de conseil', '#e74c3c', 'fas fa-search', 1),
('Comptabilité', 'COMPTA', 'Services comptables et fiscaux', '#3498db', 'fas fa-calculator', 2),
('Finance', 'FINANCE', 'Services financiers et bancaires', '#2ecc71', 'fas fa-chart-line', 3),
('Juridique', 'JURIDIQUE', 'Services juridiques et légaux', '#9b59b6', 'fas fa-balance-scale', 4),
('Fiscalité', 'FISCALITE', 'Services fiscaux et douaniers', '#f39c12', 'fas fa-file-invoice-dollar', 5),
('Gouvernance', 'GOUVERNANCE', 'Gouvernance d''entreprise', '#34495e', 'fas fa-building', 6),
('Technologie', 'TECH', 'Technologies et informatique', '#1abc9c', 'fas fa-laptop-code', 7),
('Industrie', 'INDUSTRIE', 'Industries manufacturières', '#95a5a6', 'fas fa-industry', 8),
('Services', 'SERVICES', 'Services aux entreprises', '#e67e22', 'fas fa-briefcase', 9),
('Logistique', 'LOGISTIQUE', 'Transport et logistique', '#16a085', 'fas fa-truck', 10),
('Agriculture', 'AGRICULTURE', 'Agriculture et agroalimentaire', '#27ae60', 'fas fa-seedling', 11),
('Santé', 'SANTE', 'Santé et médecine', '#e91e63', 'fas fa-heartbeat', 12),
('Éducation', 'EDUCATION', 'Éducation et formation', '#3f51b5', 'fas fa-graduation-cap', 13),
('Transport', 'TRANSPORT', 'Transport et mobilité', '#ff9800', 'fas fa-plane', 14),
('Énergie', 'ENERGIE', 'Énergie et utilities', '#ff5722', 'fas fa-bolt', 15),
('Télécommunications', 'TELECOM', 'Télécommunications', '#2196f3', 'fas fa-phone', 16),
('Banque', 'BANQUE', 'Services bancaires', '#4caf50', 'fas fa-university', 17),
('Assurance', 'ASSURANCE', 'Services d''assurance', '#8bc34a', 'fas fa-shield-alt', 18),
('Immobilier', 'IMMOBILIER', 'Immobilier et construction', '#795548', 'fas fa-home', 19),
('Commerce', 'COMMERCE', 'Commerce et distribution', '#607d8b', 'fas fa-shopping-cart', 20),
('Restauration', 'RESTAURATION', 'Restauration et hôtellerie', '#ff7043', 'fas fa-utensils', 21),
('Culture', 'CULTURE', 'Culture et médias', '#ab47bc', 'fas fa-theater-masks', 22),
('Sport', 'SPORT', 'Sport et loisirs', '#26a69a', 'fas fa-futbol', 23),
('Association', 'ASSOCIATION', 'Associations et ONG', '#42a5f5', 'fas fa-hands-helping', 24),
('Administration', 'ADMIN', 'Administration publique', '#78909c', 'fas fa-landmark', 25);

-- Insertion des sous-secteurs pour quelques secteurs principaux
INSERT INTO sous_secteurs_activite (secteur_id, nom, code, description, ordre) VALUES
-- Audit & Conseil
((SELECT id FROM secteurs_activite WHERE code = 'AUDIT'), 'Audit externe', 'AUDIT_EXT', 'Audit des comptes annuels', 1),
((SELECT id FROM secteurs_activite WHERE code = 'AUDIT'), 'Audit interne', 'AUDIT_INT', 'Audit des processus internes', 2),
((SELECT id FROM secteurs_activite WHERE code = 'AUDIT'), 'Conseil en organisation', 'CONSEIL_ORG', 'Conseil en organisation et management', 3),

-- Comptabilité
((SELECT id FROM secteurs_activite WHERE code = 'COMPTA'), 'Comptabilité générale', 'COMPTA_GEN', 'Tenue de comptabilité générale', 1),
((SELECT id FROM secteurs_activite WHERE code = 'COMPTA'), 'Comptabilité analytique', 'COMPTA_ANA', 'Comptabilité analytique et contrôle de gestion', 2),
((SELECT id FROM secteurs_activite WHERE code = 'COMPTA'), 'Paie et RH', 'COMPTA_PAIE', 'Gestion de la paie et des ressources humaines', 3),

-- Finance
((SELECT id FROM secteurs_activite WHERE code = 'FINANCE'), 'Finance d''entreprise', 'FINANCE_ENT', 'Finance d''entreprise et trésorerie', 1),
((SELECT id FROM secteurs_activite WHERE code = 'FINANCE'), 'Investissement', 'FINANCE_INV', 'Gestion d''actifs et investissements', 2),
((SELECT id FROM secteurs_activite WHERE code = 'FINANCE'), 'Financement', 'FINANCE_FIN', 'Financement et crédit', 3),

-- Technologie
((SELECT id FROM secteurs_activite WHERE code = 'TECH'), 'Développement logiciel', 'TECH_DEV', 'Développement d''applications', 1),
((SELECT id FROM secteurs_activite WHERE code = 'TECH'), 'Infrastructure IT', 'TECH_INFRA', 'Infrastructure informatique', 2),
((SELECT id FROM secteurs_activite WHERE code = 'TECH'), 'Cybersécurité', 'TECH_SEC', 'Sécurité informatique', 3),
((SELECT id FROM secteurs_activite WHERE code = 'TECH'), 'Intelligence artificielle', 'TECH_IA', 'IA et machine learning', 4);