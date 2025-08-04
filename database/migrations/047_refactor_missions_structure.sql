-- Migration 047: Refactorisation de la structure de la table missions
-- Date: 2025-08-03
-- Description: Modification de la structure missions selon les nouvelles spécifications métier

-- 1. Ajouter les nouvelles colonnes
ALTER TABLE missions ADD COLUMN IF NOT EXISTS associe_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;

-- 2. Supprimer les colonnes de devise séparées (si elles existent)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'devise_honoraires') THEN
        ALTER TABLE missions DROP COLUMN devise_honoraires;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'devise_debours') THEN
        ALTER TABLE missions DROP COLUMN devise_debours;
    END IF;
END $$;

-- 3. Renommer la colonne devise pour clarifier qu'elle est globale
-- (On garde la colonne devise existante qui devient la devise globale)

-- 4. Créer les index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_missions_associe_id ON missions(associe_id);
CREATE INDEX IF NOT EXISTS idx_missions_business_unit_id ON missions(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_missions_division_id ON missions(division_id);

-- 5. Mettre à jour les colonnes existantes pour clarifier leur rôle
-- budget_estime reste tel quel (vient de l'opportunité)
-- budget_reel sera calculé automatiquement (honoraires + débours)
-- devise devient la devise globale unique

-- 6. Ajouter des contraintes pour s'assurer que les données sont cohérentes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_budget_reel') THEN
        ALTER TABLE missions ADD CONSTRAINT check_budget_reel CHECK (budget_reel >= 0);
    END IF;
END $$;

-- 7. Mettre à jour les valeurs par défaut
ALTER TABLE missions ALTER COLUMN devise SET DEFAULT 'XAF';
ALTER TABLE missions ALTER COLUMN statut SET DEFAULT 'PLANIFIEE';
ALTER TABLE missions ALTER COLUMN priorite SET DEFAULT 'NORMALE';

-- 8. Créer une fonction pour calculer automatiquement le budget réel
CREATE OR REPLACE FUNCTION calculate_budget_reel()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculer le budget réel comme somme des honoraires et débours
    NEW.budget_reel = COALESCE(NEW.montant_honoraires, 0) + COALESCE(NEW.montant_debours, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Créer un trigger pour calculer automatiquement le budget réel
DROP TRIGGER IF EXISTS trigger_calculate_budget_reel ON missions;
CREATE TRIGGER trigger_calculate_budget_reel
    BEFORE INSERT OR UPDATE ON missions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_budget_reel();

-- 10. Mettre à jour la date de fin réelle quand le statut passe à TERMINEE
CREATE OR REPLACE FUNCTION update_date_fin_reelle()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.statut = 'TERMINEE' AND OLD.statut != 'TERMINEE' THEN
        NEW.date_fin_reelle = CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Créer un trigger pour mettre à jour la date de fin réelle
DROP TRIGGER IF EXISTS trigger_update_date_fin_reelle ON missions;
CREATE TRIGGER trigger_update_date_fin_reelle
    BEFORE UPDATE ON missions
    FOR EACH ROW
    EXECUTE FUNCTION update_date_fin_reelle(); 