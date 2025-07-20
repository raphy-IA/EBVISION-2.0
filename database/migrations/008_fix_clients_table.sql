-- Migration 008: Correction de la table clients
-- Date: 2025-07-18

-- Vérifier si la table clients existe et ajouter les colonnes manquantes
DO $$
BEGIN
    -- Ajouter la colonne collaborateur_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'collaborateur_id'
    ) THEN
        ALTER TABLE clients ADD COLUMN collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;
    END IF;

    -- Ajouter la colonne created_by si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE clients ADD COLUMN created_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL;
    END IF;

    -- Ajouter la colonne updated_by si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE clients ADD COLUMN updated_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL;
    END IF;

    -- Ajouter la colonne date_derniere_activite si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'date_derniere_activite'
    ) THEN
        ALTER TABLE clients ADD COLUMN date_derniere_activite TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Ajouter la colonne source_prospection si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'source_prospection'
    ) THEN
        ALTER TABLE clients ADD COLUMN source_prospection VARCHAR(100);
    END IF;

    -- Ajouter la colonne taille_entreprise si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'taille_entreprise'
    ) THEN
        ALTER TABLE clients ADD COLUMN taille_entreprise VARCHAR(50);
    END IF;

    -- Ajouter la colonne email si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'email'
    ) THEN
        ALTER TABLE clients ADD COLUMN email VARCHAR(255);
    END IF;

    -- Ajouter la colonne telephone si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'telephone'
    ) THEN
        ALTER TABLE clients ADD COLUMN telephone VARCHAR(50);
    END IF;

    -- Ajouter la colonne ville si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'ville'
    ) THEN
        ALTER TABLE clients ADD COLUMN ville VARCHAR(100);
    END IF;

    -- Ajouter la colonne code_postal si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'code_postal'
    ) THEN
        ALTER TABLE clients ADD COLUMN code_postal VARCHAR(20);
    END IF;

    -- Ajouter la colonne pays si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'pays'
    ) THEN
        ALTER TABLE clients ADD COLUMN pays VARCHAR(100) DEFAULT 'France';
    END IF;

    -- Ajouter la colonne notes si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'notes'
    ) THEN
        ALTER TABLE clients ADD COLUMN notes TEXT;
    END IF;

    -- Renommer la colonne raison_sociale en nom si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'raison_sociale'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'nom'
    ) THEN
        ALTER TABLE clients RENAME COLUMN raison_sociale TO nom;
    END IF;

    -- Ajouter la colonne nom si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'nom'
    ) THEN
        ALTER TABLE clients ADD COLUMN nom VARCHAR(255);
    END IF;

    -- Rendre la colonne nom NOT NULL si elle ne l'est pas déjà
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'nom' AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE clients ALTER COLUMN nom SET NOT NULL;
    END IF;

    -- Ajouter la colonne description si elle n'existe pas (pour les missions)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'description'
    ) THEN
        ALTER TABLE missions ADD COLUMN description TEXT;
    END IF;

    -- Ajouter la colonne type_mission si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'type_mission'
    ) THEN
        ALTER TABLE missions ADD COLUMN type_mission VARCHAR(100);
    END IF;

    -- Ajouter la colonne priorite si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'priorite'
    ) THEN
        ALTER TABLE missions ADD COLUMN priorite VARCHAR(20) DEFAULT 'normale';
    END IF;

    -- Ajouter la colonne notes si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'notes'
    ) THEN
        ALTER TABLE missions ADD COLUMN notes TEXT;
    END IF;

    -- Ajouter la colonne created_by si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE missions ADD COLUMN created_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL;
    END IF;

    -- Ajouter la colonne updated_by si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE missions ADD COLUMN updated_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL;
    END IF;

END $$;

-- Créer les index manquants
CREATE INDEX IF NOT EXISTS idx_clients_statut ON clients(statut);
CREATE INDEX IF NOT EXISTS idx_clients_collaborateur ON clients(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_clients_date_creation ON clients(date_creation);
CREATE INDEX IF NOT EXISTS idx_missions_client ON missions(client_id);
CREATE INDEX IF NOT EXISTS idx_missions_statut ON missions(statut);
CREATE INDEX IF NOT EXISTS idx_missions_division ON missions(division_id);
CREATE INDEX IF NOT EXISTS idx_missions_responsable ON missions(responsable_id);
CREATE INDEX IF NOT EXISTS idx_missions_dates ON missions(date_debut, date_fin_prevue);

-- Insérer des données de test si les tables sont vides
INSERT INTO clients (nom, email, telephone, ville, secteur_activite, statut, source_prospection) 
SELECT * FROM (VALUES 
    ('Entreprise ABC', 'contact@abc.fr', '01 23 45 67 89', 'Paris', 'Technologie', 'client', 'recommandation'),
    ('Startup XYZ', 'hello@xyz.com', '04 56 78 90 12', 'Lyon', 'Finance', 'prospect', 'salon'),
    ('Groupe DEF', 'info@def.com', '02 34 56 78 90', 'Marseille', 'Industrie', 'client_fidele', 'web'),
    ('PME GHI', 'contact@ghi.fr', '03 45 67 89 01', 'Toulouse', 'Services', 'prospect', 'salon'),
    ('Corporation JKL', 'info@jkl.com', '05 67 89 01 23', 'Nantes', 'Logistique', 'client', 'recommandation')
) AS v(nom, email, telephone, ville, secteur_activite, statut, source_prospection)
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE clients.nom = v.nom);

COMMIT; 