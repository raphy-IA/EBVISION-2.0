-- Script SQL direct pour insérer les données de référence
-- À exécuter via psql ou pgAdmin

-- ============================================
-- 1. SECTEURS D'ACTIVITÉ (20)
-- ============================================

INSERT INTO secteurs_activite (nom, code, description, couleur, icone, ordre, actif) VALUES
('Audit & Conseil', 'AUDIT', 'Services d''audit et de conseil', '#e74c3c', 'fas fa-search', 1, true),
('Comptabilité', 'COMPTA', 'Services comptables et fiscaux', '#3498db', 'fas fa-calculator', 2, true),
('Finance', 'FINANCE', 'Services financiers et bancaires', '#2ecc71', 'fas fa-chart-line', 3, true),
('Juridique', 'JURIDIQUE', 'Services juridiques et légaux', '#9b59b6', 'fas fa-balance-scale', 4, true),
('Fiscalité', 'FISCALITE', 'Services fiscaux et douaniers', '#f39c12', 'fas fa-file-invoice-dollar', 5, true),
('Gouvernance', 'GOUVERNANCE', 'Gouvernance d''entreprise', '#34495e', 'fas fa-building', 6, true),
('Technologie', 'TECH', 'Technologies et informatique', '#1abc9c', 'fas fa-laptop-code', 7, true),
('Industrie', 'INDUSTRIE', 'Industries manufacturières', '#95a5a6', 'fas fa-industry', 8, true),
('Services', 'SERVICES', 'Services aux entreprises', '#e67e22', 'fas fa-briefcase', 9, true),
('Logistique', 'LOGISTIQUE', 'Transport et logistique', '#16a085', 'fas fa-truck', 10, true),
('Agriculture', 'AGRICULTURE', 'Agriculture et agroalimentaire', '#27ae60', 'fas fa-seedling', 11, true),
('Santé', 'SANTE', 'Santé et médecine', '#e91e63', 'fas fa-heartbeat', 12, true),
('Éducation', 'EDUCATION', 'Éducation et formation', '#3f51b5', 'fas fa-graduation-cap', 13, true),
('Transport', 'TRANSPORT', 'Transport et mobilité', '#ff9800', 'fas fa-plane', 14, true),
('Énergie', 'ENERGIE', 'Énergie et utilities', '#ff5722', 'fas fa-bolt', 15, true),
('Télécommunications', 'TELECOM', 'Télécommunications', '#2196f3', 'fas fa-phone', 16, true),
('Banque', 'BANQUE', 'Services bancaires', '#4caf50', 'fas fa-university', 17, true),
('Assurance', 'ASSURANCE', 'Services d''assurance', '#8bc34a', 'fas fa-shield-alt', 18, true),
('Immobilier', 'IMMOBILIER', 'Immobilier et construction', '#795548', 'fas fa-home', 19, true),
('Commerce', 'COMMERCE', 'Commerce et distribution', '#607d8b', 'fas fa-shopping-cart', 20, true)
ON CONFLICT (code) DO UPDATE SET 
    nom = EXCLUDED.nom,
    description = EXCLUDED.description,
    couleur = EXCLUDED.couleur,
    icone = EXCLUDED.icone,
    ordre = EXCLUDED.ordre;

-- ============================================
-- 2. PAYS (20)
-- ============================================

INSERT INTO pays (nom, code_pays, code_appel, devise, langue_principale, fuseau_horaire, capitale, actif) VALUES
('France', 'FRA', '+33', 'EUR', 'Français', 'Europe/Paris', 'Paris', true),
('Sénégal', 'SEN', '+221', 'XOF', 'Français', 'Africa/Dakar', 'Dakar', true),
('Cameroun', 'CMR', '+237', 'XAF', 'Français', 'Africa/Douala', 'Yaoundé', true),
('Côte d''Ivoire', 'CIV', '+225', 'XOF', 'Français', 'Africa/Abidjan', 'Yamoussoukro', true),
('Mali', 'MLI', '+223', 'XOF', 'Français', 'Africa/Bamako', 'Bamako', true),
('Burkina Faso', 'BFA', '+226', 'XOF', 'Français', 'Africa/Ouagadougou', 'Ouagadougou', true),
('Niger', 'NER', '+227', 'XOF', 'Français', 'Africa/Niamey', 'Niamey', true),
('Tchad', 'TCD', '+235', 'XAF', 'Français', 'Africa/Ndjamena', 'N''Djamena', true),
('Guinée', 'GIN', '+224', 'GNF', 'Français', 'Africa/Conakry', 'Conakry', true),
('Bénin', 'BEN', '+229', 'XOF', 'Français', 'Africa/Porto-Novo', 'Porto-Novo', true),
('Togo', 'TGO', '+228', 'XOF', 'Français', 'Africa/Lome', 'Lomé', true),
('Gabon', 'GAB', '+241', 'XAF', 'Français', 'Africa/Libreville', 'Libreville', true),
('Congo', 'COG', '+242', 'XAF', 'Français', 'Africa/Brazzaville', 'Brazzaville', true),
('République Centrafricaine', 'CAF', '+236', 'XAF', 'Français', 'Africa/Bangui', 'Bangui', true),
('Comores', 'COM', '+269', 'KMF', 'Français', 'Indian/Comoro', 'Moroni', true),
('Madagascar', 'MDG', '+261', 'MGA', 'Français', 'Indian/Antananarivo', 'Antananarivo', true),
('Maurice', 'MUS', '+230', 'MUR', 'Français', 'Indian/Mauritius', 'Port Louis', true),
('Seychelles', 'SYC', '+248', 'SCR', 'Français', 'Indian/Mahe', 'Victoria', true),
('Djibouti', 'DJI', '+253', 'DJF', 'Français', 'Africa/Djibouti', 'Djibouti', true),
('Allemagne', 'DEU', '+49', 'EUR', 'Allemand', 'Europe/Berlin', 'Berlin', true)
ON CONFLICT (code_pays) DO UPDATE SET 
    nom = EXCLUDED.nom,
    code_appel = EXCLUDED.code_appel,
    devise = EXCLUDED.devise,
    langue_principale = EXCLUDED.langue_principale,
    fuseau_horaire = EXCLUDED.fuseau_horaire,
    capitale = EXCLUDED.capitale;

