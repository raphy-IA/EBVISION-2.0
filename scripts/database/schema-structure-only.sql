--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: calculate_budget_reel(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_budget_reel() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Calculer le budget réel comme somme des honoraires et débours
    NEW.budget_reel = COALESCE(NEW.montant_honoraires, 0) + COALESCE(NEW.montant_debours, 0);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.calculate_budget_reel() OWNER TO postgres;

--
-- Name: calculate_evaluation_score(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_evaluation_score(p_evaluation_id integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_score DECIMAL(5, 2);
    v_scoring_method VARCHAR(50);
BEGIN
    -- Récupérer la méthode de scoring
    SELECT et.scoring_method
    INTO v_scoring_method
    FROM evaluations e
    JOIN evaluation_campaigns ec ON e.campaign_id = ec.id
    JOIN evaluation_templates et ON ec.template_id = et.id
    WHERE e.id = p_evaluation_id;
    
    -- Calculer selon la méthode
    IF v_scoring_method = 'SIMPLE_AVERAGE' THEN
        SELECT AVG(achievement_rate)
        INTO v_score
        FROM evaluation_objective_scores
        WHERE evaluation_id = p_evaluation_id;
    ELSIF v_scoring_method = 'WEIGHTED_AVERAGE' THEN
        SELECT SUM(eos.achievement_rate * io.weight) / SUM(io.weight)
        INTO v_score
        FROM evaluation_objective_scores eos
        JOIN individual_objectives io ON eos.individual_objective_id = io.id
        WHERE eos.evaluation_id = p_evaluation_id;
    ELSE
        -- Par défaut, moyenne simple
        SELECT AVG(achievement_rate)
        INTO v_score
        FROM evaluation_objective_scores
        WHERE evaluation_id = p_evaluation_id;
    END IF;
    
    RETURN COALESCE(v_score, 0);
END;
$$;


ALTER FUNCTION public.calculate_evaluation_score(p_evaluation_id integer) OWNER TO postgres;

--
-- Name: calculate_evaluation_score_rate(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_evaluation_score_rate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.achievement_rate := CASE 
        WHEN NEW.target_value > 0 THEN (NEW.achieved_value / NEW.target_value * 100)
        ELSE 0
    END;
    
    -- Déterminer automatiquement le rating
    IF NEW.achievement_rate >= 120 THEN
        NEW.rating := 'EXCEEDED';
    ELSIF NEW.achievement_rate >= 100 THEN
        NEW.rating := 'ACHIEVED';
    ELSIF NEW.achievement_rate >= 70 THEN
        NEW.rating := 'PARTIALLY_ACHIEVED';
    ELSE
        NEW.rating := 'NOT_ACHIEVED';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.calculate_evaluation_score_rate() OWNER TO postgres;

--
-- Name: calculate_global_budget(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_global_budget(p_fiscal_year_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_budget DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(go.target_value), 0)
    INTO v_total_budget
    FROM global_objectives go
    JOIN objective_types ot ON go.objective_type_id = ot.id
    WHERE go.fiscal_year_id = p_fiscal_year_id
    AND ot.is_financial = TRUE
    AND ot.code = 'CA'; -- Seulement le CA pour le budget global
    
    RETURN v_total_budget;
END;
$$;


ALTER FUNCTION public.calculate_global_budget(p_fiscal_year_id uuid) OWNER TO postgres;

--
-- Name: calculate_invoice_totals(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_invoice_totals() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    invoice_id_param UUID;
    total_ht DECIMAL(15,2) := 0;
    total_tva DECIMAL(15,2) := 0;
    total_ttc DECIMAL(15,2) := 0;
BEGIN
    -- Déterminer l'ID de la facture
    IF TG_OP = 'DELETE' THEN
        invoice_id_param := OLD.invoice_id;
    ELSE
        invoice_id_param := NEW.invoice_id;
    END IF;
    
    -- Calculer les totaux à partir des lignes de facture
    SELECT 
        COALESCE(SUM(montant_ht), 0),
        COALESCE(SUM(montant_tva), 0),
        COALESCE(SUM(montant_ttc), 0)
    INTO total_ht, total_tva, total_ttc
    FROM invoice_items 
    WHERE invoice_id = invoice_id_param;
    
    -- Mettre à jour la facture
    UPDATE invoices 
    SET 
        montant_ht = total_ht,
        montant_tva = total_tva,
        montant_ttc = total_ttc,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = invoice_id_param;
    
    -- Retourner le bon record selon l'opération
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION public.calculate_invoice_totals() OWNER TO postgres;

--
-- Name: calculate_objective_progress_rate(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_objective_progress_rate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.achievement_rate := CASE 
        WHEN NEW.target_value > 0 THEN (NEW.current_value / NEW.target_value * 100)
        ELSE 0
    END;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.calculate_objective_progress_rate() OWNER TO postgres;

--
-- Name: check_user_has_at_least_one_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_user_has_at_least_one_role() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Vérifier si l'utilisateur a au moins un rôle après la suppression
    IF NOT EXISTS (
        SELECT 1 
        FROM user_roles 
        WHERE user_id = OLD.user_id
    ) THEN
        RAISE EXCEPTION 'Un utilisateur doit avoir au moins un rôle';
    END IF;
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION public.check_user_has_at_least_one_role() OWNER TO postgres;

--
-- Name: create_opportunity_stages(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_opportunity_stages(opp_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
            DECLARE
                stage_record RECORD;
                stage_counter INTEGER := 0;
            BEGIN
                -- Supprimer les étapes existantes si elles existent
                DELETE FROM opportunity_stages WHERE opportunity_id = opp_id;
                
                -- Créer les étapes par défaut
                FOR stage_record IN 
                    SELECT 
                        ost.id as template_id,
                        ost.stage_name,
                        ost.stage_order,
                        ost.description,
                        ost.required_documents,
                        ost.required_actions,
                        ost.max_duration_days,
                        ost.min_duration_days,
                        ost.validation_required
                    FROM opportunity_stage_templates ost
                    INNER JOIN opportunities o ON o.opportunity_type_id = ost.opportunity_type_id
                    WHERE o.id = opp_id
                    ORDER BY ost.stage_order
                LOOP
                    stage_counter := stage_counter + 1;
                    
                    
                END LOOP;
                
                -- Si aucun template trouvé, créer des étapes par défaut sans stage_template_id
                IF stage_counter = 0 THEN
                    -- Créer un template temporaire pour éviter l'erreur NOT NULL
                    
                    
                    -- Récupérer l'ID du template créé
                    
                END IF;
            END;
            $$;


ALTER FUNCTION public.create_opportunity_stages(opp_id uuid) OWNER TO postgres;

--
-- Name: create_time_sheet_if_not_exists(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_time_sheet_if_not_exists(p_collaborateur_id uuid, p_semaine integer, p_annee integer) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_time_sheet_id UUID;
    v_date_debut DATE;
    v_date_fin DATE;
BEGIN
    -- Vérifier si la feuille existe déjà
    SELECT id INTO v_time_sheet_id
    FROM time_sheets
    WHERE collaborateur_id = p_collaborateur_id 
    AND semaine = p_semaine 
    AND annee = p_annee;
    
    -- Si elle n'existe pas, la créer
    IF v_time_sheet_id IS NULL THEN
        -- Calculer les dates de début et fin de semaine
        SELECT date_debut, date_fin INTO v_date_debut, v_date_fin
        FROM get_week_dates(p_semaine, p_annee);
        
        
    END IF;
    
    RETURN v_time_sheet_id;
END;
$$;


ALTER FUNCTION public.create_time_sheet_if_not_exists(p_collaborateur_id uuid, p_semaine integer, p_annee integer) OWNER TO postgres;

--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_invoice_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                IF NEW.numero_facture IS NULL OR NEW.numero_facture = '' THEN
                    NEW.numero_facture := 'FACT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
                END IF;
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.generate_invoice_number() OWNER TO postgres;

--
-- Name: get_iso_week(date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_iso_week(date_input date) RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN EXTRACT(WEEK FROM date_input);
END;
$$;


ALTER FUNCTION public.get_iso_week(date_input date) OWNER TO postgres;

--
-- Name: get_week_dates(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_week_dates(week_number integer, year_number integer) RETURNS TABLE(date_debut date, date_fin date)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        week_start::DATE as date_debut,
        (week_start + INTERVAL '6 days')::DATE as date_fin
    FROM (
        SELECT 
            DATE_TRUNC('week', TO_DATE(year_number || '-' || week_number || '-1', 'IYYY-IW-ID')) + INTERVAL '1 day' as week_start
    ) as week_calc;
END;
$$;


ALTER FUNCTION public.get_week_dates(week_number integer, year_number integer) OWNER TO postgres;

--
-- Name: sync_time_entries_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_time_entries_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Mettre à jour le statut de toutes les entrées de la feuille de temps
    UPDATE time_entries 
    SET statut = NEW.statut,
        updated_at = CURRENT_TIMESTAMP
    WHERE time_sheet_id = NEW.id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_time_entries_status() OWNER TO postgres;

--
-- Name: trigger_create_opportunity_stages(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_create_opportunity_stages() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM create_opportunity_stages(NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_create_opportunity_stages() OWNER TO postgres;

--
-- Name: update_bank_accounts_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_bank_accounts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_bank_accounts_updated_at() OWNER TO postgres;

--
-- Name: update_date_fin_reelle(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_date_fin_reelle() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.statut = 'TERMINEE' AND OLD.statut != 'TERMINEE' THEN
        NEW.date_fin_reelle = CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_date_fin_reelle() OWNER TO postgres;

--
-- Name: update_depart_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_depart_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_depart_updated_at() OWNER TO postgres;

--
-- Name: update_evaluation_global_score(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_evaluation_global_score() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE evaluations
    SET global_score = calculate_evaluation_score(NEW.evaluation_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.evaluation_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_evaluation_global_score() OWNER TO postgres;

--
-- Name: update_evolution_organisations_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_evolution_organisations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_evolution_organisations_updated_at() OWNER TO postgres;

--
-- Name: update_invoice_items_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_invoice_items_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.update_invoice_items_updated_at() OWNER TO postgres;

--
-- Name: update_invoice_payment_amounts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_invoice_payment_amounts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    target_invoice_id UUID;
    total_allocated DECIMAL(15,2);
    invoice_total DECIMAL(15,2);
BEGIN
    -- Déterminer l'invoice_id concernée
    IF TG_OP = 'DELETE' THEN
        target_invoice_id := OLD.invoice_id;
    ELSE
        target_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Calculer le total payé pour cette facture
    SELECT COALESCE(SUM(allocated_amount), 0)
    INTO total_allocated
    FROM payment_allocations
    WHERE invoice_id = target_invoice_id;
    
    -- Récupérer le montant TTC de la facture
    SELECT montant_ttc
    INTO invoice_total
    FROM invoices
    WHERE id = target_invoice_id;
    
    -- Mettre à jour montant_paye (montant_restant est généré automatiquement)
    UPDATE invoices
    SET 
        montant_paye = total_allocated,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_invoice_id;
    
    -- Mettre à jour le workflow_status si la facture est EMISE
    UPDATE invoices
    SET workflow_status = CASE
        WHEN total_allocated >= invoice_total THEN 'PAYEE'
        WHEN total_allocated > 0 THEN 'PAYEE_PARTIELLEMENT'
        ELSE workflow_status
    END
    WHERE id = target_invoice_id 
      AND workflow_status IN ('EMISE', 'PAYEE_PARTIELLEMENT');
    
    -- Retourner la ligne appropriée
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION public.update_invoice_payment_amounts() OWNER TO postgres;

--
-- Name: update_invoice_payment_info(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_invoice_payment_info() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
            $$;


ALTER FUNCTION public.update_invoice_payment_info() OWNER TO postgres;

--
-- Name: update_invoice_payments_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_invoice_payments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.update_invoice_payments_updated_at() OWNER TO postgres;

--
-- Name: update_invoices_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_invoices_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_invoices_updated_at() OWNER TO postgres;

--
-- Name: update_missions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_missions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.update_missions_updated_at() OWNER TO postgres;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- Name: update_notification_settings_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_notification_settings_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
                    BEGIN
                        NEW.updated_at = CURRENT_TIMESTAMP;
                        RETURN NEW;
                    END;
                    $$;


ALTER FUNCTION public.update_notification_settings_timestamp() OWNER TO postgres;

--
-- Name: update_opportunities_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_opportunities_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.update_opportunities_updated_at() OWNER TO postgres;

--
-- Name: update_opportunity_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_opportunity_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
                    BEGIN
                        UPDATE opportunities 
                        SET last_activity_at = CURRENT_TIMESTAMP
                        WHERE id = NEW.opportunity_id;
                        RETURN NEW;
                    END;
                    $$;


ALTER FUNCTION public.update_opportunity_activity() OWNER TO postgres;

--
-- Name: update_opportunity_stages_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_opportunity_stages_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_opportunity_stages_updated_at() OWNER TO postgres;

--
-- Name: update_payments_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_payments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_payments_updated_at() OWNER TO postgres;

--
-- Name: update_time_sheet_totals(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_time_sheet_totals() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_heures DECIMAL(10,2) := 0;
    v_total_chargeables DECIMAL(10,2) := 0;
    v_total_non_chargeables DECIMAL(10,2) := 0;
BEGIN
    -- Calculer les totaux
    SELECT 
        COALESCE(SUM(total_heures), 0),
        COALESCE(SUM(CASE WHEN type_saisie = 'MISSION' THEN total_heures ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type_saisie = 'ACTIVITE' THEN total_heures ELSE 0 END), 0)
    INTO v_total_heures, v_total_chargeables, v_total_non_chargeables
    FROM time_entries_detailed
    WHERE time_sheet_id = NEW.time_sheet_id;
    
    -- Mettre à jour la feuille de temps
    UPDATE time_sheets 
    SET 
        total_heures = v_total_heures,
        total_heures_chargeables = v_total_chargeables,
        total_heures_non_chargeables = v_total_non_chargeables,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.time_sheet_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_time_sheet_totals() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: update_validation_companies_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_validation_companies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.update_validation_companies_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(100) NOT NULL,
    description text,
    business_unit_id uuid NOT NULL,
    type_activite character varying(50) DEFAULT 'ADMINISTRATIF'::character varying NOT NULL,
    obligatoire boolean DEFAULT false,
    actif boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT activities_type_activite_check CHECK (((type_activite)::text = ANY (ARRAY[('ADMINISTRATIF'::character varying)::text, ('FORMATION'::character varying)::text, ('CONGE'::character varying)::text, ('MALADIE'::character varying)::text, ('FERIE'::character varying)::text, ('DEPLACEMENT'::character varying)::text, ('AUTRE'::character varying)::text])))
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    business_unit_id uuid NOT NULL,
    financial_institution_id uuid NOT NULL,
    account_number character varying(50) NOT NULL,
    account_name character varying(100) NOT NULL,
    iban character varying(34),
    currency character varying(3) DEFAULT 'XAF'::character varying,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: TABLE bank_accounts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.bank_accounts IS 'Comptes bancaires par Business Unit';


--
-- Name: COLUMN bank_accounts.account_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_accounts.account_number IS 'Numéro de compte bancaire';


--
-- Name: COLUMN bank_accounts.iban; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_accounts.iban IS 'IBAN (optionnel, pour virements internationaux)';


--
-- Name: COLUMN bank_accounts.is_default; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_accounts.is_default IS 'Compte par défaut pour cette BU (un seul par BU)';


--
-- Name: bu_financial_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bu_financial_settings (
    id integer NOT NULL,
    business_unit_id uuid NOT NULL,
    invoice_prefix character varying(20),
    invoice_start_number integer DEFAULT 1,
    invoice_footer text,
    invoice_template character varying(20) DEFAULT 'FEES'::character varying,
    active_tax_ids jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bu_financial_settings OWNER TO postgres;

--
-- Name: bu_financial_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bu_financial_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bu_financial_settings_id_seq OWNER TO postgres;

--
-- Name: bu_financial_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bu_financial_settings_id_seq OWNED BY public.bu_financial_settings.id;


--
-- Name: business_unit_objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_unit_objectives (
    id integer NOT NULL,
    global_objective_id integer,
    business_unit_id uuid,
    target_value numeric(15,2) NOT NULL,
    description text,
    weight numeric(5,2) DEFAULT 1.00,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tracking_type character varying(20) DEFAULT 'MANUAL'::character varying,
    metric_code character varying(50),
    parent_global_objective_id integer,
    is_cascaded boolean DEFAULT false,
    objective_mode character varying(20) DEFAULT 'METRIC'::character varying,
    metric_id uuid,
    unit_id uuid,
    objective_type_id integer,
    title character varying(255),
    fiscal_year_id uuid
);


ALTER TABLE public.business_unit_objectives OWNER TO postgres;

--
-- Name: COLUMN business_unit_objectives.parent_global_objective_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.business_unit_objectives.parent_global_objective_id IS 'ID de l''objectif global parent (si cascadé)';


--
-- Name: COLUMN business_unit_objectives.is_cascaded; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.business_unit_objectives.is_cascaded IS 'TRUE si distribué depuis un parent, FALSE si autonome';


--
-- Name: business_unit_objectives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_unit_objectives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_unit_objectives_id_seq OWNER TO postgres;

--
-- Name: business_unit_objectives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_unit_objectives_id_seq OWNED BY public.business_unit_objectives.id;


--
-- Name: business_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_units (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    responsable_principal_id uuid,
    responsable_adjoint_id uuid,
    CONSTRAINT divisions_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text])))
);


ALTER TABLE public.business_units OWNER TO postgres;

--
-- Name: COLUMN business_units.responsable_principal_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.business_units.responsable_principal_id IS 'Responsable principal de la BU (validation obligatoire)';


--
-- Name: COLUMN business_units.responsable_adjoint_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.business_units.responsable_adjoint_id IS 'Responsable adjoint de la BU (validation alternative)';


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(255) NOT NULL,
    email character varying(255),
    telephone character varying(50),
    adresse text,
    ville character varying(100),
    code_postal character varying(20),
    pays character varying(100) DEFAULT 'France'::character varying,
    secteur_activite character varying(100),
    taille_entreprise character varying(50),
    statut character varying(50) DEFAULT 'prospect'::character varying NOT NULL,
    source_prospection character varying(100),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_derniere_activite timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    collaborateur_id uuid,
    created_by uuid,
    updated_by uuid,
    numero_contribuable character varying(20),
    forme_juridique character varying(100),
    effectif integer,
    chiffre_affaires numeric(15,2),
    resultat_net numeric(15,2),
    notation character varying(10),
    risque_client character varying(20) DEFAULT 'faible'::character varying,
    groupe_id uuid,
    est_filiale boolean DEFAULT false,
    latitude numeric(10,8),
    longitude numeric(11,8),
    site_web character varying(255),
    linkedin_url character varying(255),
    date_creation_entreprise date,
    secteur_geographique character varying(100),
    classification_abc character varying(1),
    nombre_missions integer DEFAULT 0,
    nombre_opportunites integer DEFAULT 0,
    chiffre_affaires_total numeric(15,2) DEFAULT 0,
    sigle character varying(20),
    pays_id uuid,
    secteur_activite_id uuid,
    code character varying(50),
    raison_sociale character varying(200),
    sous_secteur_activite_id uuid,
    CONSTRAINT clients_statut_check CHECK (((statut)::text = ANY (ARRAY[('PROSPECT'::character varying)::text, ('CLIENT'::character varying)::text, ('CLIENT_FIDELE'::character varying)::text, ('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text, ('ABANDONNE'::character varying)::text])))
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: COLUMN clients.sous_secteur_activite_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.sous_secteur_activite_id IS 'Référence vers le sous-secteur d''activité du client';


--
-- Name: collaborateurs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collaborateurs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matricule character varying(20),
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    initiales character varying(10) NOT NULL,
    email character varying(255),
    telephone character varying(20),
    date_embauche date NOT NULL,
    date_depart date,
    division_id uuid,
    grade_actuel_id uuid,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    type_collaborateur_id uuid,
    poste_actuel_id uuid,
    business_unit_id uuid,
    grade character varying(50),
    user_id uuid,
    photo_url character varying(500),
    CONSTRAINT collaborateurs_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text, ('CONGE'::character varying)::text, ('DEPART'::character varying)::text])))
);


ALTER TABLE public.collaborateurs OWNER TO postgres;

--
-- Name: TABLE collaborateurs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.collaborateurs IS 'Employés de l''entreprise avec leurs données RH';


--
-- Name: COLUMN collaborateurs.initiales; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.collaborateurs.initiales IS 'Initiales du nom du collaborateur';


--
-- Name: COLUMN collaborateurs.division_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.collaborateurs.division_id IS 'Division optionnelle du collaborateur (doit appartenir à la business unit)';


--
-- Name: COLUMN collaborateurs.business_unit_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.collaborateurs.business_unit_id IS 'Business unit obligatoire du collaborateur';


--
-- Name: COLUMN collaborateurs.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.collaborateurs.user_id IS 'Reference vers le compte utilisateur du collaborateur (optionnel)';


--
-- Name: COLUMN collaborateurs.photo_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.collaborateurs.photo_url IS 'Chemin vers la photo de profil du collaborateur (optionnel)';


--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid,
    name character varying(300) NOT NULL,
    industry character varying(200),
    email character varying(200),
    phone character varying(100),
    website character varying(300),
    country character varying(100),
    city character varying(150),
    address text,
    siret character varying(50),
    size_label character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sigle character varying(50)
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: COLUMN companies.sigle; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.sigle IS 'Sigle ou acronyme de l''entreprise (ex: EDF, SNCF, etc.)';


--
-- Name: company_imports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_imports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    status character varying(20) DEFAULT 'UPLOADED'::character varying NOT NULL,
    stats jsonb,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp with time zone,
    CONSTRAINT company_imports_status_check CHECK (((status)::text = ANY (ARRAY[('UPLOADED'::character varying)::text, ('PROCESSED'::character varying)::text, ('FAILED'::character varying)::text])))
);


ALTER TABLE public.company_imports OWNER TO postgres;

--
-- Name: company_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.company_sources OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    nom character varying(50) NOT NULL,
    prenom character varying(50) NOT NULL,
    fonction character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    telephone character varying(20) NOT NULL,
    est_contact_principal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: departs_collaborateurs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departs_collaborateurs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    collaborateur_id uuid NOT NULL,
    type_depart character varying(50) NOT NULL,
    date_effet date NOT NULL,
    motif text NOT NULL,
    preavis integer,
    documentation text,
    remarques text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_preavis_positive CHECK (((preavis IS NULL) OR (preavis >= 0))),
    CONSTRAINT check_type_depart CHECK (((type_depart)::text = ANY (ARRAY[('DEMISSION'::character varying)::text, ('LICENCIEMENT'::character varying)::text, ('ABANDON'::character varying)::text, ('RETRAITE'::character varying)::text, ('FIN_CONTRAT'::character varying)::text, ('MUTATION'::character varying)::text, ('AUTRE'::character varying)::text])))
);


ALTER TABLE public.departs_collaborateurs OWNER TO postgres;

--
-- Name: TABLE departs_collaborateurs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.departs_collaborateurs IS 'Table pour gÃ©rer les dÃ©parts des collaborateurs';


--
-- Name: COLUMN departs_collaborateurs.type_depart; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.departs_collaborateurs.type_depart IS 'Type de dÃ©part (DEMISSION, LICENCIEMENT, etc.)';


--
-- Name: COLUMN departs_collaborateurs.date_effet; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.departs_collaborateurs.date_effet IS 'Date de prise d''effet du dÃ©part';


--
-- Name: COLUMN departs_collaborateurs.motif; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.departs_collaborateurs.motif IS 'Motif dÃ©taillÃ© du dÃ©part';


--
-- Name: COLUMN departs_collaborateurs.preavis; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.departs_collaborateurs.preavis IS 'Nombre de jours de prÃ©avis respectÃ©';


--
-- Name: COLUMN departs_collaborateurs.documentation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.departs_collaborateurs.documentation IS 'Documents remis lors du dÃ©part';


--
-- Name: COLUMN departs_collaborateurs.remarques; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.departs_collaborateurs.remarques IS 'Remarques additionnelles';


--
-- Name: division_objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.division_objectives (
    id integer NOT NULL,
    business_unit_objective_id integer,
    division_id uuid,
    target_value numeric(15,2) NOT NULL,
    description text,
    weight numeric(5,2) DEFAULT 1.00,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tracking_type character varying(20) DEFAULT 'MANUAL'::character varying,
    metric_code character varying(50),
    parent_bu_objective_id integer,
    is_cascaded boolean DEFAULT false,
    objective_mode character varying(20) DEFAULT 'METRIC'::character varying,
    metric_id uuid,
    unit_id uuid,
    title character varying(255),
    objective_type_id integer,
    fiscal_year_id uuid
);


ALTER TABLE public.division_objectives OWNER TO postgres;

--
-- Name: COLUMN division_objectives.parent_bu_objective_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.division_objectives.parent_bu_objective_id IS 'ID de l''objectif BU parent (si cascadé)';


--
-- Name: COLUMN division_objectives.is_cascaded; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.division_objectives.is_cascaded IS 'TRUE si distribué depuis un parent, FALSE si autonome';


--
-- Name: division_objectives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.division_objectives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.division_objectives_id_seq OWNER TO postgres;

--
-- Name: division_objectives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.division_objectives_id_seq OWNED BY public.division_objectives.id;


--
-- Name: divisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.divisions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    description text,
    business_unit_id uuid NOT NULL,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    responsable_principal_id uuid,
    responsable_adjoint_id uuid,
    CONSTRAINT divisions_statut_check1 CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text])))
);


ALTER TABLE public.divisions OWNER TO postgres;

--
-- Name: COLUMN divisions.responsable_principal_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.divisions.responsable_principal_id IS 'Responsable principal de la division (validation obligatoire)';


--
-- Name: COLUMN divisions.responsable_adjoint_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.divisions.responsable_adjoint_id IS 'Responsable adjoint de la division (validation alternative)';


--
-- Name: equipes_mission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipes_mission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mission_id uuid NOT NULL,
    collaborateur_id uuid NOT NULL,
    role character varying(100),
    taux_horaire_mission numeric(8,2),
    date_debut_participation date,
    date_fin_participation date,
    pourcentage_charge numeric(5,2) DEFAULT 100.00,
    date_creation timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_modification timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.equipes_mission OWNER TO postgres;

--
-- Name: evaluation_campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_campaigns (
    id integer NOT NULL,
    fiscal_year_id uuid,
    template_id integer,
    name character varying(100) NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status character varying(50) DEFAULT 'DRAFT'::character varying,
    target_type character varying(50),
    target_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.evaluation_campaigns OWNER TO postgres;

--
-- Name: evaluation_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_campaigns_id_seq OWNER TO postgres;

--
-- Name: evaluation_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_campaigns_id_seq OWNED BY public.evaluation_campaigns.id;


--
-- Name: evaluation_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_comments (
    id integer NOT NULL,
    evaluation_id integer,
    author_id uuid,
    comment_type character varying(50),
    objective_score_id integer,
    content text NOT NULL,
    is_visible_to_collaborator boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.evaluation_comments OWNER TO postgres;

--
-- Name: evaluation_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_comments_id_seq OWNER TO postgres;

--
-- Name: evaluation_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_comments_id_seq OWNED BY public.evaluation_comments.id;


--
-- Name: evaluation_objective_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_objective_scores (
    id integer NOT NULL,
    evaluation_id integer,
    individual_objective_id integer,
    target_value numeric(15,2) NOT NULL,
    achieved_value numeric(15,2) NOT NULL,
    achievement_rate numeric(5,2) DEFAULT 0,
    rating character varying(50),
    comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.evaluation_objective_scores OWNER TO postgres;

--
-- Name: evaluation_objective_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_objective_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_objective_scores_id_seq OWNER TO postgres;

--
-- Name: evaluation_objective_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_objective_scores_id_seq OWNED BY public.evaluation_objective_scores.id;


--
-- Name: evaluation_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    scoring_method character varying(50) DEFAULT 'SIMPLE_AVERAGE'::character varying,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.evaluation_templates OWNER TO postgres;

--
-- Name: evaluation_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluation_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_templates_id_seq OWNER TO postgres;

--
-- Name: evaluation_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluation_templates_id_seq OWNED BY public.evaluation_templates.id;


--
-- Name: evaluations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluations (
    id integer NOT NULL,
    campaign_id integer,
    collaborator_id uuid,
    evaluator_id uuid,
    status character varying(50) DEFAULT 'DRAFT'::character varying,
    global_score numeric(5,2),
    strengths text,
    improvement_areas text,
    general_comment text,
    next_period_objectives text,
    evaluator_signature_date timestamp with time zone,
    collaborator_signature_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.evaluations OWNER TO postgres;

--
-- Name: evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluations_id_seq OWNER TO postgres;

--
-- Name: evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluations_id_seq OWNED BY public.evaluations.id;


--
-- Name: evolution_grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evolution_grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collaborateur_id uuid NOT NULL,
    grade_id uuid NOT NULL,
    date_debut date NOT NULL,
    date_fin date,
    taux_horaire_personnalise numeric(10,2),
    motif text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.evolution_grades OWNER TO postgres;

--
-- Name: TABLE evolution_grades; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.evolution_grades IS 'Historique de l''évolution des grades des collaborateurs';


--
-- Name: evolution_organisations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evolution_organisations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    collaborateur_id uuid NOT NULL,
    business_unit_id uuid NOT NULL,
    division_id uuid NOT NULL,
    date_debut date NOT NULL,
    date_fin date,
    motif text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_evolution_organisations_dates CHECK ((date_debut <= COALESCE(date_fin, date_debut)))
);


ALTER TABLE public.evolution_organisations OWNER TO postgres;

--
-- Name: TABLE evolution_organisations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.evolution_organisations IS 'Historique des évolutions organisationnelles des collaborateurs (Business Unit et Division)';


--
-- Name: COLUMN evolution_organisations.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.evolution_organisations.id IS 'Identifiant unique de l''évolution organisationnelle';


--
-- Name: COLUMN evolution_organisations.collaborateur_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.evolution_organisations.collaborateur_id IS 'Référence vers le collaborateur concerné';


--
-- Name: COLUMN evolution_organisations.business_unit_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.evolution_organisations.business_unit_id IS 'Référence vers la Business Unit assignée';


--
-- Name: COLUMN evolution_organisations.division_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.evolution_organisations.division_id IS 'Référence vers la Division assignée';


--
-- Name: COLUMN evolution_organisations.date_debut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.evolution_organisations.date_debut IS 'Date de début de l''affectation organisationnelle';


--
-- Name: COLUMN evolution_organisations.date_fin; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.evolution_organisations.date_fin IS 'Date de fin de l''affectation organisationnelle (NULL si en cours)';


--
-- Name: COLUMN evolution_organisations.motif; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.evolution_organisations.motif IS 'Motif du changement organisationnel';


--
-- Name: COLUMN evolution_organisations.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.evolution_organisations.created_at IS 'Date de création de l''enregistrement';


--
-- Name: COLUMN evolution_organisations.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.evolution_organisations.updated_at IS 'Date de dernière modification de l''enregistrement';


--
-- Name: evolution_postes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evolution_postes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collaborateur_id uuid NOT NULL,
    poste_id uuid NOT NULL,
    date_debut date NOT NULL,
    date_fin date,
    motif text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.evolution_postes OWNER TO postgres;

--
-- Name: TABLE evolution_postes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.evolution_postes IS 'Historique de l''évolution des postes des collaborateurs';


--
-- Name: feuille_temps_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feuille_temps_entries (
    feuille_temps_id uuid NOT NULL,
    time_entry_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.feuille_temps_entries OWNER TO postgres;

--
-- Name: TABLE feuille_temps_entries; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.feuille_temps_entries IS 'Liaison entre feuilles de temps et saisies de temps';


--
-- Name: feuilles_temps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feuilles_temps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collaborateur_id uuid NOT NULL,
    semaine integer NOT NULL,
    annee integer NOT NULL,
    date_debut_semaine date NOT NULL,
    date_fin_semaine date NOT NULL,
    statut character varying(20) DEFAULT 'BROUILLON'::character varying NOT NULL,
    validateur_id uuid,
    date_soumission timestamp with time zone,
    date_validation timestamp with time zone,
    commentaire_validation text,
    total_heures_chargeables numeric(8,2) DEFAULT 0.00,
    total_heures_non_chargeables numeric(8,2) DEFAULT 0.00,
    total_heures_semaine numeric(8,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feuilles_temps_statut_check CHECK (((statut)::text = ANY (ARRAY[('BROUILLON'::character varying)::text, ('SOUMISE'::character varying)::text, ('VALIDEE'::character varying)::text, ('REJETEE'::character varying)::text])))
);


ALTER TABLE public.feuilles_temps OWNER TO postgres;

--
-- Name: TABLE feuilles_temps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.feuilles_temps IS 'Feuilles de temps hebdomadaires des collaborateurs';


--
-- Name: financial_institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_institutions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(30) DEFAULT 'BANK'::character varying,
    country character varying(3) DEFAULT 'CMR'::character varying,
    swift_code character varying(11),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_institution_type CHECK (((type)::text = ANY ((ARRAY['BANK'::character varying, 'MOBILE_MONEY'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.financial_institutions OWNER TO postgres;

--
-- Name: TABLE financial_institutions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.financial_institutions IS 'Catalogue des établissements financiers (banques, mobile money)';


--
-- Name: COLUMN financial_institutions.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.financial_institutions.code IS 'Code unique de l''établissement';


--
-- Name: COLUMN financial_institutions.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.financial_institutions.type IS 'Type: BANK, MOBILE_MONEY, OTHER';


--
-- Name: COLUMN financial_institutions.swift_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.financial_institutions.swift_code IS 'Code SWIFT/BIC pour les virements internationaux';


--
-- Name: financial_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_settings (
    key character varying(50) NOT NULL,
    value text,
    description text,
    type character varying(20) DEFAULT 'string'::character varying,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid
);


ALTER TABLE public.financial_settings OWNER TO postgres;

--
-- Name: fiscal_years; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fiscal_years (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    annee integer NOT NULL,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    budget_global numeric(15,2) DEFAULT 0,
    statut character varying(20) DEFAULT 'OUVERTE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    libelle character varying(50) NOT NULL,
    CONSTRAINT check_dates CHECK ((date_fin > date_debut)),
    CONSTRAINT fiscal_years_statut_check CHECK (((statut)::text = ANY (ARRAY[('OUVERTE'::character varying)::text, ('FERMEE'::character varying)::text, ('EN_COURS'::character varying)::text])))
);


ALTER TABLE public.fiscal_years OWNER TO postgres;

--
-- Name: COLUMN fiscal_years.budget_global; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fiscal_years.budget_global IS 'Budget global calculé automatiquement à partir des objectifs financiers';


--
-- Name: COLUMN fiscal_years.libelle; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fiscal_years.libelle IS 'Libellé de l''année fiscale (ex: FY25)';


--
-- Name: global_objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.global_objectives (
    id integer NOT NULL,
    fiscal_year_id uuid,
    objective_type_id integer,
    target_value numeric(15,2) NOT NULL,
    description text,
    weight numeric(5,2) DEFAULT 1.00,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tracking_type character varying(20) DEFAULT 'MANUAL'::character varying,
    metric_code character varying(50),
    objective_mode character varying(20) DEFAULT 'METRIC'::character varying,
    metric_id uuid,
    unit_id uuid,
    title character varying(255)
);


ALTER TABLE public.global_objectives OWNER TO postgres;

--
-- Name: global_objectives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.global_objectives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.global_objectives_id_seq OWNER TO postgres;

--
-- Name: global_objectives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.global_objectives_id_seq OWNED BY public.global_objectives.id;


--
-- Name: grade_objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grade_objectives (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    grade_id uuid,
    parent_division_objective_id integer,
    target_value numeric(15,2),
    description text,
    weight numeric(5,2),
    tracking_type character varying(50),
    metric_code character varying(50),
    assigned_by uuid,
    is_cascaded boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    title character varying(255),
    objective_mode character varying(50) DEFAULT 'METRIC'::character varying,
    metric_id uuid,
    unit_id uuid,
    objective_type_id integer,
    fiscal_year_id uuid
);


ALTER TABLE public.grade_objectives OWNER TO postgres;

--
-- Name: grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    division_id uuid,
    taux_horaire_default numeric(10,2) DEFAULT 0.00 NOT NULL,
    niveau integer DEFAULT 1 NOT NULL,
    description text,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT grades_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text])))
);


ALTER TABLE public.grades OWNER TO postgres;

--
-- Name: TABLE grades; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.grades IS 'Grades hiérarchiques par division avec taux horaires par défaut';


--
-- Name: hourly_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hourly_rates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    grade character varying(20) NOT NULL,
    taux_horaire numeric(10,2) NOT NULL,
    date_effet date NOT NULL,
    date_fin_effet date,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_rate_dates CHECK (((date_fin_effet IS NULL) OR (date_fin_effet >= date_effet))),
    CONSTRAINT hourly_rates_grade_check CHECK (((grade)::text = ANY (ARRAY[('ASSISTANT'::character varying)::text, ('SENIOR'::character varying)::text, ('MANAGER'::character varying)::text, ('DIRECTOR'::character varying)::text, ('PARTNER'::character varying)::text]))),
    CONSTRAINT hourly_rates_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text])))
);


ALTER TABLE public.hourly_rates OWNER TO postgres;

--
-- Name: individual_objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.individual_objectives (
    id integer NOT NULL,
    division_objective_id integer,
    collaborator_id uuid,
    target_value numeric(15,2) NOT NULL,
    description text,
    weight numeric(5,2) DEFAULT 1.00,
    assigned_by uuid,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tracking_type character varying(20) DEFAULT 'MANUAL'::character varying,
    metric_code character varying(50),
    target_grade_id uuid,
    parent_division_objective_id integer,
    is_cascaded boolean DEFAULT false,
    objective_mode character varying(20) DEFAULT 'METRIC'::character varying,
    metric_id uuid,
    unit_id uuid,
    title character varying(255),
    objective_type_id integer,
    fiscal_year_id uuid
);


ALTER TABLE public.individual_objectives OWNER TO postgres;

--
-- Name: COLUMN individual_objectives.parent_division_objective_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.individual_objectives.parent_division_objective_id IS 'ID de l''objectif Division parent (si cascadé)';


--
-- Name: COLUMN individual_objectives.is_cascaded; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.individual_objectives.is_cascaded IS 'TRUE si distribué depuis un parent, FALSE si autonome';


--
-- Name: individual_objectives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.individual_objectives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.individual_objectives_id_seq OWNER TO postgres;

--
-- Name: individual_objectives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.individual_objectives_id_seq OWNED BY public.individual_objectives.id;


--
-- Name: internal_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.internal_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.internal_activities OWNER TO postgres;

--
-- Name: TABLE internal_activities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.internal_activities IS 'Activités internes non liées aux missions';


--
-- Name: COLUMN internal_activities.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activities.name IS 'Nom de l''activité interne';


--
-- Name: COLUMN internal_activities.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activities.description IS 'Description détaillée de l''activité';


--
-- Name: COLUMN internal_activities.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activities.is_active IS 'Statut actif/inactif de l''activité';


--
-- Name: internal_activity_business_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.internal_activity_business_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    internal_activity_id uuid NOT NULL,
    business_unit_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.internal_activity_business_units OWNER TO postgres;

--
-- Name: TABLE internal_activity_business_units; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.internal_activity_business_units IS 'Affectation des activités internes aux business units';


--
-- Name: COLUMN internal_activity_business_units.internal_activity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_business_units.internal_activity_id IS 'ID de l''activité interne';


--
-- Name: COLUMN internal_activity_business_units.business_unit_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_business_units.business_unit_id IS 'ID de la business unit';


--
-- Name: COLUMN internal_activity_business_units.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_business_units.is_active IS 'Statut actif/inactif de l''affectation';


--
-- Name: internal_activity_time_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.internal_activity_time_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    internal_activity_id uuid NOT NULL,
    business_unit_id uuid NOT NULL,
    date date NOT NULL,
    hours numeric(4,2) NOT NULL,
    description text,
    is_approved boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT internal_activity_time_entries_hours_check CHECK (((hours > (0)::numeric) AND (hours <= (24)::numeric)))
);


ALTER TABLE public.internal_activity_time_entries OWNER TO postgres;

--
-- Name: TABLE internal_activity_time_entries; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.internal_activity_time_entries IS 'Saisies de temps sur les activités internes (heures non chargeables)';


--
-- Name: COLUMN internal_activity_time_entries.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_time_entries.user_id IS 'Utilisateur qui a saisi le temps';


--
-- Name: COLUMN internal_activity_time_entries.internal_activity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_time_entries.internal_activity_id IS 'Activité interne concernée';


--
-- Name: COLUMN internal_activity_time_entries.business_unit_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_time_entries.business_unit_id IS 'Business unit concernée';


--
-- Name: COLUMN internal_activity_time_entries.date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_time_entries.date IS 'Date de la saisie de temps';


--
-- Name: COLUMN internal_activity_time_entries.hours; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_time_entries.hours IS 'Nombre d''heures (non chargeables)';


--
-- Name: COLUMN internal_activity_time_entries.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_time_entries.description IS 'Description du travail effectué';


--
-- Name: COLUMN internal_activity_time_entries.is_approved; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_time_entries.is_approved IS 'Statut d''approbation';


--
-- Name: COLUMN internal_activity_time_entries.approved_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.internal_activity_time_entries.approved_by IS 'Utilisateur qui a approuvé';


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantite numeric(10,2) DEFAULT 1 NOT NULL,
    unite character varying(20) DEFAULT 'heure'::character varying,
    prix_unitaire numeric(15,2) NOT NULL,
    montant_ht numeric(15,2) GENERATED ALWAYS AS ((quantite * prix_unitaire)) STORED,
    taux_tva numeric(5,2) DEFAULT 19.25,
    montant_tva numeric(15,2) GENERATED ALWAYS AS ((((quantite * prix_unitaire) * taux_tva) / (100)::numeric)) STORED,
    montant_ttc numeric(15,2) GENERATED ALWAYS AS (((quantite * prix_unitaire) + (((quantite * prix_unitaire) * taux_tva) / (100)::numeric))) STORED,
    task_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.invoice_items OWNER TO postgres;

--
-- Name: invoice_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_number_seq OWNER TO postgres;

--
-- Name: invoice_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    montant numeric(15,2) NOT NULL,
    date_paiement date NOT NULL,
    mode_paiement character varying(50) NOT NULL,
    reference_paiement character varying(100),
    statut character varying(20) DEFAULT 'VALIDE'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);


ALTER TABLE public.invoice_payments OWNER TO postgres;

--
-- Name: invoice_time_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_time_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    time_entry_id uuid NOT NULL,
    montant_facture numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.invoice_time_entries OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    mission_id uuid,
    date_emission date NOT NULL,
    date_echeance date NOT NULL,
    montant_ht numeric(15,2) DEFAULT 0 NOT NULL,
    montant_tva numeric(15,2) DEFAULT 0 NOT NULL,
    montant_ttc numeric(15,2) DEFAULT 0 NOT NULL,
    statut character varying(50) DEFAULT 'EMISE'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    numero_facture character varying(50),
    conditions_paiement text,
    taux_tva numeric(5,2) DEFAULT 19.25,
    adresse_facturation text,
    notes_facture text,
    date_premier_paiement date,
    date_dernier_paiement date,
    nombre_paiements integer DEFAULT 0,
    created_by uuid,
    updated_by uuid,
    montant_paye numeric(15,2) DEFAULT 0 NOT NULL,
    montant_restant numeric(15,2) GENERATED ALWAYS AS ((montant_ttc - montant_paye)) STORED,
    fiscal_year_id uuid,
    workflow_status character varying(30) DEFAULT 'BROUILLON'::character varying,
    validated_by uuid,
    validated_at timestamp without time zone,
    validation_notes text,
    emission_validated_by uuid,
    emission_validated_at timestamp without time zone,
    emitted_by uuid,
    emitted_at timestamp without time zone,
    submitted_for_validation_at timestamp without time zone,
    submitted_for_validation_by uuid,
    submitted_for_emission_at timestamp without time zone,
    emission_validation_notes text,
    rejection_reason text,
    rejected_at timestamp without time zone,
    rejected_by uuid,
    CONSTRAINT check_invoice_dates CHECK ((date_echeance >= date_emission)),
    CONSTRAINT check_workflow_status CHECK (((workflow_status)::text = ANY ((ARRAY['BROUILLON'::character varying, 'SOUMISE_VALIDATION'::character varying, 'VALIDEE'::character varying, 'SOUMISE_EMISSION'::character varying, 'VALIDEE_EMISSION'::character varying, 'EMISE'::character varying, 'PAYEE_PARTIELLEMENT'::character varying, 'PAYEE'::character varying, 'ANNULEE'::character varying])::text[]))),
    CONSTRAINT invoices_statut_check CHECK (((statut)::text = ANY ((ARRAY['BROUILLON'::character varying, 'EN_ATTENTE_VALIDATION'::character varying, 'EN_ATTENTE_APPROBATION'::character varying, 'EN_ATTENTE_EMISSION'::character varying, 'EMISE'::character varying, 'PAYEE'::character varying, 'PAYEE_PARTIELLEMENT'::character varying, 'ANNULEE'::character varying])::text[])))
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: COLUMN invoices.statut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.statut IS 'Ancien statut (conservé pour compatibilité)';


--
-- Name: COLUMN invoices.montant_paye; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.montant_paye IS 'Montant total payé (mis à jour automatiquement via payment_allocations)';


--
-- Name: COLUMN invoices.montant_restant; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.montant_restant IS 'Montant restant à payer (calculé automatiquement)';


--
-- Name: COLUMN invoices.fiscal_year_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.fiscal_year_id IS 'Exercice fiscal de la facture';


--
-- Name: COLUMN invoices.workflow_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.workflow_status IS 'Nouveau statut dans le workflow de validation (remplace progressivement statut)';


--
-- Name: COLUMN invoices.validated_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.validated_by IS 'Associé ou Responsable BU qui a validé';


--
-- Name: COLUMN invoices.emission_validated_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.emission_validated_by IS 'Senior Partner qui a validé pour émission';


--
-- Name: COLUMN invoices.emitted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.emitted_at IS 'Date d''émission de la facture';


--
-- Name: COLUMN invoices.submitted_for_validation_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.submitted_for_validation_at IS 'Date de soumission pour validation';


--
-- Name: COLUMN invoices.submitted_for_emission_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.submitted_for_emission_at IS 'Date de soumission pour émission';


--
-- Name: COLUMN invoices.rejection_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.rejection_reason IS 'Raison du rejet de la facture';


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    url character varying(500) NOT NULL,
    section_id uuid,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: TABLE menu_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.menu_items IS 'Items du menu de navigation';


--
-- Name: menu_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_sections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.menu_sections OWNER TO postgres;

--
-- Name: TABLE menu_sections; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.menu_sections IS 'Sections du menu de navigation';


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: mission_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mission_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mission_id uuid NOT NULL,
    task_id uuid NOT NULL,
    statut character varying(20) DEFAULT 'PLANIFIEE'::character varying,
    date_debut date,
    date_fin date,
    duree_planifiee integer DEFAULT 0,
    duree_reelle integer DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mission_tasks_statut_check CHECK (((statut)::text = ANY (ARRAY[('PLANIFIEE'::character varying)::text, ('EN_COURS'::character varying)::text, ('TERMINEE'::character varying)::text, ('ANNULEE'::character varying)::text])))
);


ALTER TABLE public.mission_tasks OWNER TO postgres;

--
-- Name: mission_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mission_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codification character varying(20) NOT NULL,
    libelle character varying(200) NOT NULL,
    description text,
    division_id uuid,
    actif boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mission_types OWNER TO postgres;

--
-- Name: missions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.missions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(255) NOT NULL,
    description text,
    client_id uuid,
    collaborateur_id uuid,
    statut character varying(50) DEFAULT 'PLANIFIEE'::character varying NOT NULL,
    type_mission character varying(100),
    priorite character varying(20) DEFAULT 'MOYENNE'::character varying,
    date_debut date,
    date_fin date,
    date_debut_reelle date,
    date_fin_reelle date,
    budget_estime numeric(15,2),
    budget_reel numeric(15,2),
    devise character varying(5) DEFAULT 'XAF'::character varying,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fiscal_year_id uuid,
    opportunity_id uuid,
    code character varying(50),
    mission_type_id uuid,
    montant_honoraires numeric(12,2),
    description_honoraires text,
    montant_debours numeric(12,2),
    description_debours text,
    conditions_paiement text,
    pourcentage_avance numeric(5,2) DEFAULT 0.00,
    associe_id uuid,
    business_unit_id uuid,
    division_id uuid,
    CONSTRAINT check_budget_reel CHECK ((budget_reel >= (0)::numeric)),
    CONSTRAINT check_priorite CHECK (((priorite)::text = ANY (ARRAY[('BASSE'::character varying)::text, ('MOYENNE'::character varying)::text, ('HAUTE'::character varying)::text, ('URGENTE'::character varying)::text]))),
    CONSTRAINT check_statut CHECK (((statut)::text = ANY (ARRAY[('PLANIFIEE'::character varying)::text, ('EN_COURS'::character varying)::text, ('TERMINEE'::character varying)::text, ('ANNULEE'::character varying)::text, ('SUSPENDUE'::character varying)::text])))
);


ALTER TABLE public.missions OWNER TO postgres;

--
-- Name: COLUMN missions.fiscal_year_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.missions.fiscal_year_id IS 'Exercice fiscal de la mission';


--
-- Name: COLUMN missions.opportunity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.missions.opportunity_id IS 'Référence vers l''opportunité gagnée qui a généré cette mission. NULL si la mission a été créée manuellement.';


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_settings (
    id integer NOT NULL,
    user_id uuid,
    general jsonb,
    email jsonb,
    notification_types jsonb,
    alerts jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.notification_settings OWNER TO postgres;

--
-- Name: notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_settings_id_seq OWNER TO postgres;

--
-- Name: notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_settings_id_seq OWNED BY public.notification_settings.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    user_id uuid,
    opportunity_id uuid,
    stage_id uuid,
    priority character varying(20) DEFAULT 'NORMAL'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    CONSTRAINT notifications_priority_check CHECK (((priority)::text = ANY (ARRAY[('LOW'::character varying)::text, ('NORMAL'::character varying)::text, ('HIGH'::character varying)::text, ('URGENT'::character varying)::text])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: objective_metric_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objective_metric_sources (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    metric_id uuid,
    objective_type_id integer,
    unit_id uuid,
    weight numeric(5,2) DEFAULT 1.0,
    filter_conditions jsonb,
    data_source_table character varying(100),
    data_source_value_column character varying(100),
    data_source_filter_column character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.objective_metric_sources OWNER TO postgres;

--
-- Name: objective_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objective_metrics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    label character varying(255) NOT NULL,
    description text,
    calculation_type character varying(50) NOT NULL,
    target_unit_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.objective_metrics OWNER TO postgres;

--
-- Name: objective_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objective_progress (
    id integer NOT NULL,
    objective_type character varying(50) NOT NULL,
    objective_id integer NOT NULL,
    current_value numeric(15,2) DEFAULT 0 NOT NULL,
    target_value numeric(15,2) NOT NULL,
    achievement_rate numeric(5,2) DEFAULT 0,
    measured_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.objective_progress OWNER TO postgres;

--
-- Name: objective_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.objective_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.objective_progress_id_seq OWNER TO postgres;

--
-- Name: objective_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.objective_progress_id_seq OWNED BY public.objective_progress.id;


--
-- Name: objective_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objective_types (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    unit character varying(20) DEFAULT ''::character varying,
    is_financial boolean DEFAULT false,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    default_unit_id uuid,
    supports_multiple_units boolean DEFAULT false,
    data_source_table character varying(100),
    data_source_value_column character varying(100),
    entity_type character varying(50),
    operation character varying(50),
    value_field character varying(100)
);


ALTER TABLE public.objective_types OWNER TO postgres;

--
-- Name: COLUMN objective_types.entity_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.objective_types.entity_type IS 'Type d''entit‚ applicative (OPPORTUNITY, CAMPAIGN, CUSTOMER, etc.)';


--
-- Name: COLUMN objective_types.operation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.objective_types.operation IS 'Op‚ration d‚clenchant le tracking (CREATED, WON, CONVERTED, etc.)';


--
-- Name: COLUMN objective_types.value_field; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.objective_types.value_field IS 'Champ … r‚cup‚rer pour la valeur (amount, id, etc.)';


--
-- Name: objective_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.objective_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.objective_types_id_seq OWNER TO postgres;

--
-- Name: objective_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.objective_types_id_seq OWNED BY public.objective_types.id;


--
-- Name: objective_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objective_units (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    symbol character varying(10),
    type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.objective_units OWNER TO postgres;

--
-- Name: opportunites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titre character varying(255) NOT NULL,
    description text,
    client_id uuid NOT NULL,
    statut character varying(50) DEFAULT 'identification'::character varying NOT NULL,
    probabilite numeric(5,2) DEFAULT 0.00,
    montant_estime numeric(12,2),
    date_limite date,
    date_creation timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_modification timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_fermeture timestamp with time zone,
    raison_fermeture character varying(255),
    collaborateur_id uuid,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.opportunites OWNER TO postgres;

--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(255) NOT NULL,
    description text,
    client_id uuid,
    collaborateur_id uuid,
    statut character varying(50) DEFAULT 'NOUVELLE'::character varying NOT NULL,
    type_opportunite character varying(100),
    source character varying(100),
    probabilite integer DEFAULT 0,
    montant_estime numeric(15,2),
    devise character varying(5) DEFAULT 'FCFA'::character varying,
    date_fermeture_prevue date,
    date_fermeture_reelle date,
    etape_vente character varying(50) DEFAULT 'PROSPECTION'::character varying,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    business_unit_id uuid,
    opportunity_type_id uuid,
    fiscal_year_id uuid,
    current_stage_id uuid,
    stage_entered_at timestamp without time zone,
    next_alert_date timestamp without time zone,
    auto_abandon_date timestamp without time zone,
    stage_validation_status jsonb DEFAULT '{}'::jsonb,
    last_activity_at timestamp without time zone,
    CONSTRAINT check_etape_vente CHECK (((etape_vente)::text = ANY (ARRAY[('PROSPECTION'::character varying)::text, ('QUALIFICATION'::character varying)::text, ('PROPOSITION'::character varying)::text, ('NEGOCIATION'::character varying)::text, ('FERMETURE'::character varying)::text]))),
    CONSTRAINT check_probabilite CHECK (((probabilite >= 0) AND (probabilite <= 100))),
    CONSTRAINT check_statut CHECK (((statut)::text = ANY (ARRAY[('NOUVELLE'::character varying)::text, ('EN_COURS'::character varying)::text, ('GAGNEE'::character varying)::text, ('PERDUE'::character varying)::text, ('ANNULEE'::character varying)::text])))
);


ALTER TABLE public.opportunities OWNER TO postgres;

--
-- Name: COLUMN opportunities.fiscal_year_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.opportunities.fiscal_year_id IS 'Exercice fiscal de l''opportunité';


--
-- Name: opportunity_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunity_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    stage_id uuid,
    action_type character varying(120) NOT NULL,
    description text,
    performed_by uuid,
    performed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_validating boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.opportunity_actions OWNER TO postgres;

--
-- Name: opportunity_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunity_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    stage_id uuid,
    document_type character varying(120) NOT NULL,
    file_name character varying(255),
    file_path character varying(1024),
    uploaded_by uuid,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    validation_status character varying(16) DEFAULT 'pending'::character varying NOT NULL,
    validator_id uuid,
    validated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.opportunity_documents OWNER TO postgres;

--
-- Name: opportunity_stage_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunity_stage_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_type_id uuid NOT NULL,
    stage_name character varying(100) NOT NULL,
    stage_order integer NOT NULL,
    description text,
    required_documents jsonb DEFAULT '[]'::jsonb,
    required_actions jsonb DEFAULT '[]'::jsonb,
    max_duration_days integer DEFAULT 10,
    min_duration_days integer DEFAULT 1,
    is_mandatory boolean DEFAULT true,
    can_skip boolean DEFAULT false,
    validation_required boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.opportunity_stage_templates OWNER TO postgres;

--
-- Name: opportunity_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunity_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    stage_template_id uuid NOT NULL,
    stage_name character varying(100) NOT NULL,
    stage_order integer NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    start_date timestamp without time zone,
    completed_date timestamp without time zone,
    due_date timestamp without time zone,
    notes text,
    risk_level character varying(20) DEFAULT 'LOW'::character varying,
    priority_level character varying(20) DEFAULT 'NORMAL'::character varying,
    documents jsonb DEFAULT '[]'::jsonb,
    actions jsonb DEFAULT '[]'::jsonb,
    validated_by uuid,
    validated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT opportunity_stages_priority_level_check CHECK (((priority_level)::text = ANY (ARRAY[('LOW'::character varying)::text, ('NORMAL'::character varying)::text, ('HIGH'::character varying)::text, ('URGENT'::character varying)::text]))),
    CONSTRAINT opportunity_stages_risk_level_check CHECK (((risk_level)::text = ANY (ARRAY[('LOW'::character varying)::text, ('MEDIUM'::character varying)::text, ('HIGH'::character varying)::text, ('CRITICAL'::character varying)::text]))),
    CONSTRAINT opportunity_stages_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('COMPLETED'::character varying)::text, ('SKIPPED'::character varying)::text, ('BLOCKED'::character varying)::text])))
);


ALTER TABLE public.opportunity_stages OWNER TO postgres;

--
-- Name: opportunity_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunity_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    default_probability integer DEFAULT 50,
    default_duration_days integer DEFAULT 30,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    nom character varying(100),
    code character varying(50),
    couleur character varying(20)
);


ALTER TABLE public.opportunity_types OWNER TO postgres;

--
-- Name: pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    url character varying(500) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pages OWNER TO postgres;

--
-- Name: TABLE pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pages IS 'Liste de toutes les pages HTML de l''application';


--
-- Name: payment_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_allocations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    payment_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    allocated_amount numeric(15,2) NOT NULL,
    allocation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payment_allocations_allocated_amount_check CHECK ((allocated_amount > (0)::numeric))
);


ALTER TABLE public.payment_allocations OWNER TO postgres;

--
-- Name: TABLE payment_allocations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_allocations IS 'Allocation des paiements aux factures (relation many-to-many)';


--
-- Name: COLUMN payment_allocations.allocated_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_allocations.allocated_amount IS 'Montant alloué de ce paiement à cette facture';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    payment_number character varying(50) NOT NULL,
    bank_account_id uuid NOT NULL,
    payment_date date NOT NULL,
    payment_mode character varying(20) NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'XAF'::character varying,
    reference character varying(100),
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    CONSTRAINT check_payment_mode CHECK (((payment_mode)::text = ANY ((ARRAY['VIREMENT'::character varying, 'CHEQUE'::character varying, 'ESPECES'::character varying, 'MOBILE_MONEY'::character varying])::text[]))),
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: TABLE payments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payments IS 'Paiements reçus (peuvent être alloués à une ou plusieurs factures)';


--
-- Name: COLUMN payments.payment_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payments.payment_number IS 'Numéro unique du paiement (ex: PAY-AUD-202512-0001)';


--
-- Name: COLUMN payments.payment_mode; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payments.payment_mode IS 'Mode de paiement: VIREMENT, CHEQUE, ESPECES, MOBILE_MONEY';


--
-- Name: COLUMN payments.amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payments.amount IS 'Montant total du paiement';


--
-- Name: COLUMN payments.reference; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payments.reference IS 'Référence externe (numéro de chèque, référence virement, etc.)';


--
-- Name: pays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pays (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    code_pays character varying(3) NOT NULL,
    code_appel character varying(10),
    devise character varying(10),
    langue_principale character varying(50),
    fuseau_horaire character varying(50),
    capitale character varying(100),
    population bigint,
    superficie numeric(15,2),
    pib numeric(20,2),
    description text,
    actif boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pays OWNER TO postgres;

--
-- Name: permission_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permission_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action character varying(50) NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id uuid,
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permission_audit_log OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    nom character varying(255),
    module character varying(100)
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: postes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.postes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    type_collaborateur_id uuid,
    description text,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT postes_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text])))
);


