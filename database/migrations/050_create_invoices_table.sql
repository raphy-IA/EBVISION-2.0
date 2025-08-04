-- Migration pour créer la table des factures
-- Date: 2024-01-15

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_facture VARCHAR(50) UNIQUE NOT NULL,
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Informations de base
    date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
    date_echeance DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'BROUILLON', -- BROUILLON, EMISE, PAYEE, ANNULEE
    
    -- Montants
    montant_ht DECIMAL(15,2) NOT NULL DEFAULT 0,
    montant_tva DECIMAL(15,2) NOT NULL DEFAULT 0,
    montant_ttc DECIMAL(15,2) NOT NULL DEFAULT 0,
    montant_paye DECIMAL(15,2) NOT NULL DEFAULT 0,
    montant_restant DECIMAL(15,2) GENERATED ALWAYS AS (montant_ttc - montant_paye) STORED,
    
    -- Conditions de paiement
    conditions_paiement TEXT,
    taux_tva DECIMAL(5,2) DEFAULT 19.25, -- Taux de TVA par défaut
    
    -- Informations de facturation
    adresse_facturation TEXT,
    notes_facture TEXT,
    
    -- Suivi des paiements
    date_premier_paiement DATE,
    date_dernier_paiement DATE,
    nombre_paiements INTEGER DEFAULT 0,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_invoices_mission_id ON invoices(mission_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_statut ON invoices(statut);
CREATE INDEX idx_invoices_date_emission ON invoices(date_emission);
CREATE INDEX idx_invoices_date_echeance ON invoices(date_echeance);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

-- Table pour les lignes de facture
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Description de la ligne
    description TEXT NOT NULL,
    quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
    unite VARCHAR(20) DEFAULT 'heure', -- heure, jour, piece, etc.
    prix_unitaire DECIMAL(15,2) NOT NULL,
    
    -- Calculs
    montant_ht DECIMAL(15,2) GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,
    taux_tva DECIMAL(5,2) DEFAULT 19.25,
    montant_tva DECIMAL(15,2) GENERATED ALWAYS AS (montant_ht * taux_tva / 100) STORED,
    montant_ttc DECIMAL(15,2) GENERATED ALWAYS AS (montant_ht + montant_tva) STORED,
    
    -- Référence à la tâche si applicable
    task_id UUID REFERENCES tasks(id),
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les lignes de facture
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_task_id ON invoice_items(task_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER trigger_update_invoice_items_updated_at
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

-- Table pour les paiements
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Informations du paiement
    numero_paiement VARCHAR(50),
    date_paiement DATE NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    mode_paiement VARCHAR(50) NOT NULL, -- ESPECES, VIREMENT, CHEQUE, CARTE
    reference_paiement VARCHAR(100), -- Numéro de chèque, référence virement, etc.
    
    -- Statut du paiement
    statut VARCHAR(20) DEFAULT 'EN_ATTENTE', -- EN_ATTENTE, VALIDE, REJETE
    
    -- Notes
    notes TEXT,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Index pour les paiements
CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_date_paiement ON invoice_payments(date_paiement);
CREATE INDEX idx_invoice_payments_statut ON invoice_payments(statut);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER trigger_update_invoice_payments_updated_at
    BEFORE UPDATE ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

-- Fonction pour calculer automatiquement les montants de la facture
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour les montants de la facture basés sur les lignes
    UPDATE invoices 
    SET 
        montant_ht = COALESCE((
            SELECT SUM(montant_ht) 
            FROM invoice_items 
            WHERE invoice_id = NEW.invoice_id
        ), 0),
        montant_tva = COALESCE((
            SELECT SUM(montant_tva) 
            FROM invoice_items 
            WHERE invoice_id = NEW.invoice_id
        ), 0),
        montant_ttc = COALESCE((
            SELECT SUM(montant_ttc) 
            FROM invoice_items 
            WHERE invoice_id = NEW.invoice_id
        ), 0)
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour recalculer les totaux
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

-- Fonction pour mettre à jour les informations de paiement de la facture
CREATE OR REPLACE FUNCTION update_invoice_payment_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour les informations de paiement de la facture
    UPDATE invoices 
    SET 
        montant_paye = COALESCE((
            SELECT SUM(montant) 
            FROM invoice_payments 
            WHERE invoice_id = NEW.invoice_id AND statut = 'VALIDE'
        ), 0),
        date_premier_paiement = (
            SELECT MIN(date_paiement) 
            FROM invoice_payments 
            WHERE invoice_id = NEW.invoice_id AND statut = 'VALIDE'
        ),
        date_dernier_paiement = (
            SELECT MAX(date_paiement) 
            FROM invoice_payments 
            WHERE invoice_id = NEW.invoice_id AND statut = 'VALIDE'
        ),
        nombre_paiements = (
            SELECT COUNT(*) 
            FROM invoice_payments 
            WHERE invoice_id = NEW.invoice_id AND statut = 'VALIDE'
        )
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour les informations de paiement
CREATE TRIGGER trigger_update_invoice_payment_info_insert
    AFTER INSERT ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_info();

CREATE TRIGGER trigger_update_invoice_payment_info_update
    AFTER UPDATE ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_info();

CREATE TRIGGER trigger_update_invoice_payment_info_delete
    AFTER DELETE ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_info();

-- Séquence pour générer automatiquement les numéros de facture
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq
    START WITH 1
    INCREMENT BY 1
    NO CYCLE;

-- Fonction pour générer automatiquement le numéro de facture
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_facture IS NULL OR NEW.numero_facture = '' THEN
        NEW.numero_facture := 'FACT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement le numéro de facture
CREATE TRIGGER trigger_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number(); 