-- ============================================
-- 3. ANNÉES FISCALES (3)
-- ============================================

INSERT INTO fiscal_years (annee, date_debut, date_fin, budget_global, statut, libelle) VALUES
(2024, '2024-01-01', '2024-12-31', 5000000.00, 'FERMEE', 'FY24'),
(2025, '2025-01-01', '2025-12-31', 6000000.00, 'EN_COURS', 'FY25'),
(2026, '2026-01-01', '2026-12-31', 7000000.00, 'PLANIFIEE', 'FY26')
ON CONFLICT (annee) DO UPDATE SET 
    budget_global = EXCLUDED.budget_global,
    statut = EXCLUDED.statut;

-- ============================================
-- 4. TYPES D'OPPORTUNITÉS (5)
-- ============================================

INSERT INTO opportunity_types (name, nom, description, default_probability, default_duration_days, code, couleur, is_active) VALUES
('Audit', 'Audit', 'Mission d''audit comptable et financier', 80, 45, 'AUD', '#3498db', true),
('Conseil', 'Conseil', 'Mission de conseil en gestion', 70, 30, 'CONSEIL', '#3498db', true),
('Expertise', 'Expertise', 'Expertise comptable et fiscale', 75, 25, 'EXPERTISE', '#9b59b6', true),
('Consulting', 'Consulting', 'Consulting en organisation', 65, 40, 'CONSULTING', '#2ecc71', true),
('Formation', 'Formation', 'Formation professionnelle', 90, 15, 'FOM01', '#f39c12', true)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    nom = EXCLUDED.nom,
    description = EXCLUDED.description,
    default_probability = EXCLUDED.default_probability,
    default_duration_days = EXCLUDED.default_duration_days,
    couleur = EXCLUDED.couleur;

-- ============================================
-- 5. ACTIVITÉS INTERNES (4)
-- ============================================

INSERT INTO internal_activities (name, description, is_active) VALUES
('Congés annuel', 'Congés annuels', true),
('Congés Maladie', 'Congés Maladie', true),
('Recherches', 'Recherches diverses', true),
('Sollicitation Inter BU', 'Sollicitation Inter BU', true)
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description;

-- ============================================
-- 6. TÂCHES STANDARD (5)
-- ============================================

INSERT INTO tasks (code, libelle, description, duree_estimee, priorite, actif, obligatoire) VALUES
('AUDIT_COMPTES', 'Audit des comptes', 'Vérification et analyse des comptes clients', 40, 'HAUTE', true, false),
('FORMATION_EQUIPE', 'Formation de l''équipe', 'Formation du personnel client', 20, 'MOYENNE', true, false),
('ANALYSE_RISQUES', 'Analyse des risques', 'Évaluation des risques financiers', 28, 'HAUTE', true, false),
('CONTROLE_INTERNE', 'Contrôle interne', 'Mise en place de contrôles internes', 24, 'HAUTE', true, false),
('CONSEIL_STRATEGIE', 'Conseil en stratégie', 'Accompagnement stratégique du client', 32, 'HAUTE', true, false)
ON CONFLICT (code) DO UPDATE SET 
    libelle = EXCLUDED.libelle,
    description = EXCLUDED.description,
    duree_estimee = EXCLUDED.duree_estimee,
    priorite = EXCLUDED.priorite;

-- ============================================
-- VÉRIFICATION
-- ============================================

SELECT 
    (SELECT COUNT(*) FROM secteurs_activite) as secteurs,
    (SELECT COUNT(*) FROM pays) as pays,
    (SELECT COUNT(*) FROM fiscal_years) as annees_fiscales,
    (SELECT COUNT(*) FROM opportunity_types) as types_opportunites,
    (SELECT COUNT(*) FROM internal_activities) as activites_internes,
    (SELECT COUNT(*) FROM tasks) as taches;