ALTER TABLE public.postes OWNER TO postgres;

--
-- Name: TABLE postes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.postes IS 'Postes associés aux types de collaborateurs';


--
-- Name: COLUMN postes.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.postes.code IS 'Code unique du poste';


--
-- Name: COLUMN postes.type_collaborateur_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.postes.type_collaborateur_id IS 'Type de collaborateur associé (optionnel)';


--
-- Name: prospecting_campaign_companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospecting_campaign_companies (
    campaign_id uuid NOT NULL,
    company_id uuid NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    sent_at timestamp with time zone,
    response_at timestamp with time zone,
    notes text,
    validation_status character varying(20) DEFAULT 'PENDING'::character varying,
    execution_status character varying(20) DEFAULT 'pending_execution'::character varying,
    converted_to_opportunity boolean DEFAULT false,
    opportunity_id uuid,
    execution_date timestamp with time zone,
    execution_notes text,
    execution_file character varying(255),
    CONSTRAINT check_opportunity_execution CHECK (((converted_to_opportunity = false) OR ((converted_to_opportunity = true) AND ((execution_status)::text = ANY (ARRAY[('deposed'::character varying)::text, ('sent'::character varying)::text]))))),
    CONSTRAINT prospecting_campaign_companies_execution_status_check CHECK (((execution_status)::text = ANY (ARRAY[('pending_execution'::character varying)::text, ('deposed'::character varying)::text, ('sent'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT prospecting_campaign_companies_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('SENT'::character varying)::text, ('BOUNCED'::character varying)::text, ('REPLIED'::character varying)::text, ('UNDELIVERABLE'::character varying)::text]))),
    CONSTRAINT prospecting_campaign_companies_validation_status_check CHECK (((validation_status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text])))
);


