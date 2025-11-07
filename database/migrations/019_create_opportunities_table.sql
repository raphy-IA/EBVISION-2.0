-- Migration 019: Création/Mise à jour de la table opportunities
-- Date: 2025-07-20

-- Création de la table opportunities si elle n'existe pas
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    prospect_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    montant_estime DECIMAL(15,2) NOT NULL DEFAULT 0,
    probabilite INTEGER NOT NULL DEFAULT 50 CHECK (probabilite >= 0 AND probabilite <= 100),
    date_creation DATE NOT NULL,
    date_fermeture_prevue DATE,
    date_fermeture_reelle DATE,
    source VARCHAR(100),
    statut VARCHAR(20) NOT NULL DEFAULT 'OUVERTE' CHECK (statut IN ('OUVERTE', 'GAGNEE', 'PERDUE', 'FERMEE')),
    responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter les colonnes manquantes si elles n'existent pas
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS type_opportunite VARCHAR(100);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS devise VARCHAR(5) DEFAULT 'FCFA';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS etape_vente VARCHAR(50) DEFAULT 'PROSPECTION';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Modifier le statut pour accepter plus de valeurs
DO $$
BEGIN
    -- Supprimer l'ancienne contrainte si elle existe
    ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_statut_check;
    
    -- Ajouter la nouvelle contrainte
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_opportunities_statut'
    ) THEN
        ALTER TABLE opportunities ADD CONSTRAINT chk_opportunities_statut 
            CHECK (statut IN ('NOUVELLE', 'EN_COURS', 'GAGNEE', 'PERDUE', 'ANNULEE', 'OUVERTE', 'FERMEE'));
    END IF;
END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_opportunities_client_id ON opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_collaborateur_id ON opportunities(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_statut ON opportunities(statut);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_date_fermeture_prevue ON opportunities(date_fermeture_prevue);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_opportunities_updated_at ON opportunities;
CREATE TRIGGER update_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunities_updated_at();

-- Données de test (seulement si des clients et collaborateurs existent)
DO $$
DECLARE
    v_client_id UUID;
    v_collaborateur_id UUID;
BEGIN
    -- Récupérer un client et un collaborateur s'ils existent
    SELECT id INTO v_client_id FROM clients LIMIT 1;
    SELECT id INTO v_collaborateur_id FROM collaborateurs LIMIT 1;
    
    -- Insérer les données de test seulement si on a trouvé un client
    IF v_client_id IS NOT NULL THEN
        INSERT INTO opportunities (
            id, nom, description, client_id, collaborateur_id, statut,
            type_opportunite, source, probabilite, montant_estime, devise,
            date_fermeture_prevue, date_creation, etape_vente, notes
        ) 
        SELECT * FROM (VALUES 
            (
                gen_random_uuid(),
                'Opportunité Test 1',
                'Description de test 1',
                v_client_id,
                v_collaborateur_id,
                'NOUVELLE',
                'VENTE',
                'REFERRAL',
                25,
                50000.00,
                'FCFA',
                CURRENT_DATE + INTERVAL '30 days',
                CURRENT_DATE,
                'PROSPECTION',
                'Note de test 1'
            ),
            (
                gen_random_uuid(),
                'Opportunité Test 2',
                'Description de test 2',
                v_client_id,
                v_collaborateur_id,
                'EN_COURS',
                'SERVICE',
                'WEBSITE',
                50,
                75000.00,
                'FCFA',
                CURRENT_DATE + INTERVAL '45 days',
                CURRENT_DATE,
                'QUALIFICATION',
                'Note de test 2'
            ),
            (
                gen_random_uuid(),
                'Opportunité Test 3',
                'Description de test 3',
                v_client_id,
                v_collaborateur_id,
                'GAGNEE',
                'CONSULTING',
                'PARTENAIRE',
                100,
                120000.00,
                'FCFA',
                CURRENT_DATE - INTERVAL '5 days',
                CURRENT_DATE - INTERVAL '10 days',
                'FERMETURE',
                'Note de test 3'
            )
        ) AS t(id, nom, description, client_id, collaborateur_id, statut, type_opportunite, source, probabilite, montant_estime, devise, date_fermeture_prevue, date_creation, etape_vente, notes)
        WHERE NOT EXISTS (
            SELECT 1 FROM opportunities WHERE nom IN ('Opportunité Test 1', 'Opportunité Test 2', 'Opportunité Test 3')
        );
        
        RAISE NOTICE 'Données de test insérées pour opportunities';
    ELSE
        RAISE NOTICE 'Pas de clients disponibles, insertion de données de test ignorée';
    END IF;
END $$;

-- Mise à jour des statistiques des clients (seulement si les colonnes existent)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'nombre_opportunites'
    ) THEN
        UPDATE clients SET 
            nombre_opportunites = (
                SELECT COUNT(*) 
                FROM opportunities 
                WHERE opportunities.client_id = clients.id
            ),
            chiffre_affaires_total = (
                SELECT COALESCE(SUM(montant_estime), 0)
                FROM opportunities 
                WHERE opportunities.client_id = clients.id 
                AND statut IN ('GAGNEE', 'FERMEE')
            )
        WHERE id IN (SELECT DISTINCT client_id FROM opportunities WHERE client_id IS NOT NULL);
    END IF;
END $$; 