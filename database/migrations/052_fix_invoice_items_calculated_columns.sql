-- Migration pour corriger les colonnes calculées de invoice_items
-- Recréer la table avec les bonnes colonnes calculées

-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals_insert ON invoice_items;
DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals_update ON invoice_items;
DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals_delete ON invoice_items;
DROP TRIGGER IF EXISTS trigger_update_invoice_items_updated_at ON invoice_items;

-- Sauvegarder les données existantes
CREATE TEMP TABLE temp_invoice_items AS SELECT * FROM invoice_items;

-- Supprimer la table existante
DROP TABLE invoice_items;

-- Recréer la table avec les bonnes colonnes calculées
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Description de la ligne
    description TEXT NOT NULL,
    quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
    unite VARCHAR(20) DEFAULT 'heure', -- heure, jour, piece, etc.
    prix_unitaire DECIMAL(15,2) NOT NULL,
    
    -- Calculs (colonnes calculées)
    montant_ht DECIMAL(15,2) GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,
    taux_tva DECIMAL(5,2) DEFAULT 19.25,
    montant_tva DECIMAL(15,2) GENERATED ALWAYS AS ((quantite * prix_unitaire) * taux_tva / 100) STORED,
    montant_ttc DECIMAL(15,2) GENERATED ALWAYS AS ((quantite * prix_unitaire) + ((quantite * prix_unitaire) * taux_tva / 100)) STORED,
    
    -- Référence à la tâche si applicable
    task_id UUID REFERENCES tasks(id),
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recréer les index
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_task_id ON invoice_items(task_id);

-- Recréer le trigger pour updated_at
CREATE TRIGGER trigger_update_invoice_items_updated_at
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

-- Recréer les triggers pour calculer les totaux de facture
CREATE TRIGGER trigger_calculate_invoice_totals_insert
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

CREATE TRIGGER trigger_calculate_invoice_totals_update
    AFTER UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

CREATE TRIGGER trigger_calculate_invoice_totals_delete
    AFTER DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- Restaurer les données
INSERT INTO invoice_items (
    id, invoice_id, description, quantite, unite, prix_unitaire, taux_tva, task_id, created_at, updated_at
)
SELECT 
    id, invoice_id, description, quantite, unite, prix_unitaire, taux_tva, task_id, created_at, updated_at
FROM temp_invoice_items;

-- Supprimer la table temporaire
DROP TABLE temp_invoice_items; 