ALTER TABLE public.prospecting_campaign_companies OWNER TO postgres;

--
-- Name: COLUMN prospecting_campaign_companies.validation_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_companies.validation_status IS 'Statut de validation de l''entreprise dans la campagne: PENDING, APPROVED, REJECTED';


--
-- Name: COLUMN prospecting_campaign_companies.execution_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_companies.execution_status IS 'Statut d''exécution: pending_execution, deposed (courrier), sent (email), failed';


--
-- Name: COLUMN prospecting_campaign_companies.converted_to_opportunity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_companies.converted_to_opportunity IS 'Indique si cette entreprise a été convertie en opportunité';


--
-- Name: COLUMN prospecting_campaign_companies.opportunity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_companies.opportunity_id IS 'ID de l''opportunité créée à partir de cette campagne';


--
-- Name: COLUMN prospecting_campaign_companies.execution_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_companies.execution_date IS 'Date d''exécution (dépôt ou envoi)';


--
-- Name: COLUMN prospecting_campaign_companies.execution_notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_companies.execution_notes IS 'Notes sur l''exécution (échec, remarques, etc.)';


--
-- Name: COLUMN prospecting_campaign_companies.execution_file; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_companies.execution_file IS 'Nom du fichier de preuve d''exécution (décharge, capture d''écran, etc.)';


--
-- Name: prospecting_campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospecting_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    channel character varying(20) NOT NULL,
    template_id uuid,
    business_unit_id uuid,
    division_id uuid,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    scheduled_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    validation_statut character varying(20) DEFAULT 'BROUILLON'::character varying,
    date_soumission timestamp with time zone,
    date_validation timestamp with time zone,
    responsible_id uuid,
    priority character varying(20) DEFAULT 'NORMAL'::character varying,
    description text,
    CONSTRAINT prospecting_campaigns_channel_check CHECK (((channel)::text = ANY (ARRAY[('PHYSIQUE'::character varying)::text, ('EMAIL'::character varying)::text]))),
    CONSTRAINT prospecting_campaigns_status_check CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('READY'::character varying)::text, ('SENT'::character varying)::text, ('ARCHIVED'::character varying)::text, ('PENDING_VALIDATION'::character varying)::text, ('VALIDATED'::character varying)::text, ('REJECTED'::character varying)::text]))),
    CONSTRAINT prospecting_campaigns_validation_statut_check CHECK (((validation_statut)::text = ANY (ARRAY[('BROUILLON'::character varying)::text, ('EN_VALIDATION'::character varying)::text, ('VALIDE'::character varying)::text, ('REJETE'::character varying)::text])))
);


ALTER TABLE public.prospecting_campaigns OWNER TO postgres;

--
-- Name: COLUMN prospecting_campaigns.validation_statut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaigns.validation_statut IS 'Statut de validation: BROUILLON, EN_VALIDATION, VALIDE, REJETE';


--
-- Name: COLUMN prospecting_campaigns.responsible_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaigns.responsible_id IS 'Responsable de la campagne de prospection';


--
-- Name: prospecting_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospecting_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    channel character varying(20) NOT NULL,
    type_courrier character varying(40) NOT NULL,
    business_unit_id uuid,
    division_id uuid,
    subject character varying(200),
    body_template text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT prospecting_templates_channel_check CHECK (((channel)::text = ANY (ARRAY[('PHYSIQUE'::character varying)::text, ('EMAIL'::character varying)::text]))),
    CONSTRAINT prospecting_templates_type_courrier_check CHECK (((type_courrier)::text = ANY (ARRAY[('PRESENTATION_GENERALE'::character varying)::text, ('SERVICE_SPECIFIQUE'::character varying)::text])))
);


ALTER TABLE public.prospecting_templates OWNER TO postgres;

