-- Migration 019: Création de la table opportunities
-- Date: 2025-07-20

-- Création de la table opportunities
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'NOUVELLE' CHECK (statut IN ('NOUVELLE', 'EN_COURS', 'GAGNEE', 'PERDUE', 'ANNULEE')),
    type_opportunite VARCHAR(100),
    source VARCHAR(100),
    probabilite INTEGER DEFAULT 0 CHECK (probabilite >= 0 AND probabilite <= 100),
    montant_estime DECIMAL(15,2),
    devise VARCHAR(5) DEFAULT 'FCFA',
    date_fermeture_prevue DATE,
    date_fermeture_reelle DATE,
    etape_vente VARCHAR(50) DEFAULT 'PROSPECTION' CHECK (etape_vente IN ('PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TRIGGER update_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunities_updated_at();

-- Données de test
INSERT INTO opportunities (
    id, nom, description, client_id, collaborateur_id, statut,
    type_opportunite, source, probabilite, montant_estime, devise,
    date_fermeture_prevue, etape_vente, notes
) VALUES 
(
    gen_random_uuid(),
    'Opportunité Test 1',
    'Description de test 1',
    (SELECT id FROM clients LIMIT 1),
    (SELECT id FROM collaborateurs LIMIT 1),
    'NOUVELLE',
    'VENTE',
    'REFERRAL',
    25,
    50000.00,
    'FCFA',
    CURRENT_DATE + INTERVAL '30 days',
    'PROSPECTION',
    'Note de test 1'
),
(
    gen_random_uuid(),
    'Opportunité Test 2',
    'Description de test 2',
    (SELECT id FROM clients LIMIT 1),
    (SELECT id FROM collaborateurs LIMIT 1),
    'EN_COURS',
    'SERVICE',
    'WEBSITE',
    50,
    75000.00,
    'FCFA',
    CURRENT_DATE + INTERVAL '45 days',
    'QUALIFICATION',
    'Note de test 2'
),
(
    gen_random_uuid(),
    'Opportunité Test 3',
    'Description de test 3',
    (SELECT id FROM clients LIMIT 1),
    (SELECT id FROM collaborateurs LIMIT 1),
    'GAGNEE',
    'CONSULTING',
    'PARTENAIRE',
    100,
    120000.00,
    'FCFA',
    CURRENT_DATE - INTERVAL '5 days',
    'FERMETURE',
    'Note de test 3'
);

-- Mise à jour des statistiques des clients
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
        AND statut = 'GAGNEE'
    )
WHERE id IN (SELECT DISTINCT client_id FROM opportunities); 