--
-- Name: prospecting_campaign_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.prospecting_campaign_summary AS
 SELECT pc.id AS campaign_id,
    pc.name AS campaign_name,
    pc.validation_statut AS campaign_validation_status,
    pt.type_courrier AS template_type,
    bu.nom AS business_unit_name,
    d.nom AS division_name,
    resp.nom AS responsible_name,
    resp.prenom AS responsible_prenom,
    count(pcc.company_id) AS total_companies,
    count(
        CASE
            WHEN ((pcc.validation_status)::text = 'APPROVED'::text) THEN 1
            ELSE NULL::integer
        END) AS approved_companies,
    count(
        CASE
            WHEN ((pcc.validation_status)::text = 'REJECTED'::text) THEN 1
            ELSE NULL::integer
        END) AS rejected_companies,
    count(
        CASE
            WHEN ((pcc.execution_status)::text = 'deposed'::text) THEN 1
            ELSE NULL::integer
        END) AS deposed_count,
    count(
        CASE
            WHEN ((pcc.execution_status)::text = 'sent'::text) THEN 1
            ELSE NULL::integer
        END) AS sent_count,
    count(
        CASE
            WHEN ((pcc.execution_status)::text = 'pending_execution'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_execution_count,
    count(
        CASE
            WHEN (pcc.converted_to_opportunity = true) THEN 1
            ELSE NULL::integer
        END) AS converted_count,
    pc.created_at,
    pc.scheduled_date
   FROM (((((public.prospecting_campaigns pc
     LEFT JOIN public.prospecting_templates pt ON ((pc.template_id = pt.id)))
     LEFT JOIN public.business_units bu ON ((pt.business_unit_id = bu.id)))
     LEFT JOIN public.divisions d ON ((pt.division_id = d.id)))
     LEFT JOIN public.collaborateurs resp ON ((pc.responsible_id = resp.id)))
     LEFT JOIN public.prospecting_campaign_companies pcc ON ((pc.id = pcc.campaign_id)))
  GROUP BY pc.id, pc.name, pc.validation_statut, pt.type_courrier, bu.nom, d.nom, resp.nom, resp.prenom, pc.created_at, pc.scheduled_date;


ALTER VIEW public.prospecting_campaign_summary OWNER TO postgres;

--
-- Name: VIEW prospecting_campaign_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.prospecting_campaign_summary IS 'Vue pour les rapports de campagnes de prospection avec métriques d''exécution et conversion';


--
-- Name: prospecting_campaign_validation_companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospecting_campaign_validation_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    validation_id uuid NOT NULL,
    company_id uuid NOT NULL,
    validation character varying(10) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT prospecting_campaign_validation_companies_validation_check CHECK (((validation)::text = ANY (ARRAY[('OK'::character varying)::text, ('NOT_OK'::character varying)::text])))
);


ALTER TABLE public.prospecting_campaign_validation_companies OWNER TO postgres;

--
-- Name: TABLE prospecting_campaign_validation_companies; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.prospecting_campaign_validation_companies IS 'Table pour stocker les validations individuelles par entreprise dans une campagne de prospection';


--
-- Name: COLUMN prospecting_campaign_validation_companies.validation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_validation_companies.validation IS 'OK = Approuvée, NOT_OK = Rejetée';


--
-- Name: COLUMN prospecting_campaign_validation_companies.note; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_validation_companies.note IS 'Note optionnelle du validateur pour cette entreprise spécifique';


--
-- Name: prospecting_campaign_validations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospecting_campaign_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    demandeur_id uuid NOT NULL,
    validateur_id uuid,
    niveau_validation character varying(20) NOT NULL,
    statut_validation character varying(20) DEFAULT 'EN_ATTENTE'::character varying NOT NULL,
    date_demande timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_validation timestamp with time zone,
    commentaire_demandeur text,
    commentaire_validateur text,
    expires_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT prospecting_campaign_validations_niveau_validation_check CHECK (((niveau_validation)::text = ANY (ARRAY[('DIVISION'::character varying)::text, ('BUSINESS_UNIT'::character varying)::text]))),
    CONSTRAINT prospecting_campaign_validations_statut_validation_check CHECK (((statut_validation)::text = ANY (ARRAY[('EN_ATTENTE'::character varying)::text, ('APPROUVE'::character varying)::text, ('REFUSE'::character varying)::text, ('EXPIRE'::character varying)::text])))
);


ALTER TABLE public.prospecting_campaign_validations OWNER TO postgres;

--
-- Name: TABLE prospecting_campaign_validations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.prospecting_campaign_validations IS 'Workflow de validation hiérarchique des campagnes de prospection';


--
-- Name: COLUMN prospecting_campaign_validations.niveau_validation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_validations.niveau_validation IS 'Niveau de validation: DIVISION (responsable division) ou BUSINESS_UNIT (responsable BU)';


--
-- Name: COLUMN prospecting_campaign_validations.expires_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospecting_campaign_validations.expires_at IS 'Date d expiration de la demande de validation (7 jours par défaut)';


--
-- Name: risk_parameters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parameter_name character varying(100) NOT NULL,
    parameter_value integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.risk_parameters OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid,
    permission_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_system_role boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    badge_bg_class character varying(50),
    badge_text_class character varying(50),
    badge_hex_color character varying(7),
    badge_priority integer
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    checksum character varying(64)
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schema_migrations_id_seq OWNER TO postgres;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: secteurs_activite; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.secteurs_activite (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20),
    description text,
    couleur character varying(7) DEFAULT '#3498db'::character varying,
    icone character varying(50),
    ordre integer DEFAULT 0,
    actif boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.secteurs_activite OWNER TO postgres;

--
-- Name: sous_secteurs_activite; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sous_secteurs_activite (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    secteur_id uuid NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20),
    description text,
    couleur character varying(7) DEFAULT '#3498db'::character varying,
    icone character varying(50),
    ordre integer DEFAULT 0,
    actif boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sous_secteurs_activite OWNER TO postgres;

--
-- Name: stage_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stage_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_id uuid NOT NULL,
    action_type character varying(50) NOT NULL,
    action_title character varying(200) NOT NULL,
    action_description text,
    action_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    performed_by uuid NOT NULL,
    duration_minutes integer,
    outcome character varying(20) DEFAULT 'SUCCESS'::character varying,
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stage_actions_outcome_check CHECK (((outcome)::text = ANY (ARRAY[('SUCCESS'::character varying)::text, ('FAILURE'::character varying)::text, ('PENDING'::character varying)::text, ('CANCELLED'::character varying)::text])))
);


ALTER TABLE public.stage_actions OWNER TO postgres;

--
-- Name: stage_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stage_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_id uuid NOT NULL,
    document_name character varying(255) NOT NULL,
    document_type character varying(50) NOT NULL,
    file_path character varying(500),
    file_size integer,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    is_required boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stage_documents OWNER TO postgres;

--
-- Name: stage_required_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stage_required_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_template_id uuid NOT NULL,
    action_type character varying(120) NOT NULL,
    is_mandatory boolean DEFAULT true NOT NULL,
    validation_order integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.stage_required_actions OWNER TO postgres;

--
-- Name: stage_required_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stage_required_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_template_id uuid NOT NULL,
    document_type character varying(120) NOT NULL,
    is_mandatory boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.stage_required_documents OWNER TO postgres;

--
-- Name: stage_validations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stage_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_id uuid NOT NULL,
    validator_id uuid NOT NULL,
    validation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    validation_notes text,
    required_documents jsonb DEFAULT '[]'::jsonb,
    provided_documents jsonb DEFAULT '[]'::jsonb,
    decision character varying(20) NOT NULL,
    next_stage character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stage_validations_decision_check CHECK (((decision)::text = ANY (ARRAY[('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text, ('PENDING_CHANGES'::character varying)::text])))
);


ALTER TABLE public.stage_validations OWNER TO postgres;

--
-- Name: strategic_objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.strategic_objectives (
    id integer NOT NULL,
    business_unit_id uuid,
    year integer DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
    type character varying(50) NOT NULL,
    target_value numeric(15,2) NOT NULL,
    unit character varying(20) DEFAULT ''::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.strategic_objectives OWNER TO postgres;

--
-- Name: strategic_objectives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.strategic_objectives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.strategic_objectives_id_seq OWNER TO postgres;

--
-- Name: strategic_objectives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.strategic_objectives_id_seq OWNED BY public.strategic_objectives.id;


--
-- Name: super_admin_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admin_audit_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    target_user_id uuid,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.super_admin_audit_log OWNER TO postgres;

--
-- Name: TABLE super_admin_audit_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.super_admin_audit_log IS 'Journal d''audit des actions sensibles liées aux SUPER_ADMIN';


--
-- Name: COLUMN super_admin_audit_log.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.super_admin_audit_log.user_id IS 'ID de l''utilisateur qui effectue l''action';


--
-- Name: COLUMN super_admin_audit_log.action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.super_admin_audit_log.action IS 'Type d''action (ex: SUPER_ADMIN_ROLE_GRANTED, SUPER_ADMIN_USER_MODIFIED)';


--
-- Name: COLUMN super_admin_audit_log.target_user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.super_admin_audit_log.target_user_id IS 'ID de l''utilisateur cible de l''action (si applicable)';


--
-- Name: COLUMN super_admin_audit_log.details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.super_admin_audit_log.details IS 'Détails supplémentaires de l''action au format JSON';


--
-- Name: COLUMN super_admin_audit_log.ip_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.super_admin_audit_log.ip_address IS 'Adresse IP de l''utilisateur';


--
-- Name: COLUMN super_admin_audit_log.user_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.super_admin_audit_log.user_agent IS 'User-Agent du navigateur';


--
-- Name: COLUMN super_admin_audit_log."timestamp"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.super_admin_audit_log."timestamp" IS 'Horodatage de l''action';


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mission_task_id uuid NOT NULL,
    collaborateur_id uuid NOT NULL,
    heures_planifiees integer DEFAULT 0,
    heures_effectuees integer DEFAULT 0,
    taux_horaire numeric(10,2) DEFAULT 0.00,
    statut character varying(20) DEFAULT 'PLANIFIE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT task_assignments_statut_check CHECK (((statut)::text = ANY (ARRAY[('PLANIFIE'::character varying)::text, ('EN_COURS'::character varying)::text, ('TERMINE'::character varying)::text])))
);


ALTER TABLE public.task_assignments OWNER TO postgres;

--
-- Name: task_mission_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_mission_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    mission_type_id uuid NOT NULL,
    ordre integer DEFAULT 0,
    obligatoire boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.task_mission_types OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    libelle character varying(255) NOT NULL,
    description text,
    duree_estimee integer DEFAULT 0,
    priorite character varying(20) DEFAULT 'MOYENNE'::character varying,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    obligatoire boolean DEFAULT false,
    CONSTRAINT tasks_priorite_check CHECK (((priorite)::text = ANY (ARRAY[('BASSE'::character varying)::text, ('MOYENNE'::character varying)::text, ('HAUTE'::character varying)::text, ('CRITIQUE'::character varying)::text])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: taux_horaires; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taux_horaires (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grade_id uuid NOT NULL,
    division_id uuid NOT NULL,
    taux_horaire numeric(10,2) NOT NULL,
    salaire_base numeric(10,2),
    date_effet date NOT NULL,
    date_fin_effet date,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT taux_horaires_salaire_base_check CHECK ((salaire_base > (0)::numeric)),
    CONSTRAINT taux_horaires_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text]))),
    CONSTRAINT taux_horaires_taux_horaire_check CHECK ((taux_horaire > (0)::numeric))
);


ALTER TABLE public.taux_horaires OWNER TO postgres;

--
-- Name: TABLE taux_horaires; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.taux_horaires IS 'Taux horaires et salaires de base par grade et division';


--
-- Name: COLUMN taux_horaires.taux_horaire; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taux_horaires.taux_horaire IS 'Taux horaire en euros';


--
-- Name: COLUMN taux_horaires.salaire_base; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taux_horaires.salaire_base IS 'Salaire de base (optionnel) - peut être NULL si seul le taux horaire est défini';


--
-- Name: COLUMN taux_horaires.date_effet; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taux_horaires.date_effet IS 'Date de début d''application du taux et salaire';


--
-- Name: COLUMN taux_horaires.date_fin_effet; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taux_horaires.date_fin_effet IS 'Date de fin d''application (NULL = toujours valide)';


--
-- Name: taxes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taxes (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    rate numeric(5,2) NOT NULL,
    type character varying(20) DEFAULT 'ADDED'::character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.taxes OWNER TO postgres;

--
-- Name: taxes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.taxes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.taxes_id_seq OWNER TO postgres;

--
-- Name: taxes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.taxes_id_seq OWNED BY public.taxes.id;


--
-- Name: test_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.test_permissions OWNER TO postgres;

--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.time_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    time_sheet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    date_saisie date NOT NULL,
    heures numeric(5,2) DEFAULT 0 NOT NULL,
    type_heures character varying(3) NOT NULL,
    statut character varying(20) DEFAULT 'saisie'::character varying NOT NULL,
    mission_id uuid,
    task_id uuid,
    internal_activity_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_hc_requires_mission CHECK (((((type_heures)::text = 'HC'::text) AND (mission_id IS NOT NULL)) OR (((type_heures)::text = 'HNC'::text) AND (mission_id IS NULL)))),
    CONSTRAINT check_hc_requires_task CHECK (((((type_heures)::text = 'HC'::text) AND (task_id IS NOT NULL)) OR (((type_heures)::text = 'HNC'::text) AND (task_id IS NULL)))),
    CONSTRAINT check_hnc_requires_internal_activity CHECK (((((type_heures)::text = 'HNC'::text) AND (internal_activity_id IS NOT NULL)) OR (((type_heures)::text = 'HC'::text) AND (internal_activity_id IS NULL)))),
    CONSTRAINT time_entries_heures_check CHECK ((heures >= (0)::numeric)),
    CONSTRAINT time_entries_statut_check CHECK (((statut)::text = ANY ((ARRAY['saisie'::character varying, 'soumis'::character varying, 'validé'::character varying, 'rejeté'::character varying])::text[]))),
    CONSTRAINT time_entries_type_heures_check CHECK (((type_heures)::text = ANY ((ARRAY['HC'::character varying, 'HNC'::character varying])::text[])))
);


ALTER TABLE public.time_entries OWNER TO postgres;

--
-- Name: TABLE time_entries; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.time_entries IS 'Entrées d''heures individuelles (HC ou HNC) appartenant à une feuille de temps';


--
-- Name: COLUMN time_entries.type_heures; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.time_entries.type_heures IS 'Type d''heures: HC (Heures Chargeables) ou HNC (Heures Non Chargeables)';


--
-- Name: COLUMN time_entries.statut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.time_entries.statut IS 'Statut de l''entrée d''heures, synchronisé avec la feuille de temps';


--
-- Name: time_entries_detailed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.time_entries_detailed (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    time_sheet_id uuid NOT NULL,
    date_saisie date NOT NULL,
    jour_semaine character varying(10) NOT NULL,
    type_saisie character varying(20) NOT NULL,
    mission_id uuid,
    task_id uuid,
    activity_id uuid,
    heures_matin numeric(4,2) DEFAULT 0,
    heures_apres_midi numeric(4,2) DEFAULT 0,
    total_heures numeric(4,2) GENERATED ALWAYS AS ((heures_matin + heures_apres_midi)) STORED,
    description_matin text,
    description_apres_midi text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_mission_or_activity CHECK (((((type_saisie)::text = 'MISSION'::text) AND (mission_id IS NOT NULL)) OR (((type_saisie)::text = 'ACTIVITE'::text) AND (activity_id IS NOT NULL)))),
    CONSTRAINT check_total_hours CHECK ((total_heures <= (12)::numeric)),
    CONSTRAINT time_entries_detailed_heures_apres_midi_check CHECK (((heures_apres_midi >= (0)::numeric) AND (heures_apres_midi <= (12)::numeric))),
    CONSTRAINT time_entries_detailed_heures_matin_check CHECK (((heures_matin >= (0)::numeric) AND (heures_matin <= (12)::numeric))),
    CONSTRAINT time_entries_detailed_type_saisie_check CHECK (((type_saisie)::text = ANY (ARRAY[('MISSION'::character varying)::text, ('ACTIVITE'::character varying)::text])))
);


ALTER TABLE public.time_entries_detailed OWNER TO postgres;

--
-- Name: time_sheet_approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.time_sheet_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    time_sheet_id uuid NOT NULL,
    supervisor_id uuid NOT NULL,
    action character varying(20) NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.time_sheet_approvals OWNER TO postgres;

--
-- Name: time_sheet_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.time_sheet_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collaborateur_id uuid NOT NULL,
    time_sheet_id uuid,
    type_notification character varying(50) NOT NULL,
    message text NOT NULL,
    semaine integer,
    annee integer,
    lu boolean DEFAULT false,
    date_creation timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_lecture timestamp with time zone,
    CONSTRAINT time_sheet_notifications_type_notification_check CHECK (((type_notification)::text = ANY (ARRAY[('FEUILLE_INCOMPLETE'::character varying)::text, ('FEUILLE_NON_SOUMISE'::character varying)::text, ('FEUILLE_EN_RETARD'::character varying)::text, ('VALIDATION_REQUISE'::character varying)::text])))
);


ALTER TABLE public.time_sheet_notifications OWNER TO postgres;

--
-- Name: time_sheet_supervisors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.time_sheet_supervisors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collaborateur_id uuid NOT NULL,
    supervisor_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.time_sheet_supervisors OWNER TO postgres;

--
-- Name: time_sheets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.time_sheets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    statut character varying(20) DEFAULT 'sauvegardé'::character varying NOT NULL,
    notes_rejet text,
    validateur_id uuid,
    date_validation timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_sheets_statut_check CHECK (((statut)::text = ANY ((ARRAY['sauvegardé'::character varying, 'soumis'::character varying, 'validé'::character varying, 'rejeté'::character varying])::text[])))
);


ALTER TABLE public.time_sheets OWNER TO postgres;

--
-- Name: TABLE time_sheets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.time_sheets IS 'Feuilles de temps hebdomadaires contenant des heures chargeables et non chargeables';


--
-- Name: COLUMN time_sheets.statut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.time_sheets.statut IS 'Statut de la feuille de temps: sauvegardé, soumis, validé, rejeté';


--
-- Name: two_factor_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.two_factor_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    attempt_type character varying(20) NOT NULL,
    success boolean NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT two_factor_attempts_attempt_type_check CHECK (((attempt_type)::text = ANY (ARRAY[('2FA'::character varying)::text, ('BACKUP'::character varying)::text])))
);


ALTER TABLE public.two_factor_attempts OWNER TO postgres;

--
-- Name: TABLE two_factor_attempts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.two_factor_attempts IS 'Audit des tentatives d''authentification à deux facteurs';


--
-- Name: COLUMN two_factor_attempts.attempt_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.two_factor_attempts.attempt_type IS 'Type de tentative: 2FA ou BACKUP';


--
-- Name: COLUMN two_factor_attempts.success; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.two_factor_attempts.success IS 'Indique si la tentative a réussi';


--
-- Name: types_collaborateurs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.types_collaborateurs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT types_collaborateurs_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text])))
);


ALTER TABLE public.types_collaborateurs OWNER TO postgres;

--
-- Name: TABLE types_collaborateurs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.types_collaborateurs IS 'Types de collaborateurs (Consultant, Administratif, Support, Autre)';


--
-- Name: COLUMN types_collaborateurs.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.types_collaborateurs.code IS 'Code unique du type (ADMIN, CONSULTANT)';


--
-- Name: types_heures_non_chargeables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.types_heures_non_chargeables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    division_id uuid,
    description text,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT types_heures_non_chargeables_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text])))
);


ALTER TABLE public.types_heures_non_chargeables OWNER TO postgres;

--
-- Name: TABLE types_heures_non_chargeables; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.types_heures_non_chargeables IS 'Types d''heures non chargeables variables par division';


--
-- Name: user_business_unit_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_business_unit_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_unit_id uuid,
    access_level character varying(20) DEFAULT 'READ'::character varying,
    granted boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_business_unit_access OWNER TO postgres;

--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    permission_id uuid,
    granted boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_permissions OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    nom character varying(50) NOT NULL,
    prenom character varying(50) NOT NULL,
    login character varying(50) NOT NULL,
    role character varying(20) DEFAULT 'USER'::character varying,
    collaborateur_id uuid,
    role_id uuid,
    two_factor_secret character varying(255),
    two_factor_enabled boolean DEFAULT false,
    last_2fa_used timestamp without time zone,
    backup_codes text,
    last_logout timestamp without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ADMIN_IT'::character varying)::text, ('ASSOCIE'::character varying)::text, ('COLLABORATEUR'::character varying)::text, ('CONSULTANT'::character varying)::text, ('DIRECTEUR'::character varying)::text, ('IT'::character varying)::text, ('MANAGER'::character varying)::text, ('SUPER_ADMIN'::character varying)::text, ('SUPER_USER'::character varying)::text, ('SUPERVISEUR'::character varying)::text]))),
    CONSTRAINT users_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text, ('CONGE'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Table des comptes utilisateurs pour l authentification';


--
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.id IS 'Identifiant unique de l utilisateur';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.email IS 'Adresse email unique de l utilisateur';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.password_hash IS 'Hash du mot de passe';


--
-- Name: COLUMN users.statut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.statut IS 'Statut du compte (ACTIF, INACTIF, CONGE)';


--
-- Name: COLUMN users.last_login; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.last_login IS 'Date de dernière connexion';


--
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.created_at IS 'Date de creation du compte';


--
-- Name: COLUMN users.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.updated_at IS 'Date de derniere modification';


--
-- Name: COLUMN users.nom; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.nom IS 'Nom de famille de l utilisateur';


--
-- Name: COLUMN users.prenom; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.prenom IS 'Prénom de l utilisateur';


--
-- Name: COLUMN users.login; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.login IS 'Identifiant de connexion unique';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.role IS 'Rôle principal (deprecated - utiliser user_roles à la place)';


--
-- Name: COLUMN users.collaborateur_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.collaborateur_id IS 'Reference vers le profil collaborateur de l utilisateur (optionnel)';


--
-- Name: COLUMN users.two_factor_secret; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.two_factor_secret IS 'Secret TOTP pour l''authentification à deux facteurs';


--
-- Name: COLUMN users.two_factor_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.two_factor_enabled IS 'Indique si le 2FA est activé pour cet utilisateur';


--
-- Name: COLUMN users.last_2fa_used; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.last_2fa_used IS 'Dernière utilisation du 2FA';


--
-- Name: COLUMN users.backup_codes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.backup_codes IS 'Codes de récupération hashés (JSON array)';


--
-- Name: COLUMN users.last_logout; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.last_logout IS 'Date et heure de la dernière déconnexion de l''utilisateur';


--
-- Name: user_roles_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_roles_view AS
 SELECT u.id AS user_id,
    u.nom,
    u.prenom,
    u.email,
    u.login,
    array_agg(r.name ORDER BY r.name) AS roles,
    array_agg(r.id ORDER BY r.name) AS role_ids,
    array_agg(r.description ORDER BY r.name) AS role_descriptions
   FROM ((public.users u
     LEFT JOIN public.user_roles ur ON ((u.id = ur.user_id)))
     LEFT JOIN public.roles r ON ((ur.role_id = r.id)))
  GROUP BY u.id, u.nom, u.prenom, u.email, u.login;


ALTER VIEW public.user_roles_view OWNER TO postgres;

--
-- Name: VIEW user_roles_view; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.user_roles_view IS 'Vue facilitant l''accès aux rôles multiples des utilisateurs';


--
-- Name: utilisateurs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utilisateurs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    mot_de_passe character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'utilisateur'::character varying,
    actif boolean DEFAULT true,
    date_creation timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_modification timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.utilisateurs OWNER TO postgres;

--
-- Name: v_evaluation_statistics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_evaluation_statistics AS
 SELECT ec.id AS campaign_id,
    ec.name AS campaign_name,
    ec.fiscal_year_id,
    fy.annee AS fiscal_year,
    count(e.id) AS total_evaluations,
    count(
        CASE
            WHEN ((e.status)::text = 'VALIDATED'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_evaluations,
    count(
        CASE
            WHEN ((e.status)::text = 'DRAFT'::text) THEN 1
            ELSE NULL::integer
        END) AS draft_evaluations,
    avg(e.global_score) AS average_score,
    min(e.global_score) AS min_score,
    max(e.global_score) AS max_score
   FROM ((public.evaluation_campaigns ec
     JOIN public.fiscal_years fy ON ((ec.fiscal_year_id = fy.id)))
     LEFT JOIN public.evaluations e ON ((ec.id = e.campaign_id)))
  GROUP BY ec.id, ec.name, ec.fiscal_year_id, fy.annee;


ALTER VIEW public.v_evaluation_statistics OWNER TO postgres;

--
-- Name: v_invoice_payment_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_invoice_payment_status AS
 SELECT i.id AS invoice_id,
    i.numero_facture,
    i.montant_ttc,
    COALESCE(sum(pa.allocated_amount), (0)::numeric) AS total_paid,
    (i.montant_ttc - COALESCE(sum(pa.allocated_amount), (0)::numeric)) AS remaining_amount,
        CASE
            WHEN (COALESCE(sum(pa.allocated_amount), (0)::numeric) = (0)::numeric) THEN 'NON_PAYEE'::text
            WHEN (COALESCE(sum(pa.allocated_amount), (0)::numeric) >= i.montant_ttc) THEN 'PAYEE'::text
            ELSE 'PAYEE_PARTIELLEMENT'::text
        END AS payment_status
   FROM (public.invoices i
     LEFT JOIN public.payment_allocations pa ON ((i.id = pa.invoice_id)))
  GROUP BY i.id, i.numero_facture, i.montant_ttc;


ALTER VIEW public.v_invoice_payment_status OWNER TO postgres;

--
-- Name: VIEW v_invoice_payment_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_invoice_payment_status IS 'Vue pour consulter facilement le statut de paiement des factures';


--
-- Name: v_objectives_hierarchy; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_objectives_hierarchy AS
 SELECT 'GLOBAL'::text AS level,
    go.id,
    go.fiscal_year_id,
    fy.annee AS fiscal_year,
    ot.code AS objective_type_code,
    ot.label AS objective_type_label,
    go.target_value,
    ot.unit,
    NULL::uuid AS business_unit_id,
    NULL::character varying AS business_unit_name,
    NULL::uuid AS division_id,
    NULL::character varying AS division_name,
    NULL::uuid AS collaborator_id,
    NULL::character varying AS collaborator_name
   FROM ((public.global_objectives go
     JOIN public.fiscal_years fy ON ((go.fiscal_year_id = fy.id)))
     JOIN public.objective_types ot ON ((go.objective_type_id = ot.id)))
UNION ALL
 SELECT 'BUSINESS_UNIT'::text AS level,
    buo.id,
    go.fiscal_year_id,
    fy.annee AS fiscal_year,
    ot.code AS objective_type_code,
    ot.label AS objective_type_label,
    buo.target_value,
    ot.unit,
    buo.business_unit_id,
    bu.nom AS business_unit_name,
    NULL::uuid AS division_id,
    NULL::character varying AS division_name,
    NULL::uuid AS collaborator_id,
    NULL::character varying AS collaborator_name
   FROM ((((public.business_unit_objectives buo
     JOIN public.global_objectives go ON ((buo.global_objective_id = go.id)))
     JOIN public.fiscal_years fy ON ((go.fiscal_year_id = fy.id)))
     JOIN public.objective_types ot ON ((go.objective_type_id = ot.id)))
     JOIN public.business_units bu ON ((buo.business_unit_id = bu.id)))
UNION ALL
 SELECT 'DIVISION'::text AS level,
    dobj.id,
    go.fiscal_year_id,
    fy.annee AS fiscal_year,
    ot.code AS objective_type_code,
    ot.label AS objective_type_label,
    dobj.target_value,
    ot.unit,
    buo.business_unit_id,
    bu.nom AS business_unit_name,
    dobj.division_id,
    d.nom AS division_name,
    NULL::uuid AS collaborator_id,
    NULL::character varying AS collaborator_name
   FROM ((((((public.division_objectives dobj
     JOIN public.business_unit_objectives buo ON ((dobj.business_unit_objective_id = buo.id)))
     JOIN public.global_objectives go ON ((buo.global_objective_id = go.id)))
     JOIN public.fiscal_years fy ON ((go.fiscal_year_id = fy.id)))
     JOIN public.objective_types ot ON ((go.objective_type_id = ot.id)))
     JOIN public.business_units bu ON ((buo.business_unit_id = bu.id)))
     JOIN public.divisions d ON ((dobj.division_id = d.id)))
UNION ALL
 SELECT 'INDIVIDUAL'::text AS level,
    io.id,
    go.fiscal_year_id,
    fy.annee AS fiscal_year,
    ot.code AS objective_type_code,
    ot.label AS objective_type_label,
    io.target_value,
    ot.unit,
    buo.business_unit_id,
    bu.nom AS business_unit_name,
    dobj.division_id,
    d.nom AS division_name,
    io.collaborator_id,
    concat(c.prenom, ' ', c.nom) AS collaborator_name
   FROM ((((((((public.individual_objectives io
     JOIN public.division_objectives dobj ON ((io.division_objective_id = dobj.id)))
     JOIN public.business_unit_objectives buo ON ((dobj.business_unit_objective_id = buo.id)))
     JOIN public.global_objectives go ON ((buo.global_objective_id = go.id)))
     JOIN public.fiscal_years fy ON ((go.fiscal_year_id = fy.id)))
     JOIN public.objective_types ot ON ((go.objective_type_id = ot.id)))
     JOIN public.business_units bu ON ((buo.business_unit_id = bu.id)))
     JOIN public.divisions d ON ((dobj.division_id = d.id)))
     JOIN public.collaborateurs c ON ((io.collaborator_id = c.id)));


ALTER VIEW public.v_objectives_hierarchy OWNER TO postgres;

--
-- Name: bu_financial_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bu_financial_settings ALTER COLUMN id SET DEFAULT nextval('public.bu_financial_settings_id_seq'::regclass);


--
-- Name: business_unit_objectives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_unit_objectives ALTER COLUMN id SET DEFAULT nextval('public.business_unit_objectives_id_seq'::regclass);


--
-- Name: division_objectives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_objectives ALTER COLUMN id SET DEFAULT nextval('public.division_objectives_id_seq'::regclass);


--
-- Name: evaluation_campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_campaigns ALTER COLUMN id SET DEFAULT nextval('public.evaluation_campaigns_id_seq'::regclass);


--
-- Name: evaluation_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_comments ALTER COLUMN id SET DEFAULT nextval('public.evaluation_comments_id_seq'::regclass);


--
-- Name: evaluation_objective_scores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_objective_scores ALTER COLUMN id SET DEFAULT nextval('public.evaluation_objective_scores_id_seq'::regclass);


--
-- Name: evaluation_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_templates ALTER COLUMN id SET DEFAULT nextval('public.evaluation_templates_id_seq'::regclass);


--
-- Name: evaluations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations ALTER COLUMN id SET DEFAULT nextval('public.evaluations_id_seq'::regclass);


--
-- Name: global_objectives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_objectives ALTER COLUMN id SET DEFAULT nextval('public.global_objectives_id_seq'::regclass);


--
-- Name: individual_objectives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_objectives ALTER COLUMN id SET DEFAULT nextval('public.individual_objectives_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- Name: objective_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_progress ALTER COLUMN id SET DEFAULT nextval('public.objective_progress_id_seq'::regclass);


--
-- Name: objective_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_types ALTER COLUMN id SET DEFAULT nextval('public.objective_types_id_seq'::regclass);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: strategic_objectives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strategic_objectives ALTER COLUMN id SET DEFAULT nextval('public.strategic_objectives_id_seq'::regclass);


--
-- Name: taxes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxes ALTER COLUMN id SET DEFAULT nextval('public.taxes_id_seq'::regclass);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_business_unit_id_account_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_business_unit_id_account_number_key UNIQUE (business_unit_id, account_number);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bu_financial_settings bu_financial_settings_business_unit_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bu_financial_settings
    ADD CONSTRAINT bu_financial_settings_business_unit_id_key UNIQUE (business_unit_id);


--
-- Name: bu_financial_settings bu_financial_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bu_financial_settings
    ADD CONSTRAINT bu_financial_settings_pkey PRIMARY KEY (id);


--
-- Name: business_unit_objectives business_unit_objectives_global_objective_id_business_unit__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_unit_objectives
    ADD CONSTRAINT business_unit_objectives_global_objective_id_business_unit__key UNIQUE (global_objective_id, business_unit_id);


--
-- Name: business_unit_objectives business_unit_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_unit_objectives
    ADD CONSTRAINT business_unit_objectives_pkey PRIMARY KEY (id);


--
-- Name: clients clients_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_code_key UNIQUE (code);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: collaborateurs collaborateurs_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_email_key UNIQUE (email);


--
-- Name: collaborateurs collaborateurs_matricule_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_matricule_key UNIQUE (matricule);


--
-- Name: collaborateurs collaborateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_source_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_source_name_unique UNIQUE (source_id, name);


--
-- Name: company_imports company_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_imports
    ADD CONSTRAINT company_imports_pkey PRIMARY KEY (id);


--
-- Name: company_sources company_sources_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_sources
    ADD CONSTRAINT company_sources_name_key UNIQUE (name);


--
-- Name: company_sources company_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_sources
    ADD CONSTRAINT company_sources_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: departs_collaborateurs departs_collaborateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departs_collaborateurs
    ADD CONSTRAINT departs_collaborateurs_pkey PRIMARY KEY (id);


--
-- Name: division_objectives division_objectives_business_unit_objective_id_division_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_objectives
    ADD CONSTRAINT division_objectives_business_unit_objective_id_division_id_key UNIQUE (business_unit_objective_id, division_id);


--
-- Name: division_objectives division_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_objectives
    ADD CONSTRAINT division_objectives_pkey PRIMARY KEY (id);


--
-- Name: business_units divisions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT divisions_code_key UNIQUE (code);


--
-- Name: divisions divisions_code_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_code_key1 UNIQUE (code);


--
-- Name: business_units divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey1 PRIMARY KEY (id);


--
-- Name: equipes_mission equipes_mission_mission_id_collaborateur_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipes_mission
    ADD CONSTRAINT equipes_mission_mission_id_collaborateur_id_key UNIQUE (mission_id, collaborateur_id);


--
-- Name: equipes_mission equipes_mission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipes_mission
    ADD CONSTRAINT equipes_mission_pkey PRIMARY KEY (id);


--
-- Name: evaluation_campaigns evaluation_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_campaigns
    ADD CONSTRAINT evaluation_campaigns_pkey PRIMARY KEY (id);


--
-- Name: evaluation_comments evaluation_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_comments
    ADD CONSTRAINT evaluation_comments_pkey PRIMARY KEY (id);


--
-- Name: evaluation_objective_scores evaluation_objective_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_objective_scores
    ADD CONSTRAINT evaluation_objective_scores_pkey PRIMARY KEY (id);


--
-- Name: evaluation_templates evaluation_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_templates
    ADD CONSTRAINT evaluation_templates_pkey PRIMARY KEY (id);


--
-- Name: evaluations evaluations_campaign_id_collaborator_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_campaign_id_collaborator_id_key UNIQUE (campaign_id, collaborator_id);


--
-- Name: evaluations evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (id);


--
-- Name: evolution_grades evolution_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_grades
    ADD CONSTRAINT evolution_grades_pkey PRIMARY KEY (id);


--
-- Name: evolution_organisations evolution_organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_organisations
    ADD CONSTRAINT evolution_organisations_pkey PRIMARY KEY (id);


--
-- Name: evolution_postes evolution_postes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_postes
    ADD CONSTRAINT evolution_postes_pkey PRIMARY KEY (id);


--
-- Name: feuille_temps_entries feuille_temps_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feuille_temps_entries
    ADD CONSTRAINT feuille_temps_entries_pkey PRIMARY KEY (feuille_temps_id, time_entry_id);


--
-- Name: feuilles_temps feuilles_temps_collaborateur_id_semaine_annee_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feuilles_temps
    ADD CONSTRAINT feuilles_temps_collaborateur_id_semaine_annee_key UNIQUE (collaborateur_id, semaine, annee);


--
-- Name: feuilles_temps feuilles_temps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feuilles_temps
    ADD CONSTRAINT feuilles_temps_pkey PRIMARY KEY (id);


--
-- Name: financial_institutions financial_institutions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_institutions
    ADD CONSTRAINT financial_institutions_code_key UNIQUE (code);


--
-- Name: financial_institutions financial_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_institutions
    ADD CONSTRAINT financial_institutions_pkey PRIMARY KEY (id);


--
-- Name: financial_settings financial_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_settings
    ADD CONSTRAINT financial_settings_pkey PRIMARY KEY (key);


--
-- Name: fiscal_years fiscal_years_annee_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT fiscal_years_annee_key UNIQUE (annee);


--
-- Name: fiscal_years fiscal_years_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT fiscal_years_pkey PRIMARY KEY (id);


--
-- Name: global_objectives global_objectives_fiscal_year_id_objective_type_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_objectives
    ADD CONSTRAINT global_objectives_fiscal_year_id_objective_type_id_key UNIQUE (fiscal_year_id, objective_type_id);


--
-- Name: global_objectives global_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_objectives
    ADD CONSTRAINT global_objectives_pkey PRIMARY KEY (id);


--
-- Name: grade_objectives grade_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_objectives
    ADD CONSTRAINT grade_objectives_pkey PRIMARY KEY (id);


--
-- Name: grades grades_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_code_key UNIQUE (code);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: hourly_rates hourly_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hourly_rates
    ADD CONSTRAINT hourly_rates_pkey PRIMARY KEY (id);


--
-- Name: individual_objectives individual_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_objectives
    ADD CONSTRAINT individual_objectives_pkey PRIMARY KEY (id);


--
-- Name: internal_activities internal_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activities
    ADD CONSTRAINT internal_activities_pkey PRIMARY KEY (id);


--
-- Name: internal_activity_business_units internal_activity_business_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_business_units
    ADD CONSTRAINT internal_activity_business_units_pkey PRIMARY KEY (id);


--
-- Name: internal_activity_time_entries internal_activity_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_time_entries
    ADD CONSTRAINT internal_activity_time_entries_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_payments invoice_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_pkey PRIMARY KEY (id);


--
-- Name: invoice_time_entries invoice_time_entries_invoice_id_time_entry_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_time_entries
    ADD CONSTRAINT invoice_time_entries_invoice_id_time_entry_id_key UNIQUE (invoice_id, time_entry_id);


--
-- Name: invoice_time_entries invoice_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_time_entries
    ADD CONSTRAINT invoice_time_entries_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_numero_facture_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_numero_facture_key UNIQUE (numero_facture);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_code_key UNIQUE (code);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menu_sections menu_sections_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_sections
    ADD CONSTRAINT menu_sections_code_key UNIQUE (code);


--
-- Name: menu_sections menu_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_sections
    ADD CONSTRAINT menu_sections_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_filename_key UNIQUE (filename);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: mission_tasks mission_tasks_mission_id_task_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mission_tasks
    ADD CONSTRAINT mission_tasks_mission_id_task_id_key UNIQUE (mission_id, task_id);


--
-- Name: mission_tasks mission_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mission_tasks
    ADD CONSTRAINT mission_tasks_pkey PRIMARY KEY (id);


--
-- Name: mission_types mission_types_codification_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mission_types
    ADD CONSTRAINT mission_types_codification_key UNIQUE (codification);


--
-- Name: mission_types mission_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mission_types
    ADD CONSTRAINT mission_types_pkey PRIMARY KEY (id);


--
-- Name: missions missions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_code_key UNIQUE (code);


--
-- Name: missions missions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: objective_metric_sources objective_metric_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_metric_sources
    ADD CONSTRAINT objective_metric_sources_pkey PRIMARY KEY (id);


--
-- Name: objective_metrics objective_metrics_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_metrics
    ADD CONSTRAINT objective_metrics_code_key UNIQUE (code);


--
-- Name: objective_metrics objective_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_metrics
    ADD CONSTRAINT objective_metrics_pkey PRIMARY KEY (id);


--
-- Name: objective_progress objective_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_progress
    ADD CONSTRAINT objective_progress_pkey PRIMARY KEY (id);


--
-- Name: objective_types objective_types_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_types
    ADD CONSTRAINT objective_types_code_key UNIQUE (code);


--
-- Name: objective_types objective_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_types
    ADD CONSTRAINT objective_types_pkey PRIMARY KEY (id);


--
-- Name: objective_units objective_units_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_units
    ADD CONSTRAINT objective_units_code_key UNIQUE (code);


--
-- Name: objective_units objective_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_units
    ADD CONSTRAINT objective_units_pkey PRIMARY KEY (id);


--
-- Name: opportunites opportunites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunites
    ADD CONSTRAINT opportunites_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: opportunity_actions opportunity_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_actions
    ADD CONSTRAINT opportunity_actions_pkey PRIMARY KEY (id);


--
-- Name: opportunity_documents opportunity_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_documents
    ADD CONSTRAINT opportunity_documents_pkey PRIMARY KEY (id);


--
-- Name: opportunity_stage_templates opportunity_stage_templates_opportunity_type_id_stage_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stage_templates
    ADD CONSTRAINT opportunity_stage_templates_opportunity_type_id_stage_order_key UNIQUE (opportunity_type_id, stage_order);


--
-- Name: opportunity_stage_templates opportunity_stage_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stage_templates
    ADD CONSTRAINT opportunity_stage_templates_pkey PRIMARY KEY (id);


--
-- Name: opportunity_stages opportunity_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stages
    ADD CONSTRAINT opportunity_stages_pkey PRIMARY KEY (id);


--
-- Name: opportunity_types opportunity_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_types
    ADD CONSTRAINT opportunity_types_name_key UNIQUE (name);


--
-- Name: opportunity_types opportunity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_types
    ADD CONSTRAINT opportunity_types_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: pages pages_url_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_url_key UNIQUE (url);


--
-- Name: payment_allocations payment_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payment_number_key UNIQUE (payment_number);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pays pays_code_pays_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pays
    ADD CONSTRAINT pays_code_pays_key UNIQUE (code_pays);


--
-- Name: pays pays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pays
    ADD CONSTRAINT pays_pkey PRIMARY KEY (id);


--
-- Name: permission_audit_log permission_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_audit_log
    ADD CONSTRAINT permission_audit_log_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: postes postes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postes
    ADD CONSTRAINT postes_code_key UNIQUE (code);


--
-- Name: postes postes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postes
    ADD CONSTRAINT postes_pkey PRIMARY KEY (id);


--
-- Name: prospecting_campaign_companies prospecting_campaign_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_companies
    ADD CONSTRAINT prospecting_campaign_companies_pkey PRIMARY KEY (campaign_id, company_id);


--
-- Name: prospecting_campaign_validation_companies prospecting_campaign_validation_co_validation_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_validation_companies
    ADD CONSTRAINT prospecting_campaign_validation_co_validation_id_company_id_key UNIQUE (validation_id, company_id);


--
-- Name: prospecting_campaign_validation_companies prospecting_campaign_validation_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_validation_companies
    ADD CONSTRAINT prospecting_campaign_validation_companies_pkey PRIMARY KEY (id);


--
-- Name: prospecting_campaign_validations prospecting_campaign_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_validations
    ADD CONSTRAINT prospecting_campaign_validations_pkey PRIMARY KEY (id);


--
-- Name: prospecting_campaigns prospecting_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaigns
    ADD CONSTRAINT prospecting_campaigns_pkey PRIMARY KEY (id);


--
-- Name: prospecting_templates prospecting_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_templates
    ADD CONSTRAINT prospecting_templates_pkey PRIMARY KEY (id);


--
-- Name: risk_parameters risk_parameters_parameter_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_parameters
    ADD CONSTRAINT risk_parameters_parameter_name_key UNIQUE (parameter_name);


--
-- Name: risk_parameters risk_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_parameters
    ADD CONSTRAINT risk_parameters_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: secteurs_activite secteurs_activite_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.secteurs_activite
    ADD CONSTRAINT secteurs_activite_code_key UNIQUE (code);


--
-- Name: secteurs_activite secteurs_activite_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.secteurs_activite
    ADD CONSTRAINT secteurs_activite_pkey PRIMARY KEY (id);


--
-- Name: sous_secteurs_activite sous_secteurs_activite_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sous_secteurs_activite
    ADD CONSTRAINT sous_secteurs_activite_pkey PRIMARY KEY (id);


--
-- Name: stage_actions stage_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_actions
    ADD CONSTRAINT stage_actions_pkey PRIMARY KEY (id);


--
-- Name: stage_documents stage_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_documents
    ADD CONSTRAINT stage_documents_pkey PRIMARY KEY (id);


--
-- Name: stage_required_actions stage_required_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_required_actions
    ADD CONSTRAINT stage_required_actions_pkey PRIMARY KEY (id);


--
-- Name: stage_required_documents stage_required_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_required_documents
    ADD CONSTRAINT stage_required_documents_pkey PRIMARY KEY (id);


--
-- Name: stage_validations stage_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_validations
    ADD CONSTRAINT stage_validations_pkey PRIMARY KEY (id);


--
-- Name: strategic_objectives strategic_objectives_business_unit_id_year_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strategic_objectives
    ADD CONSTRAINT strategic_objectives_business_unit_id_year_type_key UNIQUE (business_unit_id, year, type);


--
-- Name: strategic_objectives strategic_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strategic_objectives
    ADD CONSTRAINT strategic_objectives_pkey PRIMARY KEY (id);


--
-- Name: super_admin_audit_log super_admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_audit_log
    ADD CONSTRAINT super_admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_mission_task_id_collaborateur_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_mission_task_id_collaborateur_id_key UNIQUE (mission_task_id, collaborateur_id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_mission_types task_mission_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_mission_types
    ADD CONSTRAINT task_mission_types_pkey PRIMARY KEY (id);


--
-- Name: task_mission_types task_mission_types_task_id_mission_type_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_mission_types
    ADD CONSTRAINT task_mission_types_task_id_mission_type_id_key UNIQUE (task_id, mission_type_id);


--
-- Name: tasks tasks_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_code_key UNIQUE (code);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: taux_horaires taux_horaires_grade_id_division_id_date_effet_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taux_horaires
    ADD CONSTRAINT taux_horaires_grade_id_division_id_date_effet_key UNIQUE (grade_id, division_id, date_effet);


--
-- Name: taux_horaires taux_horaires_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taux_horaires
    ADD CONSTRAINT taux_horaires_pkey PRIMARY KEY (id);


--
-- Name: taxes taxes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxes
    ADD CONSTRAINT taxes_pkey PRIMARY KEY (id);


--
-- Name: test_permissions test_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_permissions
    ADD CONSTRAINT test_permissions_pkey PRIMARY KEY (id);


--
-- Name: time_entries_detailed time_entries_detailed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries_detailed
    ADD CONSTRAINT time_entries_detailed_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_time_sheet_id_date_saisie_type_heures_mission__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_time_sheet_id_date_saisie_type_heures_mission__key UNIQUE (time_sheet_id, date_saisie, type_heures, mission_id, task_id, internal_activity_id);


--
-- Name: time_sheet_approvals time_sheet_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheet_approvals
    ADD CONSTRAINT time_sheet_approvals_pkey PRIMARY KEY (id);


--
-- Name: time_sheet_notifications time_sheet_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheet_notifications
    ADD CONSTRAINT time_sheet_notifications_pkey PRIMARY KEY (id);


--
-- Name: time_sheet_supervisors time_sheet_supervisors_collaborateur_id_supervisor_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheet_supervisors
    ADD CONSTRAINT time_sheet_supervisors_collaborateur_id_supervisor_id_key UNIQUE (collaborateur_id, supervisor_id);


--
-- Name: time_sheet_supervisors time_sheet_supervisors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheet_supervisors
    ADD CONSTRAINT time_sheet_supervisors_pkey PRIMARY KEY (id);


--
-- Name: time_sheets time_sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheets
    ADD CONSTRAINT time_sheets_pkey PRIMARY KEY (id);


--
-- Name: time_sheets time_sheets_user_id_week_start_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheets
    ADD CONSTRAINT time_sheets_user_id_week_start_key UNIQUE (user_id, week_start);


--
-- Name: time_sheets time_sheets_user_week_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheets
    ADD CONSTRAINT time_sheets_user_week_unique UNIQUE (user_id, week_start);


--
-- Name: two_factor_attempts two_factor_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.two_factor_attempts
    ADD CONSTRAINT two_factor_attempts_pkey PRIMARY KEY (id);


--
-- Name: types_collaborateurs types_collaborateurs_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_collaborateurs
    ADD CONSTRAINT types_collaborateurs_code_key UNIQUE (code);


--
-- Name: types_collaborateurs types_collaborateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_collaborateurs
    ADD CONSTRAINT types_collaborateurs_pkey PRIMARY KEY (id);


--
-- Name: types_heures_non_chargeables types_heures_non_chargeables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_heures_non_chargeables
    ADD CONSTRAINT types_heures_non_chargeables_pkey PRIMARY KEY (id);


--
-- Name: internal_activity_business_units unique_internal_activity_business_unit; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_business_units
    ADD CONSTRAINT unique_internal_activity_business_unit UNIQUE (internal_activity_id, business_unit_id);


--
-- Name: internal_activity_time_entries unique_internal_activity_time_entry; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_time_entries
    ADD CONSTRAINT unique_internal_activity_time_entry UNIQUE (user_id, internal_activity_id, business_unit_id, date);


--
-- Name: user_business_unit_access user_business_unit_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_business_unit_access
    ADD CONSTRAINT user_business_unit_access_pkey PRIMARY KEY (id);


--
-- Name: user_business_unit_access user_business_unit_access_user_id_business_unit_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_business_unit_access
    ADD CONSTRAINT user_business_unit_access_user_id_business_unit_id_key UNIQUE (user_id, business_unit_id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_login_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_login_key UNIQUE (login);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_email_key UNIQUE (email);


--
-- Name: utilisateurs utilisateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (id);


--
-- Name: idx_activities_actif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_actif ON public.activities USING btree (actif);


--
-- Name: idx_activities_business_unit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_business_unit ON public.activities USING btree (business_unit_id);


--
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_type ON public.activities USING btree (type_activite);


--
-- Name: idx_bank_accounts_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_accounts_active ON public.bank_accounts USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_bank_accounts_bu; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_accounts_bu ON public.bank_accounts USING btree (business_unit_id);


--
-- Name: idx_bank_accounts_default; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_accounts_default ON public.bank_accounts USING btree (business_unit_id, is_default) WHERE (is_default = true);


--
-- Name: idx_bank_accounts_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_accounts_institution ON public.bank_accounts USING btree (financial_institution_id);


--
-- Name: idx_bu_financial_settings_bu_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bu_financial_settings_bu_id ON public.bu_financial_settings USING btree (business_unit_id);


--
-- Name: idx_bu_objectives_global; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bu_objectives_global ON public.business_unit_objectives USING btree (global_objective_id);


--
-- Name: idx_bu_objectives_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bu_objectives_parent ON public.business_unit_objectives USING btree (parent_global_objective_id);


--
-- Name: idx_business_units_responsable_adjoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_units_responsable_adjoint ON public.business_units USING btree (responsable_adjoint_id);


--
-- Name: idx_business_units_responsable_principal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_units_responsable_principal ON public.business_units USING btree (responsable_principal_id);


--
-- Name: idx_campaign_validations_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaign_validations_campaign ON public.prospecting_campaign_validations USING btree (campaign_id);


--
-- Name: idx_campaign_validations_demandeur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaign_validations_demandeur ON public.prospecting_campaign_validations USING btree (demandeur_id);


--
-- Name: idx_campaign_validations_niveau; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaign_validations_niveau ON public.prospecting_campaign_validations USING btree (niveau_validation);


--
-- Name: idx_campaign_validations_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaign_validations_statut ON public.prospecting_campaign_validations USING btree (statut_validation);


--
-- Name: idx_campaign_validations_validateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaign_validations_validateur ON public.prospecting_campaign_validations USING btree (validateur_id);


--
-- Name: idx_campaigns_validation_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaigns_validation_statut ON public.prospecting_campaigns USING btree (validation_statut);


--
-- Name: idx_clients_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_collaborateur ON public.clients USING btree (collaborateur_id);


--
-- Name: idx_clients_date_creation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_date_creation ON public.clients USING btree (created_at);


--
-- Name: idx_clients_pays_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_pays_id ON public.clients USING btree (pays_id);


--
-- Name: idx_clients_secteur_activite_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_secteur_activite_id ON public.clients USING btree (secteur_activite_id);


--
-- Name: idx_clients_sous_secteur_activite_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_sous_secteur_activite_id ON public.clients USING btree (sous_secteur_activite_id);


--
-- Name: idx_clients_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_statut ON public.clients USING btree (statut);


--
-- Name: idx_collaborateurs_business_unit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_business_unit ON public.collaborateurs USING btree (business_unit_id);


--
-- Name: idx_collaborateurs_division; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_division ON public.collaborateurs USING btree (division_id);


--
-- Name: idx_collaborateurs_grade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_grade ON public.collaborateurs USING btree (grade_actuel_id);


--
-- Name: idx_collaborateurs_initiales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_initiales ON public.collaborateurs USING btree (initiales);


--
-- Name: idx_collaborateurs_matricule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_matricule ON public.collaborateurs USING btree (matricule);


--
-- Name: idx_collaborateurs_photo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_photo ON public.collaborateurs USING btree (photo_url) WHERE (photo_url IS NOT NULL);


--
-- Name: idx_collaborateurs_poste; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_poste ON public.collaborateurs USING btree (poste_actuel_id);


--
-- Name: idx_collaborateurs_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_statut ON public.collaborateurs USING btree (statut);


--
-- Name: idx_collaborateurs_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_type ON public.collaborateurs USING btree (type_collaborateur_id);


--
-- Name: idx_collaborateurs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collaborateurs_user ON public.collaborateurs USING btree (user_id);


--
-- Name: idx_collaborateurs_user_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_collaborateurs_user_unique ON public.collaborateurs USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_companies_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_name ON public.companies USING btree (name);


--
-- Name: idx_companies_sigle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_sigle ON public.companies USING btree (sigle) WHERE (sigle IS NOT NULL);


--
-- Name: idx_companies_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_source ON public.companies USING btree (source_id);


--
-- Name: idx_companies_source_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_source_name ON public.companies USING btree (source_id, name) WHERE (source_id IS NOT NULL);


--
-- Name: idx_company_imports_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_company_imports_source ON public.company_imports USING btree (source_id);


--
-- Name: idx_contacts_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_client ON public.contacts USING btree (client_id);


--
-- Name: idx_contacts_principal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_principal ON public.contacts USING btree (est_contact_principal);


--
-- Name: idx_contacts_principal_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_contacts_principal_unique ON public.contacts USING btree (client_id) WHERE (est_contact_principal = true);


--
-- Name: idx_depart_collaborateur_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_depart_collaborateur_id ON public.departs_collaborateurs USING btree (collaborateur_id);


--
-- Name: idx_depart_date_effet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_depart_date_effet ON public.departs_collaborateurs USING btree (date_effet);


--
-- Name: idx_depart_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_depart_type ON public.departs_collaborateurs USING btree (type_depart);


--
-- Name: idx_division_objectives_bu; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_division_objectives_bu ON public.division_objectives USING btree (business_unit_objective_id);


--
-- Name: idx_division_objectives_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_division_objectives_parent ON public.division_objectives USING btree (parent_bu_objective_id);


--
-- Name: idx_divisions_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_divisions_code ON public.business_units USING btree (code);


--
-- Name: idx_divisions_responsable_adjoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_divisions_responsable_adjoint ON public.divisions USING btree (responsable_adjoint_id);


--
-- Name: idx_divisions_responsable_principal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_divisions_responsable_principal ON public.divisions USING btree (responsable_principal_id);


--
-- Name: idx_divisions_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_divisions_statut ON public.business_units USING btree (statut);


--
-- Name: idx_equipes_mission_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_equipes_mission_collaborateur ON public.equipes_mission USING btree (collaborateur_id);


--
-- Name: idx_equipes_mission_mission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_equipes_mission_mission ON public.equipes_mission USING btree (mission_id);


--
-- Name: idx_evaluation_comments_evaluation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_comments_evaluation ON public.evaluation_comments USING btree (evaluation_id);


--
-- Name: idx_evaluation_scores_evaluation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_scores_evaluation ON public.evaluation_objective_scores USING btree (evaluation_id);


--
-- Name: idx_evaluations_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluations_campaign ON public.evaluations USING btree (campaign_id);


--
-- Name: idx_evaluations_collaborator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluations_collaborator ON public.evaluations USING btree (collaborator_id);


--
-- Name: idx_evaluations_evaluator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluations_evaluator ON public.evaluations USING btree (evaluator_id);


--
-- Name: idx_evolution_grades_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_grades_collaborateur ON public.evolution_grades USING btree (collaborateur_id);


--
-- Name: idx_evolution_grades_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_grades_dates ON public.evolution_grades USING btree (date_debut, date_fin);


--
-- Name: idx_evolution_grades_grade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_grades_grade ON public.evolution_grades USING btree (grade_id);


--
-- Name: idx_evolution_organisations_business_unit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_organisations_business_unit ON public.evolution_organisations USING btree (business_unit_id);


--
-- Name: idx_evolution_organisations_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_organisations_collaborateur ON public.evolution_organisations USING btree (collaborateur_id);


--
-- Name: idx_evolution_organisations_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_organisations_dates ON public.evolution_organisations USING btree (date_debut, date_fin);


--
-- Name: idx_evolution_organisations_division; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_organisations_division ON public.evolution_organisations USING btree (division_id);


--
-- Name: idx_evolution_postes_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_postes_collaborateur ON public.evolution_postes USING btree (collaborateur_id);


--
-- Name: idx_evolution_postes_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_postes_dates ON public.evolution_postes USING btree (date_debut, date_fin);


--
-- Name: idx_evolution_postes_poste; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evolution_postes_poste ON public.evolution_postes USING btree (poste_id);


--
-- Name: idx_feuille_temps_entries_entry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feuille_temps_entries_entry ON public.feuille_temps_entries USING btree (time_entry_id);


--
-- Name: idx_feuille_temps_entries_feuille; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feuille_temps_entries_feuille ON public.feuille_temps_entries USING btree (feuille_temps_id);


--
-- Name: idx_feuilles_temps_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feuilles_temps_collaborateur ON public.feuilles_temps USING btree (collaborateur_id);


--
-- Name: idx_feuilles_temps_semaine_annee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feuilles_temps_semaine_annee ON public.feuilles_temps USING btree (semaine, annee);


--
-- Name: idx_feuilles_temps_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feuilles_temps_statut ON public.feuilles_temps USING btree (statut);


--
-- Name: idx_feuilles_temps_validateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feuilles_temps_validateur ON public.feuilles_temps USING btree (validateur_id);


--
-- Name: idx_financial_institutions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_financial_institutions_active ON public.financial_institutions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_financial_institutions_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_financial_institutions_code ON public.financial_institutions USING btree (code);


--
-- Name: idx_financial_institutions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_financial_institutions_type ON public.financial_institutions USING btree (type);


--
-- Name: idx_fiscal_years_annee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fiscal_years_annee ON public.fiscal_years USING btree (annee);


--
-- Name: idx_fiscal_years_libelle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fiscal_years_libelle ON public.fiscal_years USING btree (libelle);


--
-- Name: idx_fiscal_years_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fiscal_years_statut ON public.fiscal_years USING btree (statut);


--
-- Name: idx_global_objectives_fiscal_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_global_objectives_fiscal_year ON public.global_objectives USING btree (fiscal_year_id);


--
-- Name: idx_grades_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grades_code ON public.grades USING btree (code);


--
-- Name: idx_grades_division; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grades_division ON public.grades USING btree (division_id);


--
-- Name: idx_grades_niveau; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grades_niveau ON public.grades USING btree (niveau);


--
-- Name: idx_hourly_rates_date_effet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hourly_rates_date_effet ON public.hourly_rates USING btree (date_effet);


--
-- Name: idx_hourly_rates_grade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hourly_rates_grade ON public.hourly_rates USING btree (grade);


--
-- Name: idx_hourly_rates_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hourly_rates_statut ON public.hourly_rates USING btree (statut);


--
-- Name: idx_individual_objectives_collaborator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_individual_objectives_collaborator ON public.individual_objectives USING btree (collaborator_id);


--
-- Name: idx_individual_objectives_division; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_individual_objectives_division ON public.individual_objectives USING btree (division_objective_id);


--
-- Name: idx_individual_objectives_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_individual_objectives_parent ON public.individual_objectives USING btree (parent_division_objective_id);


--
-- Name: idx_internal_activities_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activities_active ON public.internal_activities USING btree (is_active);


--
-- Name: idx_internal_activities_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activities_name ON public.internal_activities USING btree (name);


--
-- Name: idx_internal_activity_business_units_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activity_business_units_active ON public.internal_activity_business_units USING btree (is_active);


--
-- Name: idx_internal_activity_business_units_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activity_business_units_activity ON public.internal_activity_business_units USING btree (internal_activity_id);


--
-- Name: idx_internal_activity_business_units_business_unit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activity_business_units_business_unit ON public.internal_activity_business_units USING btree (business_unit_id);


--
-- Name: idx_internal_activity_time_entries_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activity_time_entries_activity ON public.internal_activity_time_entries USING btree (internal_activity_id);


--
-- Name: idx_internal_activity_time_entries_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activity_time_entries_approved ON public.internal_activity_time_entries USING btree (is_approved);


--
-- Name: idx_internal_activity_time_entries_business_unit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activity_time_entries_business_unit ON public.internal_activity_time_entries USING btree (business_unit_id);


--
-- Name: idx_internal_activity_time_entries_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activity_time_entries_date ON public.internal_activity_time_entries USING btree (date);


--
-- Name: idx_internal_activity_time_entries_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_internal_activity_time_entries_user ON public.internal_activity_time_entries USING btree (user_id);


--
-- Name: idx_invoice_items_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);


--
-- Name: idx_invoice_items_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_items_task_id ON public.invoice_items USING btree (task_id);


--
-- Name: idx_invoice_payments_date_paiement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_payments_date_paiement ON public.invoice_payments USING btree (date_paiement);


--
-- Name: idx_invoice_payments_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments USING btree (invoice_id);


--
-- Name: idx_invoice_payments_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_payments_statut ON public.invoice_payments USING btree (statut);


--
-- Name: idx_invoice_time_entries_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_time_entries_invoice ON public.invoice_time_entries USING btree (invoice_id);


--
-- Name: idx_invoice_time_entries_time_entry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_time_entries_time_entry ON public.invoice_time_entries USING btree (time_entry_id);


--
-- Name: idx_invoices_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_client ON public.invoices USING btree (client_id);


--
-- Name: idx_invoices_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_client_id ON public.invoices USING btree (client_id);


--
-- Name: idx_invoices_date_echeance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_date_echeance ON public.invoices USING btree (date_echeance);


--
-- Name: idx_invoices_date_emission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_date_emission ON public.invoices USING btree (date_emission);


--
-- Name: idx_invoices_emission_validated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_emission_validated_by ON public.invoices USING btree (emission_validated_by);


--
-- Name: idx_invoices_fiscal_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_fiscal_year ON public.invoices USING btree (fiscal_year_id);


--
-- Name: idx_invoices_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_statut ON public.invoices USING btree (statut);


--
-- Name: idx_invoices_submitted_emission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_submitted_emission ON public.invoices USING btree (submitted_for_emission_at);


--
-- Name: idx_invoices_submitted_validation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_submitted_validation ON public.invoices USING btree (submitted_for_validation_at);


--
-- Name: idx_invoices_validated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_validated_by ON public.invoices USING btree (validated_by);


--
-- Name: idx_invoices_workflow_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_workflow_status ON public.invoices USING btree (workflow_status);


--
-- Name: idx_menu_items_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_items_code ON public.menu_items USING btree (code);


--
-- Name: idx_menu_items_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_items_order ON public.menu_items USING btree (display_order);


--
-- Name: idx_menu_items_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_items_section ON public.menu_items USING btree (section_id);


--
-- Name: idx_menu_sections_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_sections_code ON public.menu_sections USING btree (code);


--
-- Name: idx_metric_sources_metric; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_metric_sources_metric ON public.objective_metric_sources USING btree (metric_id);


--
-- Name: idx_metric_sources_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_metric_sources_type ON public.objective_metric_sources USING btree (objective_type_id);


--
-- Name: idx_migrations_filename; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_migrations_filename ON public.schema_migrations USING btree (filename);


--
-- Name: idx_mission_tasks_mission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mission_tasks_mission_id ON public.mission_tasks USING btree (mission_id);


--
-- Name: idx_mission_tasks_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mission_tasks_statut ON public.mission_tasks USING btree (statut);


--
-- Name: idx_mission_tasks_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mission_tasks_task_id ON public.mission_tasks USING btree (task_id);


--
-- Name: idx_mission_types_actif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mission_types_actif ON public.mission_types USING btree (actif);


--
-- Name: idx_mission_types_codification; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mission_types_codification ON public.mission_types USING btree (codification);


--
-- Name: idx_mission_types_division; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mission_types_division ON public.mission_types USING btree (division_id);


--
-- Name: idx_missions_associe_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_associe_id ON public.missions USING btree (associe_id);


--
-- Name: idx_missions_business_unit_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_business_unit_id ON public.missions USING btree (business_unit_id);


--
-- Name: idx_missions_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_client_id ON public.missions USING btree (client_id);


--
-- Name: idx_missions_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_code ON public.missions USING btree (code);


--
-- Name: idx_missions_collaborateur_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_collaborateur_id ON public.missions USING btree (collaborateur_id);


--
-- Name: idx_missions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_created_at ON public.missions USING btree (created_at);


--
-- Name: idx_missions_date_debut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_date_debut ON public.missions USING btree (date_debut);


--
-- Name: idx_missions_date_fin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_date_fin ON public.missions USING btree (date_fin);


--
-- Name: idx_missions_division_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_division_id ON public.missions USING btree (division_id);


--
-- Name: idx_missions_fiscal_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_fiscal_year ON public.missions USING btree (fiscal_year_id);


--
-- Name: idx_missions_mission_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_mission_type_id ON public.missions USING btree (mission_type_id);


--
-- Name: idx_missions_opportunity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_opportunity_id ON public.missions USING btree (opportunity_id);


--
-- Name: idx_missions_opportunity_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_missions_opportunity_unique ON public.missions USING btree (opportunity_id) WHERE (opportunity_id IS NOT NULL);


--
-- Name: idx_missions_priorite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_priorite ON public.missions USING btree (priorite);


--
-- Name: idx_missions_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_missions_statut ON public.missions USING btree (statut);


--
-- Name: idx_notification_settings_user_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_settings_user_category ON public.notification_settings USING btree (user_id, category);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_opportunity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_opportunity_id ON public.notifications USING btree (opportunity_id);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_priority ON public.notifications USING btree (priority);


--
-- Name: idx_notifications_read_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at);


--
-- Name: idx_notifications_stage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_stage_id ON public.notifications USING btree (stage_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, read_at) WHERE (read_at IS NULL);


--
-- Name: idx_oa_opp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_oa_opp ON public.opportunity_actions USING btree (opportunity_id);


--
-- Name: idx_oa_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_oa_stage ON public.opportunity_actions USING btree (stage_id);


--
-- Name: idx_objective_progress_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objective_progress_type_id ON public.objective_progress USING btree (objective_type, objective_id);


--
-- Name: idx_objective_types_entity_operation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objective_types_entity_operation ON public.objective_types USING btree (entity_type, operation);


--
-- Name: idx_objectives_metric; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objectives_metric ON public.global_objectives USING btree (metric_id);


--
-- Name: idx_objectives_metric_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objectives_metric_code ON public.global_objectives USING btree (metric_code);


--
-- Name: idx_objectives_mode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objectives_mode ON public.global_objectives USING btree (objective_mode);


--
-- Name: idx_od_opp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_od_opp ON public.opportunity_documents USING btree (opportunity_id);


--
-- Name: idx_od_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_od_stage ON public.opportunity_documents USING btree (stage_id);


--
-- Name: idx_opportunites_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunites_client ON public.opportunites USING btree (client_id);


--
-- Name: idx_opportunites_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunites_collaborateur ON public.opportunites USING btree (collaborateur_id);


--
-- Name: idx_opportunites_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunites_statut ON public.opportunites USING btree (statut);


--
-- Name: idx_opportunities_business_unit_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_business_unit_id ON public.opportunities USING btree (business_unit_id);


--
-- Name: idx_opportunities_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_client_id ON public.opportunities USING btree (client_id);


--
-- Name: idx_opportunities_collaborateur_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_collaborateur_id ON public.opportunities USING btree (collaborateur_id);


--
-- Name: idx_opportunities_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_created_at ON public.opportunities USING btree (created_at);


--
-- Name: idx_opportunities_date_fermeture_prevue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_date_fermeture_prevue ON public.opportunities USING btree (date_fermeture_prevue);


--
-- Name: idx_opportunities_fiscal_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_fiscal_year ON public.opportunities USING btree (fiscal_year_id);


--
-- Name: idx_opportunities_opportunity_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_opportunity_type_id ON public.opportunities USING btree (opportunity_type_id);


--
-- Name: idx_opportunities_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_statut ON public.opportunities USING btree (statut);


--
-- Name: idx_opportunity_stages_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunity_stages_due_date ON public.opportunity_stages USING btree (due_date);


--
-- Name: idx_opportunity_stages_opportunity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunity_stages_opportunity_id ON public.opportunity_stages USING btree (opportunity_id);


--
-- Name: idx_opportunity_stages_overdue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunity_stages_overdue ON public.opportunity_stages USING btree (status, due_date) WHERE ((status)::text = 'IN_PROGRESS'::text);


--
-- Name: idx_opportunity_stages_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunity_stages_priority ON public.opportunity_stages USING btree (priority_level);


--
-- Name: idx_opportunity_stages_risk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunity_stages_risk ON public.opportunity_stages USING btree (risk_level);


--
-- Name: idx_opportunity_stages_stage_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunity_stages_stage_order ON public.opportunity_stages USING btree (stage_order);


--
-- Name: idx_opportunity_stages_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunity_stages_status ON public.opportunity_stages USING btree (status);


--
-- Name: idx_pages_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_url ON public.pages USING btree (url);


--
-- Name: idx_payment_allocations_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_allocations_date ON public.payment_allocations USING btree (allocation_date);


--
-- Name: idx_payment_allocations_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_allocations_invoice ON public.payment_allocations USING btree (invoice_id);


--
-- Name: idx_payment_allocations_payment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_allocations_payment ON public.payment_allocations USING btree (payment_id);


--
-- Name: idx_payments_bank_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_bank_account ON public.payments USING btree (bank_account_id);


--
-- Name: idx_payments_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_created_by ON public.payments USING btree (created_by);


--
-- Name: idx_payments_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_date ON public.payments USING btree (payment_date);


--
-- Name: idx_payments_mode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_mode ON public.payments USING btree (payment_mode);


--
-- Name: idx_payments_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_number ON public.payments USING btree (payment_number);


--
-- Name: idx_pays_actif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pays_actif ON public.pays USING btree (actif);


--
-- Name: idx_pays_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pays_code ON public.pays USING btree (code_pays);


--
-- Name: idx_pcc_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pcc_campaign ON public.prospecting_campaign_companies USING btree (campaign_id);


--
-- Name: idx_pcc_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pcc_company ON public.prospecting_campaign_companies USING btree (company_id);


--
-- Name: idx_pcc_converted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pcc_converted ON public.prospecting_campaign_companies USING btree (converted_to_opportunity);


--
-- Name: idx_pcc_execution_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pcc_execution_status ON public.prospecting_campaign_companies USING btree (execution_status);


--
-- Name: idx_pcc_opportunity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pcc_opportunity ON public.prospecting_campaign_companies USING btree (opportunity_id);


--
-- Name: idx_pcc_validation_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pcc_validation_status ON public.prospecting_campaign_companies USING btree (validation_status);


--
-- Name: idx_permission_audit_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permission_audit_created_at ON public.permission_audit_log USING btree (created_at);


--
-- Name: idx_permission_audit_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permission_audit_user_id ON public.permission_audit_log USING btree (user_id);


--
-- Name: idx_postes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_postes_code ON public.postes USING btree (code);


--
-- Name: idx_postes_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_postes_statut ON public.postes USING btree (statut);


--
-- Name: idx_postes_type_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_postes_type_collaborateur ON public.postes USING btree (type_collaborateur_id);


--
-- Name: idx_prospecting_campaign_companies_execution_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospecting_campaign_companies_execution_file ON public.prospecting_campaign_companies USING btree (execution_file);


--
-- Name: idx_prospecting_campaigns_bu; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospecting_campaigns_bu ON public.prospecting_campaigns USING btree (business_unit_id);


--
-- Name: idx_prospecting_campaigns_div; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospecting_campaigns_div ON public.prospecting_campaigns USING btree (division_id);


--
-- Name: idx_prospecting_campaigns_responsible; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospecting_campaigns_responsible ON public.prospecting_campaigns USING btree (responsible_id);


--
-- Name: idx_prospecting_templates_bu; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospecting_templates_bu ON public.prospecting_templates USING btree (business_unit_id);


--
-- Name: idx_prospecting_templates_div; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospecting_templates_div ON public.prospecting_templates USING btree (division_id);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_secteurs_actif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_secteurs_actif ON public.secteurs_activite USING btree (actif);


--
-- Name: idx_secteurs_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_secteurs_code ON public.secteurs_activite USING btree (code);


--
-- Name: idx_sous_secteurs_actif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sous_secteurs_actif ON public.sous_secteurs_activite USING btree (actif);


--
-- Name: idx_sous_secteurs_secteur_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sous_secteurs_secteur_id ON public.sous_secteurs_activite USING btree (secteur_id);


--
-- Name: idx_sra_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sra_template ON public.stage_required_actions USING btree (stage_template_id);


--
-- Name: idx_srd_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_srd_template ON public.stage_required_documents USING btree (stage_template_id);


--
-- Name: idx_stage_actions_stage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_actions_stage_id ON public.stage_actions USING btree (stage_id);


--
-- Name: idx_stage_documents_stage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_documents_stage_id ON public.stage_documents USING btree (stage_id);


--
-- Name: idx_stage_templates_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_templates_type_id ON public.opportunity_stage_templates USING btree (opportunity_type_id);


--
-- Name: idx_stage_validations_stage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_validations_stage_id ON public.stage_validations USING btree (stage_id);


--
-- Name: idx_super_admin_audit_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admin_audit_action ON public.super_admin_audit_log USING btree (action);


--
-- Name: idx_super_admin_audit_target_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admin_audit_target_user ON public.super_admin_audit_log USING btree (target_user_id);


--
-- Name: idx_super_admin_audit_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admin_audit_timestamp ON public.super_admin_audit_log USING btree ("timestamp" DESC);


--
-- Name: idx_super_admin_audit_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admin_audit_user_id ON public.super_admin_audit_log USING btree (user_id);


--
-- Name: idx_task_assignments_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_assignments_collaborateur ON public.task_assignments USING btree (collaborateur_id, mission_task_id);


--
-- Name: idx_task_assignments_collaborateur_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_assignments_collaborateur_id ON public.task_assignments USING btree (collaborateur_id);


--
-- Name: idx_task_assignments_mission_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_assignments_mission_task_id ON public.task_assignments USING btree (mission_task_id);


--
-- Name: idx_task_mission_types_mission_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_mission_types_mission_type_id ON public.task_mission_types USING btree (mission_type_id);


--
-- Name: idx_task_mission_types_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_mission_types_task_id ON public.task_mission_types USING btree (task_id);


--
-- Name: idx_tasks_actif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_actif ON public.tasks USING btree (actif);


--
-- Name: idx_tasks_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_code ON public.tasks USING btree (code);


--
-- Name: idx_taux_horaires_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taux_horaires_dates ON public.taux_horaires USING btree (date_effet, date_fin_effet);


--
-- Name: idx_taux_horaires_division; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taux_horaires_division ON public.taux_horaires USING btree (division_id);


--
-- Name: idx_taux_horaires_grade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taux_horaires_grade ON public.taux_horaires USING btree (grade_id);


--
-- Name: idx_taux_horaires_grade_division; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taux_horaires_grade_division ON public.taux_horaires USING btree (grade_id, division_id);


--
-- Name: idx_taux_horaires_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taux_horaires_statut ON public.taux_horaires USING btree (statut);


--
-- Name: idx_time_entries_detailed_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_detailed_activity ON public.time_entries_detailed USING btree (activity_id);


--
-- Name: idx_time_entries_detailed_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_detailed_date ON public.time_entries_detailed USING btree (date_saisie);


--
-- Name: idx_time_entries_detailed_mission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_detailed_mission ON public.time_entries_detailed USING btree (mission_id);


--
-- Name: idx_time_entries_detailed_time_sheet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_detailed_time_sheet ON public.time_entries_detailed USING btree (time_sheet_id);


--
-- Name: idx_time_entries_detailed_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_detailed_type ON public.time_entries_detailed USING btree (type_saisie);


--
-- Name: idx_time_entries_internal_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_internal_activity ON public.time_entries USING btree (internal_activity_id);


--
-- Name: idx_time_entries_mission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_mission ON public.time_entries USING btree (mission_id);


--
-- Name: idx_time_entries_time_sheet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_time_sheet ON public.time_entries USING btree (time_sheet_id);


--
-- Name: idx_time_entries_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_type ON public.time_entries USING btree (type_heures);


--
-- Name: idx_time_entries_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_entries_user_date ON public.time_entries USING btree (user_id, date_saisie);


--
-- Name: idx_time_sheet_approvals_supervisor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_sheet_approvals_supervisor ON public.time_sheet_approvals USING btree (supervisor_id);


--
-- Name: idx_time_sheet_approvals_time_sheet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_sheet_approvals_time_sheet ON public.time_sheet_approvals USING btree (time_sheet_id);


--
-- Name: idx_time_sheet_notifications_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_sheet_notifications_collaborateur ON public.time_sheet_notifications USING btree (collaborateur_id);


--
-- Name: idx_time_sheet_notifications_lu; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_sheet_notifications_lu ON public.time_sheet_notifications USING btree (lu);


--
-- Name: idx_time_sheet_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_sheet_notifications_type ON public.time_sheet_notifications USING btree (type_notification);


--
-- Name: idx_time_sheet_supervisors_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_sheet_supervisors_collaborateur ON public.time_sheet_supervisors USING btree (collaborateur_id);


--
-- Name: idx_time_sheet_supervisors_supervisor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_sheet_supervisors_supervisor ON public.time_sheet_supervisors USING btree (supervisor_id);


--
-- Name: idx_time_sheets_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_sheets_statut ON public.time_sheets USING btree (statut);


--
-- Name: idx_time_sheets_user_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_sheets_user_week ON public.time_sheets USING btree (user_id, week_start);


--
-- Name: idx_two_factor_attempts_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_two_factor_attempts_created_at ON public.two_factor_attempts USING btree (created_at);


--
-- Name: idx_two_factor_attempts_success; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_two_factor_attempts_success ON public.two_factor_attempts USING btree (success);


--
-- Name: idx_two_factor_attempts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_two_factor_attempts_user_id ON public.two_factor_attempts USING btree (user_id);


--
-- Name: idx_types_collaborateurs_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_types_collaborateurs_code ON public.types_collaborateurs USING btree (code);


--
-- Name: idx_types_collaborateurs_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_types_collaborateurs_statut ON public.types_collaborateurs USING btree (statut);


--
-- Name: idx_types_heures_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_types_heures_code ON public.types_heures_non_chargeables USING btree (code);


--
-- Name: idx_types_heures_division; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_types_heures_division ON public.types_heures_non_chargeables USING btree (division_id);


--
-- Name: idx_user_bu_access_bu_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_bu_access_bu_id ON public.user_business_unit_access USING btree (business_unit_id);


--
-- Name: idx_user_bu_access_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_bu_access_user_id ON public.user_business_unit_access USING btree (user_id);


--
-- Name: idx_user_permissions_permission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_permission_id ON public.user_permissions USING btree (permission_id);


--
-- Name: idx_user_permissions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_user_id ON public.user_permissions USING btree (user_id);


--
-- Name: idx_user_roles_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_composite ON public.user_roles USING btree (user_id, role_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_collaborateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_collaborateur ON public.users USING btree (collaborateur_id);


--
-- Name: idx_users_collaborateur_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_collaborateur_unique ON public.users USING btree (collaborateur_id) WHERE (collaborateur_id IS NOT NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_email_unique ON public.users USING btree (email);


--
-- Name: idx_users_last_2fa_used; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_last_2fa_used ON public.users USING btree (last_2fa_used);


--
-- Name: idx_users_last_logout; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_last_logout ON public.users USING btree (last_logout);


--
-- Name: idx_users_login; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_login ON public.users USING btree (login);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_statut ON public.users USING btree (statut);


--
-- Name: idx_users_two_factor_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_two_factor_enabled ON public.users USING btree (two_factor_enabled);


--
-- Name: idx_validation_companies_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_validation_companies_company_id ON public.prospecting_campaign_validation_companies USING btree (company_id);


--
-- Name: idx_validation_companies_validation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_validation_companies_validation_id ON public.prospecting_campaign_validation_companies USING btree (validation_id);


--
-- Name: permissions_code_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX permissions_code_unique ON public.permissions USING btree (code);


--
-- Name: uniq_opportunity_stages_opp_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_opportunity_stages_opp_order ON public.opportunity_stages USING btree (opportunity_id, stage_order);


--
-- Name: user_roles prevent_last_role_deletion; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER prevent_last_role_deletion BEFORE DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.check_user_has_at_least_one_role();


--
-- Name: time_sheets sync_time_entries_status_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_time_entries_status_trigger AFTER UPDATE OF statut ON public.time_sheets FOR EACH ROW EXECUTE FUNCTION public.sync_time_entries_status();


--
-- Name: evaluation_objective_scores trg_calculate_evaluation_score_rate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_calculate_evaluation_score_rate BEFORE INSERT OR UPDATE ON public.evaluation_objective_scores FOR EACH ROW EXECUTE FUNCTION public.calculate_evaluation_score_rate();


--
-- Name: objective_progress trg_calculate_objective_progress_rate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_calculate_objective_progress_rate BEFORE INSERT OR UPDATE ON public.objective_progress FOR EACH ROW EXECUTE FUNCTION public.calculate_objective_progress_rate();


--
-- Name: evaluation_objective_scores trg_update_evaluation_score; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_evaluation_score AFTER INSERT OR UPDATE ON public.evaluation_objective_scores FOR EACH ROW EXECUTE FUNCTION public.update_evaluation_global_score();


--
-- Name: missions trigger_calculate_budget_reel; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_calculate_budget_reel BEFORE INSERT OR UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.calculate_budget_reel();


--
-- Name: invoice_items trigger_calculate_invoice_totals_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_calculate_invoice_totals_delete AFTER DELETE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.calculate_invoice_totals();


--
-- Name: invoice_items trigger_calculate_invoice_totals_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_calculate_invoice_totals_insert AFTER INSERT ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.calculate_invoice_totals();


--
-- Name: invoice_items trigger_calculate_invoice_totals_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_calculate_invoice_totals_update AFTER UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.calculate_invoice_totals();


--
-- Name: opportunities trigger_create_opportunity_stages; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_create_opportunity_stages AFTER INSERT ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.trigger_create_opportunity_stages();


--
-- Name: invoices trigger_generate_invoice_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_generate_invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();


--
-- Name: activities trigger_update_activities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bank_accounts trigger_update_bank_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_bank_accounts_updated_at();


--
-- Name: missions trigger_update_date_fin_reelle; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_date_fin_reelle BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_date_fin_reelle();


--
-- Name: departs_collaborateurs trigger_update_depart_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_depart_updated_at BEFORE UPDATE ON public.departs_collaborateurs FOR EACH ROW EXECUTE FUNCTION public.update_depart_updated_at();


--
-- Name: evolution_organisations trigger_update_evolution_organisations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_evolution_organisations_updated_at BEFORE UPDATE ON public.evolution_organisations FOR EACH ROW EXECUTE FUNCTION public.update_evolution_organisations_updated_at();


--
-- Name: invoice_items trigger_update_invoice_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_invoice_items_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_invoices_updated_at();


--
-- Name: payment_allocations trigger_update_invoice_payment_amounts; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_invoice_payment_amounts AFTER INSERT OR DELETE OR UPDATE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment_amounts();


--
-- Name: invoice_payments trigger_update_invoice_payment_info_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_invoice_payment_info_delete AFTER DELETE ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment_info();


--
-- Name: invoice_payments trigger_update_invoice_payment_info_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_invoice_payment_info_insert AFTER INSERT ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment_info();


--
-- Name: invoice_payments trigger_update_invoice_payment_info_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_invoice_payment_info_update AFTER UPDATE ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment_info();


--
-- Name: invoice_payments trigger_update_invoice_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_invoice_payments_updated_at BEFORE UPDATE ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payments_updated_at();


--
-- Name: notification_settings trigger_update_notification_settings_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_notification_settings_timestamp BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_notification_settings_timestamp();


--
-- Name: opportunity_actions trigger_update_opportunity_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_opportunity_activity AFTER INSERT OR UPDATE ON public.opportunity_actions FOR EACH ROW EXECUTE FUNCTION public.update_opportunity_activity();


--
-- Name: opportunity_stage_templates trigger_update_opportunity_stage_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_opportunity_stage_templates_updated_at BEFORE UPDATE ON public.opportunity_stage_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: opportunity_stages trigger_update_opportunity_stages_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_opportunity_stages_updated_at BEFORE UPDATE ON public.opportunity_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: opportunity_types trigger_update_opportunity_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_opportunity_types_updated_at BEFORE UPDATE ON public.opportunity_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments trigger_update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_payments_updated_at();


--
-- Name: time_entries_detailed trigger_update_time_entries_detailed_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_time_entries_detailed_updated_at BEFORE UPDATE ON public.time_entries_detailed FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: time_entries_detailed trigger_update_time_sheet_totals_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_time_sheet_totals_delete AFTER DELETE ON public.time_entries_detailed FOR EACH ROW EXECUTE FUNCTION public.update_time_sheet_totals();


--
-- Name: time_entries_detailed trigger_update_time_sheet_totals_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_time_sheet_totals_insert AFTER INSERT ON public.time_entries_detailed FOR EACH ROW EXECUTE FUNCTION public.update_time_sheet_totals();


--
-- Name: time_entries_detailed trigger_update_time_sheet_totals_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_time_sheet_totals_update AFTER UPDATE ON public.time_entries_detailed FOR EACH ROW EXECUTE FUNCTION public.update_time_sheet_totals();


--
-- Name: prospecting_campaign_validation_companies trigger_update_validation_companies_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_validation_companies_updated_at BEFORE UPDATE ON public.prospecting_campaign_validation_companies FOR EACH ROW EXECUTE FUNCTION public.update_validation_companies_updated_at();


--
-- Name: prospecting_campaign_validations update_campaign_validations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_campaign_validations_updated_at BEFORE UPDATE ON public.prospecting_campaign_validations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: collaborateurs update_collaborateurs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_collaborateurs_updated_at BEFORE UPDATE ON public.collaborateurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: companies update_companies_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_sources update_company_sources_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_company_sources_updated_at BEFORE UPDATE ON public.company_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contacts update_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: business_units update_divisions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON public.business_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feuilles_temps update_feuilles_temps_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_feuilles_temps_updated_at BEFORE UPDATE ON public.feuilles_temps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fiscal_years update_fiscal_years_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_fiscal_years_updated_at BEFORE UPDATE ON public.fiscal_years FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: grades update_grades_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hourly_rates update_hourly_rates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_hourly_rates_updated_at BEFORE UPDATE ON public.hourly_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mission_tasks update_mission_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mission_tasks_updated_at BEFORE UPDATE ON public.mission_tasks FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: mission_types update_mission_types_modification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mission_types_modification BEFORE UPDATE ON public.mission_types FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: missions update_missions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_missions_updated_at();


--
-- Name: opportunities update_opportunities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_opportunities_updated_at();


--
-- Name: permissions update_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: postes update_postes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_postes_updated_at BEFORE UPDATE ON public.postes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prospecting_campaigns update_prospecting_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_prospecting_campaigns_updated_at BEFORE UPDATE ON public.prospecting_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prospecting_templates update_prospecting_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_prospecting_templates_updated_at BEFORE UPDATE ON public.prospecting_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_assignments update_task_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_task_assignments_updated_at BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: taux_horaires update_taux_horaires_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_taux_horaires_updated_at BEFORE UPDATE ON public.taux_horaires FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: time_entries update_time_entries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: time_sheets update_time_sheets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_time_sheets_updated_at BEFORE UPDATE ON public.time_sheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: types_collaborateurs update_types_collaborateurs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_types_collaborateurs_updated_at BEFORE UPDATE ON public.types_collaborateurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: types_heures_non_chargeables update_types_heures_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_types_heures_updated_at BEFORE UPDATE ON public.types_heures_non_chargeables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clients update_updated_at_column; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_updated_at_column BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_business_unit_access update_user_bu_access_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_bu_access_updated_at BEFORE UPDATE ON public.user_business_unit_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_roles update_user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities activities_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: bank_accounts bank_accounts_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: bank_accounts bank_accounts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: bank_accounts bank_accounts_financial_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_financial_institution_id_fkey FOREIGN KEY (financial_institution_id) REFERENCES public.financial_institutions(id);


--
-- Name: bank_accounts bank_accounts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: bu_financial_settings bu_financial_settings_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bu_financial_settings
    ADD CONSTRAINT bu_financial_settings_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: business_unit_objectives business_unit_objectives_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_unit_objectives
    ADD CONSTRAINT business_unit_objectives_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: business_unit_objectives business_unit_objectives_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_unit_objectives
    ADD CONSTRAINT business_unit_objectives_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: business_unit_objectives business_unit_objectives_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_unit_objectives
    ADD CONSTRAINT business_unit_objectives_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id);


--
-- Name: business_unit_objectives business_unit_objectives_global_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_unit_objectives
    ADD CONSTRAINT business_unit_objectives_global_objective_id_fkey FOREIGN KEY (global_objective_id) REFERENCES public.global_objectives(id) ON DELETE CASCADE;


--
-- Name: business_unit_objectives business_unit_objectives_parent_global_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_unit_objectives
    ADD CONSTRAINT business_unit_objectives_parent_global_objective_id_fkey FOREIGN KEY (parent_global_objective_id) REFERENCES public.global_objectives(id) ON DELETE SET NULL;


--
-- Name: business_units business_units_responsable_adjoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT business_units_responsable_adjoint_id_fkey FOREIGN KEY (responsable_adjoint_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: business_units business_units_responsable_principal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT business_units_responsable_principal_id_fkey FOREIGN KEY (responsable_principal_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: clients clients_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: clients clients_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: clients clients_groupe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_groupe_id_fkey FOREIGN KEY (groupe_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: clients clients_pays_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pays_id_fkey FOREIGN KEY (pays_id) REFERENCES public.pays(id);


--
-- Name: clients clients_secteur_activite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_secteur_activite_id_fkey FOREIGN KEY (secteur_activite_id) REFERENCES public.secteurs_activite(id);


--
-- Name: clients clients_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: collaborateurs collaborateurs_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE RESTRICT;


--
-- Name: collaborateurs collaborateurs_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: collaborateurs collaborateurs_grade_actuel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_grade_actuel_id_fkey FOREIGN KEY (grade_actuel_id) REFERENCES public.grades(id) ON DELETE SET NULL;


--
-- Name: collaborateurs collaborateurs_poste_actuel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_poste_actuel_id_fkey FOREIGN KEY (poste_actuel_id) REFERENCES public.postes(id) ON DELETE SET NULL;


--
-- Name: collaborateurs collaborateurs_type_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_type_collaborateur_id_fkey FOREIGN KEY (type_collaborateur_id) REFERENCES public.types_collaborateurs(id) ON DELETE SET NULL;


--
-- Name: collaborateurs collaborateurs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: companies companies_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.company_sources(id) ON DELETE SET NULL;


--
-- Name: company_imports company_imports_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_imports
    ADD CONSTRAINT company_imports_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.company_sources(id) ON DELETE CASCADE;


--
-- Name: division_objectives division_objectives_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_objectives
    ADD CONSTRAINT division_objectives_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: division_objectives division_objectives_business_unit_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_objectives
    ADD CONSTRAINT division_objectives_business_unit_objective_id_fkey FOREIGN KEY (business_unit_objective_id) REFERENCES public.business_unit_objectives(id) ON DELETE CASCADE;


--
-- Name: division_objectives division_objectives_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_objectives
    ADD CONSTRAINT division_objectives_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE CASCADE;


--
-- Name: division_objectives division_objectives_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_objectives
    ADD CONSTRAINT division_objectives_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id);


--
-- Name: division_objectives division_objectives_objective_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_objectives
    ADD CONSTRAINT division_objectives_objective_type_id_fkey FOREIGN KEY (objective_type_id) REFERENCES public.objective_types(id);


--
-- Name: division_objectives division_objectives_parent_bu_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division_objectives
    ADD CONSTRAINT division_objectives_parent_bu_objective_id_fkey FOREIGN KEY (parent_bu_objective_id) REFERENCES public.business_unit_objectives(id) ON DELETE SET NULL;


--
-- Name: divisions divisions_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: divisions divisions_responsable_adjoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_responsable_adjoint_id_fkey FOREIGN KEY (responsable_adjoint_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: divisions divisions_responsable_principal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_responsable_principal_id_fkey FOREIGN KEY (responsable_principal_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: equipes_mission equipes_mission_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipes_mission
    ADD CONSTRAINT equipes_mission_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: evaluation_campaigns evaluation_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_campaigns
    ADD CONSTRAINT evaluation_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: evaluation_campaigns evaluation_campaigns_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_campaigns
    ADD CONSTRAINT evaluation_campaigns_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE CASCADE;


--
-- Name: evaluation_campaigns evaluation_campaigns_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_campaigns
    ADD CONSTRAINT evaluation_campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.evaluation_templates(id);


--
-- Name: evaluation_comments evaluation_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_comments
    ADD CONSTRAINT evaluation_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: evaluation_comments evaluation_comments_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_comments
    ADD CONSTRAINT evaluation_comments_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.evaluations(id) ON DELETE CASCADE;


--
-- Name: evaluation_comments evaluation_comments_objective_score_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_comments
    ADD CONSTRAINT evaluation_comments_objective_score_id_fkey FOREIGN KEY (objective_score_id) REFERENCES public.evaluation_objective_scores(id);


--
-- Name: evaluation_objective_scores evaluation_objective_scores_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_objective_scores
    ADD CONSTRAINT evaluation_objective_scores_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.evaluations(id) ON DELETE CASCADE;


--
-- Name: evaluation_objective_scores evaluation_objective_scores_individual_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_objective_scores
    ADD CONSTRAINT evaluation_objective_scores_individual_objective_id_fkey FOREIGN KEY (individual_objective_id) REFERENCES public.individual_objectives(id);


--
-- Name: evaluation_templates evaluation_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_templates
    ADD CONSTRAINT evaluation_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: evaluations evaluations_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.evaluation_campaigns(id) ON DELETE CASCADE;


--
-- Name: evaluations evaluations_collaborator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_collaborator_id_fkey FOREIGN KEY (collaborator_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: evaluations evaluations_evaluator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.users(id);


--
-- Name: evolution_grades evolution_grades_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_grades
    ADD CONSTRAINT evolution_grades_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: evolution_grades evolution_grades_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_grades
    ADD CONSTRAINT evolution_grades_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;


--
-- Name: evolution_postes evolution_postes_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_postes
    ADD CONSTRAINT evolution_postes_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: evolution_postes evolution_postes_poste_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_postes
    ADD CONSTRAINT evolution_postes_poste_id_fkey FOREIGN KEY (poste_id) REFERENCES public.postes(id) ON DELETE CASCADE;


--
-- Name: feuille_temps_entries feuille_temps_entries_feuille_temps_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feuille_temps_entries
    ADD CONSTRAINT feuille_temps_entries_feuille_temps_id_fkey FOREIGN KEY (feuille_temps_id) REFERENCES public.feuilles_temps(id) ON DELETE CASCADE;


--
-- Name: feuilles_temps feuilles_temps_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feuilles_temps
    ADD CONSTRAINT feuilles_temps_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: feuilles_temps feuilles_temps_validateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feuilles_temps
    ADD CONSTRAINT feuilles_temps_validateur_id_fkey FOREIGN KEY (validateur_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: financial_settings financial_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_settings
    ADD CONSTRAINT financial_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: clients fk_clients_sous_secteur_activite; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT fk_clients_sous_secteur_activite FOREIGN KEY (sous_secteur_activite_id) REFERENCES public.sous_secteurs_activite(id) ON DELETE SET NULL;


--
-- Name: departs_collaborateurs fk_depart_collaborateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departs_collaborateurs
    ADD CONSTRAINT fk_depart_collaborateur FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: evolution_organisations fk_evolution_organisations_business_unit; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_organisations
    ADD CONSTRAINT fk_evolution_organisations_business_unit FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE RESTRICT;


--
-- Name: evolution_organisations fk_evolution_organisations_collaborateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_organisations
    ADD CONSTRAINT fk_evolution_organisations_collaborateur FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: evolution_organisations fk_evolution_organisations_division; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evolution_organisations
    ADD CONSTRAINT fk_evolution_organisations_division FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE RESTRICT;


--
-- Name: internal_activity_business_units fk_internal_activity_business_units_activity; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_business_units
    ADD CONSTRAINT fk_internal_activity_business_units_activity FOREIGN KEY (internal_activity_id) REFERENCES public.internal_activities(id) ON DELETE CASCADE;


--
-- Name: internal_activity_business_units fk_internal_activity_business_units_business_unit; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_business_units
    ADD CONSTRAINT fk_internal_activity_business_units_business_unit FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: internal_activity_time_entries fk_internal_activity_time_entries_activity; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_time_entries
    ADD CONSTRAINT fk_internal_activity_time_entries_activity FOREIGN KEY (internal_activity_id) REFERENCES public.internal_activities(id) ON DELETE CASCADE;


--
-- Name: internal_activity_time_entries fk_internal_activity_time_entries_approved_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_time_entries
    ADD CONSTRAINT fk_internal_activity_time_entries_approved_by FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: internal_activity_time_entries fk_internal_activity_time_entries_business_unit; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_time_entries
    ADD CONSTRAINT fk_internal_activity_time_entries_business_unit FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: internal_activity_time_entries fk_internal_activity_time_entries_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_activity_time_entries
    ADD CONSTRAINT fk_internal_activity_time_entries_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: objective_metric_sources fk_objective_metric_sources_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_metric_sources
    ADD CONSTRAINT fk_objective_metric_sources_type FOREIGN KEY (objective_type_id) REFERENCES public.objective_types(id) ON DELETE SET NULL;


--
-- Name: super_admin_audit_log fk_target_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_audit_log
    ADD CONSTRAINT fk_target_user FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: super_admin_audit_log fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_audit_log
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: global_objectives global_objectives_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_objectives
    ADD CONSTRAINT global_objectives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: global_objectives global_objectives_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_objectives
    ADD CONSTRAINT global_objectives_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE CASCADE;


--
-- Name: global_objectives global_objectives_objective_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_objectives
    ADD CONSTRAINT global_objectives_objective_type_id_fkey FOREIGN KEY (objective_type_id) REFERENCES public.objective_types(id);


--
-- Name: grade_objectives grade_objectives_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_objectives
    ADD CONSTRAINT grade_objectives_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: grade_objectives grade_objectives_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_objectives
    ADD CONSTRAINT grade_objectives_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id);


--
-- Name: grade_objectives grade_objectives_metric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_objectives
    ADD CONSTRAINT grade_objectives_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.objective_metrics(id);


--
-- Name: grade_objectives grade_objectives_objective_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_objectives
    ADD CONSTRAINT grade_objectives_objective_type_id_fkey FOREIGN KEY (objective_type_id) REFERENCES public.objective_types(id);


--
-- Name: grade_objectives grade_objectives_parent_division_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_objectives
    ADD CONSTRAINT grade_objectives_parent_division_objective_id_fkey FOREIGN KEY (parent_division_objective_id) REFERENCES public.division_objectives(id);


--
-- Name: grade_objectives grade_objectives_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_objectives
    ADD CONSTRAINT grade_objectives_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.objective_units(id);


--
-- Name: grades grades_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: individual_objectives individual_objectives_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_objectives
    ADD CONSTRAINT individual_objectives_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: individual_objectives individual_objectives_collaborator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_objectives
    ADD CONSTRAINT individual_objectives_collaborator_id_fkey FOREIGN KEY (collaborator_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: individual_objectives individual_objectives_division_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_objectives
    ADD CONSTRAINT individual_objectives_division_objective_id_fkey FOREIGN KEY (division_objective_id) REFERENCES public.division_objectives(id) ON DELETE CASCADE;


--
-- Name: individual_objectives individual_objectives_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_objectives
    ADD CONSTRAINT individual_objectives_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id);


--
-- Name: individual_objectives individual_objectives_objective_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_objectives
    ADD CONSTRAINT individual_objectives_objective_type_id_fkey FOREIGN KEY (objective_type_id) REFERENCES public.objective_types(id);


--
-- Name: individual_objectives individual_objectives_parent_division_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_objectives
    ADD CONSTRAINT individual_objectives_parent_division_objective_id_fkey FOREIGN KEY (parent_division_objective_id) REFERENCES public.division_objectives(id) ON DELETE SET NULL;


--
-- Name: individual_objectives individual_objectives_target_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_objectives
    ADD CONSTRAINT individual_objectives_target_grade_id_fkey FOREIGN KEY (target_grade_id) REFERENCES public.grades(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: invoice_payments invoice_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoice_payments invoice_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_time_entries invoice_time_entries_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_time_entries
    ADD CONSTRAINT invoice_time_entries_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_emission_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_emission_validated_by_fkey FOREIGN KEY (emission_validated_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_emitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_emitted_by_fkey FOREIGN KEY (emitted_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_submitted_for_validation_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_submitted_for_validation_by_fkey FOREIGN KEY (submitted_for_validation_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: menu_items menu_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.menu_sections(id) ON DELETE CASCADE;


--
-- Name: mission_tasks mission_tasks_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mission_tasks
    ADD CONSTRAINT mission_tasks_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE;


--
-- Name: mission_tasks mission_tasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mission_tasks
    ADD CONSTRAINT mission_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: mission_types mission_types_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mission_types
    ADD CONSTRAINT mission_types_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: missions missions_associe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_associe_id_fkey FOREIGN KEY (associe_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: missions missions_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE SET NULL;


--
-- Name: missions missions_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: missions missions_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;


--
-- Name: missions missions_mission_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_mission_type_id_fkey FOREIGN KEY (mission_type_id) REFERENCES public.mission_types(id) ON DELETE SET NULL;


--
-- Name: missions missions_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE SET NULL;


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.opportunity_stages(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: objective_metrics objective_metrics_target_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_metrics
    ADD CONSTRAINT objective_metrics_target_unit_id_fkey FOREIGN KEY (target_unit_id) REFERENCES public.objective_units(id);


--
-- Name: objective_progress objective_progress_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_progress
    ADD CONSTRAINT objective_progress_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: opportunites opportunites_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunites
    ADD CONSTRAINT opportunites_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: opportunites opportunites_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunites
    ADD CONSTRAINT opportunites_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: opportunites opportunites_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunites
    ADD CONSTRAINT opportunites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: opportunites opportunites_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunites
    ADD CONSTRAINT opportunites_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.utilisateurs(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id);


--
-- Name: opportunities opportunities_current_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_current_stage_id_fkey FOREIGN KEY (current_stage_id) REFERENCES public.opportunity_stages(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_opportunity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_opportunity_type_id_fkey FOREIGN KEY (opportunity_type_id) REFERENCES public.opportunity_types(id);


--
-- Name: opportunity_actions opportunity_actions_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_actions
    ADD CONSTRAINT opportunity_actions_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_actions opportunity_actions_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_actions
    ADD CONSTRAINT opportunity_actions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: opportunity_actions opportunity_actions_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_actions
    ADD CONSTRAINT opportunity_actions_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.opportunity_stages(id) ON DELETE SET NULL;


--
-- Name: opportunity_documents opportunity_documents_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_documents
    ADD CONSTRAINT opportunity_documents_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_documents opportunity_documents_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_documents
    ADD CONSTRAINT opportunity_documents_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.opportunity_stages(id) ON DELETE SET NULL;


--
-- Name: opportunity_documents opportunity_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_documents
    ADD CONSTRAINT opportunity_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: opportunity_documents opportunity_documents_validator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_documents
    ADD CONSTRAINT opportunity_documents_validator_id_fkey FOREIGN KEY (validator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: opportunity_stage_templates opportunity_stage_templates_opportunity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stage_templates
    ADD CONSTRAINT opportunity_stage_templates_opportunity_type_id_fkey FOREIGN KEY (opportunity_type_id) REFERENCES public.opportunity_types(id) ON DELETE CASCADE;


--
-- Name: opportunity_stages opportunity_stages_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stages
    ADD CONSTRAINT opportunity_stages_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_stages opportunity_stages_stage_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stages
    ADD CONSTRAINT opportunity_stages_stage_template_id_fkey FOREIGN KEY (stage_template_id) REFERENCES public.opportunity_stage_templates(id);


--
-- Name: opportunity_stages opportunity_stages_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stages
    ADD CONSTRAINT opportunity_stages_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: payment_allocations payment_allocations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: payment_allocations payment_allocations_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: payment_allocations payment_allocations_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- Name: payments payments_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: payments payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: payments payments_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: permission_audit_log permission_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_audit_log
    ADD CONSTRAINT permission_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: postes postes_type_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postes
    ADD CONSTRAINT postes_type_collaborateur_id_fkey FOREIGN KEY (type_collaborateur_id) REFERENCES public.types_collaborateurs(id) ON DELETE CASCADE;


--
-- Name: prospecting_campaign_companies prospecting_campaign_companies_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_companies
    ADD CONSTRAINT prospecting_campaign_companies_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.prospecting_campaigns(id) ON DELETE CASCADE;


--
-- Name: prospecting_campaign_companies prospecting_campaign_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_companies
    ADD CONSTRAINT prospecting_campaign_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: prospecting_campaign_validation_companies prospecting_campaign_validation_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_validation_companies
    ADD CONSTRAINT prospecting_campaign_validation_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: prospecting_campaign_validation_companies prospecting_campaign_validation_companies_validation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_validation_companies
    ADD CONSTRAINT prospecting_campaign_validation_companies_validation_id_fkey FOREIGN KEY (validation_id) REFERENCES public.prospecting_campaign_validations(id) ON DELETE CASCADE;


--
-- Name: prospecting_campaign_validations prospecting_campaign_validations_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_validations
    ADD CONSTRAINT prospecting_campaign_validations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.prospecting_campaigns(id) ON DELETE CASCADE;


--
-- Name: prospecting_campaign_validations prospecting_campaign_validations_demandeur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_validations
    ADD CONSTRAINT prospecting_campaign_validations_demandeur_id_fkey FOREIGN KEY (demandeur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: prospecting_campaign_validations prospecting_campaign_validations_validateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaign_validations
    ADD CONSTRAINT prospecting_campaign_validations_validateur_id_fkey FOREIGN KEY (validateur_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: prospecting_campaigns prospecting_campaigns_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaigns
    ADD CONSTRAINT prospecting_campaigns_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE SET NULL;


--
-- Name: prospecting_campaigns prospecting_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaigns
    ADD CONSTRAINT prospecting_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: prospecting_campaigns prospecting_campaigns_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaigns
    ADD CONSTRAINT prospecting_campaigns_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: prospecting_campaigns prospecting_campaigns_responsible_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaigns
    ADD CONSTRAINT prospecting_campaigns_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.collaborateurs(id);


--
-- Name: prospecting_campaigns prospecting_campaigns_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_campaigns
    ADD CONSTRAINT prospecting_campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.prospecting_templates(id) ON DELETE SET NULL;


--
-- Name: prospecting_templates prospecting_templates_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_templates
    ADD CONSTRAINT prospecting_templates_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE SET NULL;


--
-- Name: prospecting_templates prospecting_templates_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospecting_templates
    ADD CONSTRAINT prospecting_templates_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: sous_secteurs_activite sous_secteurs_activite_secteur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sous_secteurs_activite
    ADD CONSTRAINT sous_secteurs_activite_secteur_id_fkey FOREIGN KEY (secteur_id) REFERENCES public.secteurs_activite(id) ON DELETE CASCADE;


--
-- Name: stage_actions stage_actions_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_actions
    ADD CONSTRAINT stage_actions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: stage_actions stage_actions_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_actions
    ADD CONSTRAINT stage_actions_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.opportunity_stages(id) ON DELETE CASCADE;


--
-- Name: stage_documents stage_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_documents
    ADD CONSTRAINT stage_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: stage_required_actions stage_required_actions_stage_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_required_actions
    ADD CONSTRAINT stage_required_actions_stage_template_id_fkey FOREIGN KEY (stage_template_id) REFERENCES public.opportunity_stage_templates(id) ON DELETE CASCADE;


--
-- Name: stage_required_documents stage_required_documents_stage_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_required_documents
    ADD CONSTRAINT stage_required_documents_stage_template_id_fkey FOREIGN KEY (stage_template_id) REFERENCES public.opportunity_stage_templates(id) ON DELETE CASCADE;


--
-- Name: stage_validations stage_validations_validator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_validations
    ADD CONSTRAINT stage_validations_validator_id_fkey FOREIGN KEY (validator_id) REFERENCES public.users(id);


--
-- Name: strategic_objectives strategic_objectives_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.strategic_objectives
    ADD CONSTRAINT strategic_objectives_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id);


--
-- Name: super_admin_audit_log super_admin_audit_log_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_audit_log
    ADD CONSTRAINT super_admin_audit_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: super_admin_audit_log super_admin_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_audit_log
    ADD CONSTRAINT super_admin_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_mission_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_mission_task_id_fkey FOREIGN KEY (mission_task_id) REFERENCES public.mission_tasks(id) ON DELETE CASCADE;


--
-- Name: task_mission_types task_mission_types_mission_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_mission_types
    ADD CONSTRAINT task_mission_types_mission_type_id_fkey FOREIGN KEY (mission_type_id) REFERENCES public.mission_types(id) ON DELETE CASCADE;


--
-- Name: task_mission_types task_mission_types_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_mission_types
    ADD CONSTRAINT task_mission_types_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: taux_horaires taux_horaires_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taux_horaires
    ADD CONSTRAINT taux_horaires_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: taux_horaires taux_horaires_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taux_horaires
    ADD CONSTRAINT taux_horaires_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;


--
-- Name: time_entries_detailed time_entries_detailed_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries_detailed
    ADD CONSTRAINT time_entries_detailed_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE SET NULL;


--
-- Name: time_entries_detailed time_entries_detailed_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries_detailed
    ADD CONSTRAINT time_entries_detailed_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE SET NULL;


--
-- Name: time_entries_detailed time_entries_detailed_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries_detailed
    ADD CONSTRAINT time_entries_detailed_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: time_entries time_entries_internal_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_internal_activity_id_fkey FOREIGN KEY (internal_activity_id) REFERENCES public.internal_activities(id) ON DELETE SET NULL;


--
-- Name: time_entries time_entries_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE SET NULL;


--
-- Name: time_entries time_entries_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: time_entries time_entries_time_sheet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_time_sheet_id_fkey FOREIGN KEY (time_sheet_id) REFERENCES public.time_sheets(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: time_sheet_approvals time_sheet_approvals_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheet_approvals
    ADD CONSTRAINT time_sheet_approvals_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: time_sheet_notifications time_sheet_notifications_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheet_notifications
    ADD CONSTRAINT time_sheet_notifications_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: time_sheet_supervisors time_sheet_supervisors_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheet_supervisors
    ADD CONSTRAINT time_sheet_supervisors_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: time_sheet_supervisors time_sheet_supervisors_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheet_supervisors
    ADD CONSTRAINT time_sheet_supervisors_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: time_sheets time_sheets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheets
    ADD CONSTRAINT time_sheets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: time_sheets time_sheets_validateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_sheets
    ADD CONSTRAINT time_sheets_validateur_id_fkey FOREIGN KEY (validateur_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: two_factor_attempts two_factor_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.two_factor_attempts
    ADD CONSTRAINT two_factor_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: types_heures_non_chargeables types_heures_non_chargeables_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_heures_non_chargeables
    ADD CONSTRAINT types_heures_non_chargeables_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: user_business_unit_access user_business_unit_access_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_business_unit_access
    ADD CONSTRAINT user_business_unit_access_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: user_business_unit_access user_business_unit_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_business_unit_access
    ADD CONSTRAINT user_business_unit_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

