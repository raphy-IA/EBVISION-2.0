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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: calculer_notation_client(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculer_notation_client() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Logique de notation basée sur CA en FCFA, effectif, risque, etc.
    IF NEW.chiffre_affaires > 100000000 THEN
        NEW.notation = 'A';
    ELSIF NEW.chiffre_affaires > 50000000 THEN
        NEW.notation = 'B';
    ELSIF NEW.chiffre_affaires > 10000000 THEN
        NEW.notation = 'C';
    ELSIF NEW.chiffre_affaires > 5000000 THEN
        NEW.notation = 'D';
    ELSE
        NEW.notation = 'E';
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: calculer_risque_client(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculer_risque_client() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Logique de risque basée sur notation, CA, historique, etc.
    IF NEW.notation = 'A' OR NEW.notation = 'B' THEN
        NEW.risque_client = 'faible';
    ELSIF NEW.notation = 'C' THEN
        NEW.risque_client = 'moyen';
    ELSIF NEW.notation = 'D' THEN
        NEW.risque_client = 'eleve';
    ELSE
        NEW.risque_client = 'critique';
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: create_opportunity_stages(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_opportunity_stages(opp_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    stage_record RECORD;
    stage_counter INTEGER := 1;
BEGIN
    -- Supprimer les étapes existantes si elles existent
    DELETE FROM opportunity_stages WHERE opportunity_id = opp_id;
    
    -- Créer les étapes par défaut
    FOR stage_record IN 
        SELECT unnest(ARRAY['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE']) AS stage_name
    LOOP
        INSERT INTO opportunity_stages (
            opportunity_id, 
            stage_name, 
            stage_order, 
            status,
            start_date
        ) VALUES (
            opp_id,
            stage_record.stage_name,
            stage_counter,
            CASE 
                WHEN stage_counter = 1 THEN 'IN_PROGRESS'
                ELSE 'PENDING'
            END,
            CASE 
                WHEN stage_counter = 1 THEN CURRENT_DATE
                ELSE NULL
            END
        );
        stage_counter := stage_counter + 1;
    END LOOP;
END;
$$;


--
-- Name: trigger_create_opportunity_stages(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_create_opportunity_stages() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM create_opportunity_stages(NEW.id);
    RETURN NEW;
END;
$$;


--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_opportunities_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_opportunities_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_opportunity_stages_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_opportunity_stages_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: business_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_units (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    CONSTRAINT divisions_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text])))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50),
    raison_sociale character varying(200) NOT NULL,
    nom character varying(100),
    siret character varying(20),
    email character varying(255),
    telephone character varying(50),
    adresse text,
    ville character varying(100),
    code_postal character varying(20),
    pays character varying(50) DEFAULT 'France'::character varying,
    secteur_activite character varying(100),
    taille_entreprise character varying(50),
    statut character varying(20) DEFAULT 'PROSPECT'::character varying NOT NULL,
    source_prospection character varying(100),
    notes text,
    collaborateur_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_derniere_activite timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100),
    updated_by character varying(100),
    date_premier_contact date,
    date_devenu_client date,
    source_prospect character varying(100),
    commercial_responsable_id uuid,
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
    CONSTRAINT chk_clients_notation CHECK ((((notation)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text, ('C'::character varying)::text, ('D'::character varying)::text, ('E'::character varying)::text])) OR (notation IS NULL))),
    CONSTRAINT chk_clients_risque_client CHECK (((risque_client)::text = ANY (ARRAY[('faible'::character varying)::text, ('moyen'::character varying)::text, ('eleve'::character varying)::text, ('critique'::character varying)::text]))),
    CONSTRAINT chk_clients_statut CHECK (((statut)::text = ANY (ARRAY[('prospect'::character varying)::text, ('client'::character varying)::text, ('client_fidele'::character varying)::text, ('abandonne'::character varying)::text, ('PROSPECT'::character varying)::text, ('CLIENT'::character varying)::text, ('CLIENT_FIDELE'::character varying)::text, ('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text, ('ABANDONNE'::character varying)::text]))),
    CONSTRAINT clients_statut_check CHECK (((statut)::text = ANY (ARRAY[('PROSPECT'::character varying)::text, ('CLIENT'::character varying)::text, ('CLIENT_FIDELE'::character varying)::text, ('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text, ('ABANDONNE'::character varying)::text])))
);


--
-- Name: collaborateurs; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT collaborateurs_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text, ('CONGE'::character varying)::text, ('DEPART'::character varying)::text])))
);


--
-- Name: TABLE collaborateurs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.collaborateurs IS 'Employés de l''entreprise avec leurs données RH';


--
-- Name: COLUMN collaborateurs.initiales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collaborateurs.initiales IS 'Initiales du nom du collaborateur';


--
-- Name: COLUMN collaborateurs.division_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collaborateurs.division_id IS 'Division optionnelle du collaborateur (doit appartenir à la business unit)';


--
-- Name: COLUMN collaborateurs.business_unit_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collaborateurs.business_unit_id IS 'Business unit obligatoire du collaborateur';


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: divisions; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT divisions_statut_check1 CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text])))
);


--
-- Name: documents_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    nom character varying(255) NOT NULL,
    type_document character varying(100) NOT NULL,
    chemin_fichier character varying(500) NOT NULL,
    taille_fichier bigint,
    type_mime character varying(100),
    description text,
    date_upload timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: evolution_grades; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE evolution_grades; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.evolution_grades IS 'Historique de l''évolution des grades des collaborateurs';


--
-- Name: evolution_postes; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE evolution_postes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.evolution_postes IS 'Historique de l''évolution des postes des collaborateurs';


--
-- Name: feuille_temps_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feuille_temps_entries (
    feuille_temps_id uuid NOT NULL,
    time_entry_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE feuille_temps_entries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feuille_temps_entries IS 'Liaison entre feuilles de temps et saisies de temps';


--
-- Name: feuilles_temps; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE feuilles_temps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feuilles_temps IS 'Feuilles de temps hebdomadaires des collaborateurs';


--
-- Name: fiscal_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_years (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    annee integer NOT NULL,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    budget_global numeric(15,2) DEFAULT 0 NOT NULL,
    statut character varying(20) DEFAULT 'OUVERTE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK ((date_fin > date_debut)),
    CONSTRAINT fiscal_years_statut_check CHECK (((statut)::text = ANY (ARRAY[('OUVERTE'::character varying)::text, ('FERMEE'::character varying)::text, ('EN_COURS'::character varying)::text])))
);


--
-- Name: grades; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE grades; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.grades IS 'Grades hiérarchiques par division avec taux horaires par défaut';


--
-- Name: historique_relationnel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historique_relationnel (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    type_interaction character varying(100) NOT NULL,
    description text NOT NULL,
    date_interaction timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    collaborateur_id uuid,
    opportunite_id uuid,
    mission_id uuid,
    montant numeric(12,2),
    statut character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);


--
-- Name: hourly_rates; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: invoice_time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_time_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    time_entry_id uuid NOT NULL,
    montant_facture numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    numero character varying(50) NOT NULL,
    client_id uuid NOT NULL,
    mission_id uuid,
    date_emission date NOT NULL,
    date_echeance date NOT NULL,
    montant_ht numeric(15,2) DEFAULT 0 NOT NULL,
    montant_tva numeric(15,2) DEFAULT 0 NOT NULL,
    montant_ttc numeric(15,2) DEFAULT 0 NOT NULL,
    statut character varying(20) DEFAULT 'EMISE'::character varying NOT NULL,
    mode_paiement character varying(50),
    date_paiement date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_invoice_dates CHECK ((date_echeance >= date_emission)),
    CONSTRAINT invoices_statut_check CHECK (((statut)::text = ANY (ARRAY[('BROUILLON'::character varying)::text, ('EMISE'::character varying)::text, ('ENVOYEE'::character varying)::text, ('PAYEE'::character varying)::text, ('EN_RETARD'::character varying)::text, ('ANNULEE'::character varying)::text])))
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: mission_tasks; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: mission_types; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.missions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    nom character varying(200) NOT NULL,
    description text,
    client_id uuid,
    division_id uuid,
    responsable_id uuid,
    date_debut date,
    date_fin date,
    budget_estime numeric(15,2) DEFAULT 0 NOT NULL,
    budget_reel numeric(15,2) DEFAULT 0 NOT NULL,
    statut character varying(20) DEFAULT 'EN_COURS'::character varying NOT NULL,
    priorite character varying(20) DEFAULT 'NORMALE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    type_mission character varying(20) DEFAULT 'MISSION'::character varying NOT NULL,
    prospect_id uuid,
    date_contact date,
    date_proposition date,
    date_decision date,
    montant_proposition numeric(15,2),
    probabilite integer,
    motif_perte text,
    fiscal_year_id uuid,
    CONSTRAINT check_mission_dates CHECK (((date_fin IS NULL) OR (date_fin >= date_debut))),
    CONSTRAINT check_workflow_dates CHECK (((((type_mission)::text = 'PROSPECT'::text) AND (date_contact IS NULL)) OR (((type_mission)::text = 'CONTACT'::text) AND (date_contact IS NOT NULL)) OR (((type_mission)::text = 'PROPOSITION'::text) AND (date_contact IS NOT NULL) AND (date_proposition IS NOT NULL)) OR (((type_mission)::text = ANY (ARRAY[('MISSION'::character varying)::text, ('WIN'::character varying)::text, ('LOST'::character varying)::text])) AND (date_contact IS NOT NULL) AND (date_proposition IS NOT NULL) AND (date_decision IS NOT NULL)))),
    CONSTRAINT missions_priorite_check CHECK (((priorite)::text = ANY (ARRAY[('BASSE'::character varying)::text, ('NORMALE'::character varying)::text, ('HAUTE'::character varying)::text, ('URGENTE'::character varying)::text]))),
    CONSTRAINT missions_probabilite_check CHECK (((probabilite >= 0) AND (probabilite <= 100))),
    CONSTRAINT missions_statut_check CHECK (((statut)::text = ANY (ARRAY[('EN_COURS'::character varying)::text, ('TERMINEE'::character varying)::text, ('ANNULEE'::character varying)::text, ('EN_ATTENTE'::character varying)::text]))),
    CONSTRAINT missions_type_mission_check CHECK (((type_mission)::text = ANY (ARRAY[('PROSPECT'::character varying)::text, ('CONTACT'::character varying)::text, ('PROPOSITION'::character varying)::text, ('MISSION'::character varying)::text, ('WIN'::character varying)::text, ('LOST'::character varying)::text, ('ABANDONNE'::character varying)::text])))
);


--
-- Name: COLUMN missions.type_mission; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missions.type_mission IS 'Type de mission dans le workflow prospect → client';


--
-- Name: COLUMN missions.probabilite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missions.probabilite IS 'Probabilité de gain en pourcentage (0-100)';


--
-- Name: COLUMN missions.fiscal_year_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missions.fiscal_year_id IS 'Exercice fiscal de la mission';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT notifications_priority_check CHECK (((priority)::text = ANY (ARRAY[('LOW'::character varying)::text, ('NORMAL'::character varying)::text, ('HIGH'::character varying)::text, ('URGENT'::character varying)::text])))
);


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(200) NOT NULL,
    description text,
    client_id uuid,
    prospect_id uuid,
    montant_estime numeric(15,2) DEFAULT 0 NOT NULL,
    probabilite integer DEFAULT 50 NOT NULL,
    date_creation date NOT NULL,
    date_fermeture_prevue date,
    date_fermeture_reelle date,
    source character varying(100),
    statut character varying(20) DEFAULT 'OUVERTE'::character varying NOT NULL,
    responsable_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    collaborateur_id uuid,
    type_opportunite character varying(100),
    devise character varying(5) DEFAULT 'FCFA'::character varying,
    etape_vente character varying(50) DEFAULT 'PROSPECTION'::character varying,
    notes text,
    created_by uuid,
    updated_by uuid,
    business_unit_id uuid,
    fiscal_year_id uuid,
    CONSTRAINT check_opportunity_dates CHECK (((date_fermeture_prevue IS NULL) OR (date_fermeture_prevue >= date_creation))),
    CONSTRAINT chk_opportunities_statut CHECK (((statut)::text = ANY (ARRAY[('NOUVELLE'::character varying)::text, ('EN_COURS'::character varying)::text, ('GAGNEE'::character varying)::text, ('PERDUE'::character varying)::text, ('ANNULEE'::character varying)::text, ('OUVERTE'::character varying)::text, ('FERMEE'::character varying)::text]))),
    CONSTRAINT opportunities_probabilite_check CHECK (((probabilite >= 0) AND (probabilite <= 100)))
);


--
-- Name: COLUMN opportunities.fiscal_year_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opportunities.fiscal_year_id IS 'Exercice fiscal de l''opportunité';


--
-- Name: opportunity_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    stage_name character varying(50) NOT NULL,
    stage_order integer NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    start_date date,
    completion_date date,
    notes text,
    documents jsonb DEFAULT '[]'::jsonb,
    validated_by uuid,
    validated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    CONSTRAINT opportunity_stages_stage_name_check CHECK (((stage_name)::text = ANY (ARRAY[('PROSPECTION'::character varying)::text, ('QUALIFICATION'::character varying)::text, ('PROPOSITION'::character varying)::text, ('NEGOCIATION'::character varying)::text, ('FERMETURE'::character varying)::text, ('GAGNEE'::character varying)::text, ('PERDUE'::character varying)::text]))),
    CONSTRAINT opportunity_stages_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('COMPLETED'::character varying)::text, ('SKIPPED'::character varying)::text])))
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    description text,
    module character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: postes; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE postes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.postes IS 'Postes associés aux types de collaborateurs';


--
-- Name: COLUMN postes.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.postes.code IS 'Code unique du poste';


--
-- Name: COLUMN postes.type_collaborateur_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.postes.type_collaborateur_id IS 'Type de collaborateur associé (optionnel)';


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    badge_bg_class character varying(50),
    badge_text_class character varying(50),
    badge_hex_color character varying(7),
    badge_priority integer
);


--
-- Name: stage_documents; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: stage_validations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: task_mission_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_mission_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    mission_type_id uuid NOT NULL,
    ordre integer DEFAULT 0,
    obligatoire boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT tasks_priorite_check CHECK (((priorite)::text = ANY (ARRAY[('BASSE'::character varying)::text, ('MOYENNE'::character varying)::text, ('HAUTE'::character varying)::text, ('CRITIQUE'::character varying)::text])))
);


--
-- Name: taux_horaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taux_horaires (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grade_id uuid NOT NULL,
    division_id uuid NOT NULL,
    taux_horaire numeric(10,2) NOT NULL,
    salaire_base numeric(10,2) NOT NULL,
    date_effet date NOT NULL,
    date_fin_effet date,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT taux_horaires_salaire_base_check CHECK ((salaire_base > (0)::numeric)),
    CONSTRAINT taux_horaires_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text]))),
    CONSTRAINT taux_horaires_taux_horaire_check CHECK ((taux_horaire > (0)::numeric))
);


--
-- Name: TABLE taux_horaires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.taux_horaires IS 'Taux horaires et salaires de base par grade et division';


--
-- Name: COLUMN taux_horaires.taux_horaire; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.taux_horaires.taux_horaire IS 'Taux horaire en euros';


--
-- Name: COLUMN taux_horaires.salaire_base; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.taux_horaires.salaire_base IS 'Salaire de base mensuel en euros';


--
-- Name: COLUMN taux_horaires.date_effet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.taux_horaires.date_effet IS 'Date de début d''application du taux et salaire';


--
-- Name: COLUMN taux_horaires.date_fin_effet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.taux_horaires.date_fin_effet IS 'Date de fin d''application (NULL = toujours valide)';


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    mission_id uuid,
    date_saisie date NOT NULL,
    heures numeric(5,2) DEFAULT 0 NOT NULL,
    type_heures character varying(20) DEFAULT 'NORMALES'::character varying NOT NULL,
    description text,
    perdiem numeric(10,2) DEFAULT 0 NOT NULL,
    transport numeric(10,2) DEFAULT 0 NOT NULL,
    hotel numeric(10,2) DEFAULT 0 NOT NULL,
    restaurant numeric(10,2) DEFAULT 0 NOT NULL,
    divers numeric(10,2) DEFAULT 0 NOT NULL,
    statut character varying(20) DEFAULT 'SAISIE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    type_non_chargeable_id uuid,
    semaine integer,
    annee integer,
    statut_validation character varying(20) DEFAULT 'SAISIE'::character varying NOT NULL,
    validateur_id uuid,
    date_validation timestamp with time zone,
    commentaire_validation text,
    taux_horaire_applique numeric(10,2),
    CONSTRAINT check_mission_required_for_chargeable CHECK ((((type_heures)::text <> 'CHARGEABLE'::text) OR (mission_id IS NOT NULL))),
    CONSTRAINT check_type_required_for_non_chargeable CHECK ((((type_heures)::text <> 'NON_CHARGEABLE'::text) OR (type_non_chargeable_id IS NOT NULL))),
    CONSTRAINT time_entries_statut_check CHECK (((statut)::text = ANY (ARRAY[('SAISIE'::character varying)::text, ('VALIDEE'::character varying)::text, ('REJETEE'::character varying)::text, ('FACTUREE'::character varying)::text]))),
    CONSTRAINT time_entries_statut_validation_check CHECK (((statut_validation)::text = ANY (ARRAY[('SAISIE'::character varying)::text, ('SOUMISE'::character varying)::text, ('VALIDEE'::character varying)::text, ('REJETEE'::character varying)::text]))),
    CONSTRAINT time_entries_type_heures_check CHECK (((type_heures)::text = ANY (ARRAY[('NORMALES'::character varying)::text, ('SUPPLEMENTAIRES'::character varying)::text, ('NUIT'::character varying)::text, ('WEEKEND'::character varying)::text, ('FERIE'::character varying)::text])))
);


--
-- Name: COLUMN time_entries.type_heures; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_entries.type_heures IS 'Type d''heures : CHARGEABLE (mission) ou NON_CHARGEABLE';


--
-- Name: COLUMN time_entries.semaine; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_entries.semaine IS 'Numéro de semaine ISO (1-53)';


--
-- Name: COLUMN time_entries.annee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_entries.annee IS 'Année de la saisie';


--
-- Name: types_collaborateurs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE types_collaborateurs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.types_collaborateurs IS 'Types de collaborateurs (Consultant, Administratif, Support, Autre)';


--
-- Name: COLUMN types_collaborateurs.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.types_collaborateurs.code IS 'Code unique du type (ADMIN, CONSULTANT)';


--
-- Name: types_heures_non_chargeables; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE types_heures_non_chargeables; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.types_heures_non_chargeables IS 'Types d''heures non chargeables variables par division';


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    statut character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    collaborateur_id uuid,
    CONSTRAINT users_statut_check CHECK (((statut)::text = ANY (ARRAY[('ACTIF'::character varying)::text, ('INACTIF'::character varying)::text, ('CONGE'::character varying)::text])))
);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: clients clients_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_code_key UNIQUE (code);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: collaborateurs collaborateurs_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_email_key UNIQUE (email);


--
-- Name: collaborateurs collaborateurs_matricule_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_matricule_key UNIQUE (matricule);


--
-- Name: collaborateurs collaborateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: business_units divisions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT divisions_code_key UNIQUE (code);


--
-- Name: divisions divisions_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_code_key1 UNIQUE (code);


--
-- Name: business_units divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey1 PRIMARY KEY (id);


--
-- Name: documents_clients documents_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents_clients
    ADD CONSTRAINT documents_clients_pkey PRIMARY KEY (id);


--
-- Name: evolution_grades evolution_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_grades
    ADD CONSTRAINT evolution_grades_pkey PRIMARY KEY (id);


--
-- Name: evolution_postes evolution_postes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_postes
    ADD CONSTRAINT evolution_postes_pkey PRIMARY KEY (id);


--
-- Name: feuille_temps_entries feuille_temps_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feuille_temps_entries
    ADD CONSTRAINT feuille_temps_entries_pkey PRIMARY KEY (feuille_temps_id, time_entry_id);


--
-- Name: feuilles_temps feuilles_temps_collaborateur_id_semaine_annee_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feuilles_temps
    ADD CONSTRAINT feuilles_temps_collaborateur_id_semaine_annee_key UNIQUE (collaborateur_id, semaine, annee);


--
-- Name: feuilles_temps feuilles_temps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feuilles_temps
    ADD CONSTRAINT feuilles_temps_pkey PRIMARY KEY (id);


--
-- Name: fiscal_years fiscal_years_annee_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT fiscal_years_annee_key UNIQUE (annee);


--
-- Name: fiscal_years fiscal_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT fiscal_years_pkey PRIMARY KEY (id);


--
-- Name: grades grades_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_code_key UNIQUE (code);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: historique_relationnel historique_relationnel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_relationnel
    ADD CONSTRAINT historique_relationnel_pkey PRIMARY KEY (id);


--
-- Name: hourly_rates hourly_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hourly_rates
    ADD CONSTRAINT hourly_rates_pkey PRIMARY KEY (id);


--
-- Name: invoice_time_entries invoice_time_entries_invoice_id_time_entry_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_time_entries
    ADD CONSTRAINT invoice_time_entries_invoice_id_time_entry_id_key UNIQUE (invoice_id, time_entry_id);


--
-- Name: invoice_time_entries invoice_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_time_entries
    ADD CONSTRAINT invoice_time_entries_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_numero_key UNIQUE (numero);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_filename_key UNIQUE (filename);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: mission_tasks mission_tasks_mission_id_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_tasks
    ADD CONSTRAINT mission_tasks_mission_id_task_id_key UNIQUE (mission_id, task_id);


--
-- Name: mission_tasks mission_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_tasks
    ADD CONSTRAINT mission_tasks_pkey PRIMARY KEY (id);


--
-- Name: mission_types mission_types_codification_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_types
    ADD CONSTRAINT mission_types_codification_key UNIQUE (codification);


--
-- Name: mission_types mission_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_types
    ADD CONSTRAINT mission_types_pkey PRIMARY KEY (id);


--
-- Name: missions missions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_code_key UNIQUE (code);


--
-- Name: missions missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: opportunity_stages opportunity_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_stages
    ADD CONSTRAINT opportunity_stages_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_nom_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_nom_key UNIQUE (nom);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: postes postes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postes
    ADD CONSTRAINT postes_code_key UNIQUE (code);


--
-- Name: postes postes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postes
    ADD CONSTRAINT postes_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_nom_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nom_key UNIQUE (nom);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: stage_documents stage_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_documents
    ADD CONSTRAINT stage_documents_pkey PRIMARY KEY (id);


--
-- Name: stage_validations stage_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_validations
    ADD CONSTRAINT stage_validations_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_mission_task_id_collaborateur_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_mission_task_id_collaborateur_id_key UNIQUE (mission_task_id, collaborateur_id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_mission_types task_mission_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_mission_types
    ADD CONSTRAINT task_mission_types_pkey PRIMARY KEY (id);


--
-- Name: task_mission_types task_mission_types_task_id_mission_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_mission_types
    ADD CONSTRAINT task_mission_types_task_id_mission_type_id_key UNIQUE (task_id, mission_type_id);


--
-- Name: tasks tasks_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_code_key UNIQUE (code);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: taux_horaires taux_horaires_grade_id_division_id_date_effet_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taux_horaires
    ADD CONSTRAINT taux_horaires_grade_id_division_id_date_effet_key UNIQUE (grade_id, division_id, date_effet);


--
-- Name: taux_horaires taux_horaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taux_horaires
    ADD CONSTRAINT taux_horaires_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: types_collaborateurs types_collaborateurs_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.types_collaborateurs
    ADD CONSTRAINT types_collaborateurs_code_key UNIQUE (code);


--
-- Name: types_collaborateurs types_collaborateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.types_collaborateurs
    ADD CONSTRAINT types_collaborateurs_pkey PRIMARY KEY (id);


--
-- Name: types_heures_non_chargeables types_heures_non_chargeables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.types_heures_non_chargeables
    ADD CONSTRAINT types_heures_non_chargeables_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_business_units_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_units_code ON public.business_units USING btree (code);


--
-- Name: idx_business_units_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_units_statut ON public.business_units USING btree (statut);


--
-- Name: idx_clients_ca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_ca ON public.clients USING btree (chiffre_affaires);


--
-- Name: idx_clients_collaborateur_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_collaborateur_id ON public.clients USING btree (collaborateur_id);


--
-- Name: idx_clients_commercial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_commercial ON public.clients USING btree (commercial_responsable_id);


--
-- Name: idx_clients_contribuable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_contribuable ON public.clients USING btree (numero_contribuable);


--
-- Name: idx_clients_contribuable_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_clients_contribuable_unique ON public.clients USING btree (numero_contribuable) WHERE (numero_contribuable IS NOT NULL);


--
-- Name: idx_clients_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_created_at ON public.clients USING btree (created_at);


--
-- Name: idx_clients_dates_evolution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_dates_evolution ON public.clients USING btree (date_premier_contact, date_devenu_client);


--
-- Name: idx_clients_effectif; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_effectif ON public.clients USING btree (effectif);


--
-- Name: idx_clients_groupe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_groupe ON public.clients USING btree (groupe_id);


--
-- Name: idx_clients_notation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_notation ON public.clients USING btree (notation);


--
-- Name: idx_clients_risque; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_risque ON public.clients USING btree (risque_client);


--
-- Name: idx_clients_secteur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_secteur ON public.clients USING btree (secteur_activite);


--
-- Name: idx_clients_secteur_activite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_secteur_activite ON public.clients USING btree (secteur_activite);


--
-- Name: idx_clients_siret; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_siret ON public.clients USING btree (siret);


--
-- Name: idx_clients_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_statut ON public.clients USING btree (statut);


--
-- Name: idx_collaborateurs_business_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborateurs_business_unit ON public.collaborateurs USING btree (business_unit_id);


--
-- Name: idx_collaborateurs_division; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborateurs_division ON public.collaborateurs USING btree (division_id);


--
-- Name: idx_collaborateurs_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborateurs_grade ON public.collaborateurs USING btree (grade_actuel_id);


--
-- Name: idx_collaborateurs_initiales; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborateurs_initiales ON public.collaborateurs USING btree (initiales);


--
-- Name: idx_collaborateurs_matricule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborateurs_matricule ON public.collaborateurs USING btree (matricule);


--
-- Name: idx_collaborateurs_poste; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborateurs_poste ON public.collaborateurs USING btree (poste_actuel_id);


--
-- Name: idx_collaborateurs_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborateurs_statut ON public.collaborateurs USING btree (statut);


--
-- Name: idx_collaborateurs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborateurs_type ON public.collaborateurs USING btree (type_collaborateur_id);


--
-- Name: idx_contacts_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_client ON public.contacts USING btree (client_id);


--
-- Name: idx_contacts_principal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_principal ON public.contacts USING btree (est_contact_principal);


--
-- Name: idx_contacts_principal_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_contacts_principal_unique ON public.contacts USING btree (client_id) WHERE (est_contact_principal = true);


--
-- Name: idx_divisions_business_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_divisions_business_unit_id ON public.divisions USING btree (business_unit_id);


--
-- Name: idx_divisions_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_divisions_code ON public.divisions USING btree (code);


--
-- Name: idx_divisions_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_divisions_statut ON public.divisions USING btree (statut);


--
-- Name: idx_documents_clients_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_clients_client ON public.documents_clients USING btree (client_id);


--
-- Name: idx_documents_clients_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_clients_type ON public.documents_clients USING btree (type_document);


--
-- Name: idx_evolution_grades_collaborateur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evolution_grades_collaborateur ON public.evolution_grades USING btree (collaborateur_id);


--
-- Name: idx_evolution_grades_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evolution_grades_dates ON public.evolution_grades USING btree (date_debut, date_fin);


--
-- Name: idx_evolution_grades_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evolution_grades_grade ON public.evolution_grades USING btree (grade_id);


--
-- Name: idx_evolution_postes_collaborateur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evolution_postes_collaborateur ON public.evolution_postes USING btree (collaborateur_id);


--
-- Name: idx_evolution_postes_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evolution_postes_dates ON public.evolution_postes USING btree (date_debut, date_fin);


--
-- Name: idx_evolution_postes_poste; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evolution_postes_poste ON public.evolution_postes USING btree (poste_id);


--
-- Name: idx_feuille_temps_entries_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feuille_temps_entries_entry ON public.feuille_temps_entries USING btree (time_entry_id);


--
-- Name: idx_feuille_temps_entries_feuille; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feuille_temps_entries_feuille ON public.feuille_temps_entries USING btree (feuille_temps_id);


--
-- Name: idx_feuilles_temps_collaborateur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feuilles_temps_collaborateur ON public.feuilles_temps USING btree (collaborateur_id);


--
-- Name: idx_feuilles_temps_semaine_annee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feuilles_temps_semaine_annee ON public.feuilles_temps USING btree (semaine, annee);


--
-- Name: idx_feuilles_temps_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feuilles_temps_statut ON public.feuilles_temps USING btree (statut);


--
-- Name: idx_feuilles_temps_validateur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feuilles_temps_validateur ON public.feuilles_temps USING btree (validateur_id);


--
-- Name: idx_fiscal_years_annee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fiscal_years_annee ON public.fiscal_years USING btree (annee);


--
-- Name: idx_fiscal_years_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fiscal_years_statut ON public.fiscal_years USING btree (statut);


--
-- Name: idx_grades_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grades_code ON public.grades USING btree (code);


--
-- Name: idx_grades_division; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grades_division ON public.grades USING btree (division_id);


--
-- Name: idx_grades_niveau; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grades_niveau ON public.grades USING btree (niveau);


--
-- Name: idx_historique_relationnel_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historique_relationnel_client ON public.historique_relationnel USING btree (client_id);


--
-- Name: idx_historique_relationnel_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historique_relationnel_date ON public.historique_relationnel USING btree (date_interaction);


--
-- Name: idx_historique_relationnel_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historique_relationnel_type ON public.historique_relationnel USING btree (type_interaction);


--
-- Name: idx_hourly_rates_date_effet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hourly_rates_date_effet ON public.hourly_rates USING btree (date_effet);


--
-- Name: idx_hourly_rates_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hourly_rates_grade ON public.hourly_rates USING btree (grade);


--
-- Name: idx_hourly_rates_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hourly_rates_statut ON public.hourly_rates USING btree (statut);


--
-- Name: idx_invoice_time_entries_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_time_entries_invoice ON public.invoice_time_entries USING btree (invoice_id);


--
-- Name: idx_invoice_time_entries_time_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_time_entries_time_entry ON public.invoice_time_entries USING btree (time_entry_id);


--
-- Name: idx_invoices_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_client ON public.invoices USING btree (client_id);


--
-- Name: idx_invoices_date_emission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_date_emission ON public.invoices USING btree (date_emission);


--
-- Name: idx_invoices_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_numero ON public.invoices USING btree (numero);


--
-- Name: idx_invoices_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_statut ON public.invoices USING btree (statut);


--
-- Name: idx_mission_tasks_mission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mission_tasks_mission_id ON public.mission_tasks USING btree (mission_id);


--
-- Name: idx_mission_tasks_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mission_tasks_statut ON public.mission_tasks USING btree (statut);


--
-- Name: idx_mission_tasks_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mission_tasks_task_id ON public.mission_tasks USING btree (task_id);


--
-- Name: idx_mission_types_actif; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mission_types_actif ON public.mission_types USING btree (actif);


--
-- Name: idx_mission_types_codification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mission_types_codification ON public.mission_types USING btree (codification);


--
-- Name: idx_mission_types_division; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mission_types_division ON public.mission_types USING btree (division_id);


--
-- Name: idx_missions_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missions_client ON public.missions USING btree (client_id);


--
-- Name: idx_missions_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missions_code ON public.missions USING btree (code);


--
-- Name: idx_missions_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missions_dates ON public.missions USING btree (date_debut, date_fin);


--
-- Name: idx_missions_dates_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missions_dates_workflow ON public.missions USING btree (date_contact, date_proposition, date_decision);


--
-- Name: idx_missions_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missions_fiscal_year ON public.missions USING btree (fiscal_year_id);


--
-- Name: idx_missions_prospect; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missions_prospect ON public.missions USING btree (prospect_id);


--
-- Name: idx_missions_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missions_statut ON public.missions USING btree (statut);


--
-- Name: idx_missions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missions_type ON public.missions USING btree (type_mission);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_opportunity_id ON public.notifications USING btree (opportunity_id);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_priority ON public.notifications USING btree (priority);


--
-- Name: idx_notifications_read_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at);


--
-- Name: idx_notifications_stage_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_stage_id ON public.notifications USING btree (stage_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, read_at) WHERE (read_at IS NULL);


--
-- Name: idx_opportunities_business_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_business_unit_id ON public.opportunities USING btree (business_unit_id);


--
-- Name: idx_opportunities_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_client ON public.opportunities USING btree (client_id);


--
-- Name: idx_opportunities_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_client_id ON public.opportunities USING btree (client_id);


--
-- Name: idx_opportunities_collaborateur_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_collaborateur_id ON public.opportunities USING btree (collaborateur_id);


--
-- Name: idx_opportunities_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_created_at ON public.opportunities USING btree (created_at);


--
-- Name: idx_opportunities_date_creation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_date_creation ON public.opportunities USING btree (date_creation);


--
-- Name: idx_opportunities_date_fermeture_prevue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_date_fermeture_prevue ON public.opportunities USING btree (date_fermeture_prevue);


--
-- Name: idx_opportunities_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_fiscal_year ON public.opportunities USING btree (fiscal_year_id);


--
-- Name: idx_opportunities_nom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_nom ON public.opportunities USING btree (nom);


--
-- Name: idx_opportunities_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_statut ON public.opportunities USING btree (statut);


--
-- Name: idx_opportunity_stages_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_stages_opportunity_id ON public.opportunity_stages USING btree (opportunity_id);


--
-- Name: idx_opportunity_stages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_stages_status ON public.opportunity_stages USING btree (status);


--
-- Name: idx_postes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postes_code ON public.postes USING btree (code);


--
-- Name: idx_postes_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postes_statut ON public.postes USING btree (statut);


--
-- Name: idx_postes_type_collaborateur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postes_type_collaborateur ON public.postes USING btree (type_collaborateur_id);


--
-- Name: idx_role_permissions_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_permission ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role ON public.role_permissions USING btree (role_id);


--
-- Name: idx_stage_documents_stage_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_documents_stage_id ON public.stage_documents USING btree (stage_id);


--
-- Name: idx_stage_validations_stage_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stage_validations_stage_id ON public.stage_validations USING btree (stage_id);


--
-- Name: idx_task_assignments_collaborateur_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_assignments_collaborateur_id ON public.task_assignments USING btree (collaborateur_id);


--
-- Name: idx_task_assignments_mission_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_assignments_mission_task_id ON public.task_assignments USING btree (mission_task_id);


--
-- Name: idx_task_mission_types_mission_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_mission_types_mission_type_id ON public.task_mission_types USING btree (mission_type_id);


--
-- Name: idx_task_mission_types_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_mission_types_task_id ON public.task_mission_types USING btree (task_id);


--
-- Name: idx_tasks_actif; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_actif ON public.tasks USING btree (actif);


--
-- Name: idx_tasks_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_code ON public.tasks USING btree (code);


--
-- Name: idx_taux_horaires_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_taux_horaires_dates ON public.taux_horaires USING btree (date_effet, date_fin_effet);


--
-- Name: idx_taux_horaires_division; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_taux_horaires_division ON public.taux_horaires USING btree (division_id);


--
-- Name: idx_taux_horaires_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_taux_horaires_grade ON public.taux_horaires USING btree (grade_id);


--
-- Name: idx_taux_horaires_grade_division; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_taux_horaires_grade_division ON public.taux_horaires USING btree (grade_id, division_id);


--
-- Name: idx_taux_horaires_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_taux_horaires_statut ON public.taux_horaires USING btree (statut);


--
-- Name: idx_time_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_date ON public.time_entries USING btree (date_saisie);


--
-- Name: idx_time_entries_date_saisie; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_date_saisie ON public.time_entries USING btree (date_saisie);


--
-- Name: idx_time_entries_mission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_mission ON public.time_entries USING btree (mission_id);


--
-- Name: idx_time_entries_semaine_annee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_semaine_annee ON public.time_entries USING btree (semaine, annee);


--
-- Name: idx_time_entries_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_statut ON public.time_entries USING btree (statut);


--
-- Name: idx_time_entries_statut_validation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_statut_validation ON public.time_entries USING btree (statut_validation);


--
-- Name: idx_time_entries_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_type ON public.time_entries USING btree (type_heures);


--
-- Name: idx_time_entries_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_user ON public.time_entries USING btree (user_id);


--
-- Name: idx_time_entries_validateur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_validateur ON public.time_entries USING btree (validateur_id);


--
-- Name: idx_types_collaborateurs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_types_collaborateurs_code ON public.types_collaborateurs USING btree (code);


--
-- Name: idx_types_collaborateurs_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_types_collaborateurs_statut ON public.types_collaborateurs USING btree (statut);


--
-- Name: idx_types_heures_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_types_heures_code ON public.types_heures_non_chargeables USING btree (code);


--
-- Name: idx_types_heures_division; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_types_heures_division ON public.types_heures_non_chargeables USING btree (division_id);


--
-- Name: idx_user_permissions_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_permissions_permission ON public.user_permissions USING btree (permission_id);


--
-- Name: idx_user_permissions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_permissions_user ON public.user_permissions USING btree (user_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_statut ON public.users USING btree (statut);


--
-- Name: clients trigger_calculer_notation_client; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculer_notation_client BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.calculer_notation_client();


--
-- Name: clients trigger_calculer_risque_client; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculer_risque_client BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.calculer_risque_client();


--
-- Name: opportunities trigger_create_opportunity_stages; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_opportunity_stages AFTER INSERT ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.trigger_create_opportunity_stages();


--
-- Name: opportunity_stages trigger_update_opportunity_stages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_opportunity_stages_updated_at BEFORE UPDATE ON public.opportunity_stages FOR EACH ROW EXECUTE FUNCTION public.update_opportunity_stages_updated_at();


--
-- Name: business_units update_business_units_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_units_updated_at BEFORE UPDATE ON public.business_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: collaborateurs update_collaborateurs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_collaborateurs_updated_at BEFORE UPDATE ON public.collaborateurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contacts update_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: divisions update_divisions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON public.divisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents_clients update_documents_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_clients_updated_at BEFORE UPDATE ON public.documents_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feuilles_temps update_feuilles_temps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feuilles_temps_updated_at BEFORE UPDATE ON public.feuilles_temps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fiscal_years update_fiscal_years_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fiscal_years_updated_at BEFORE UPDATE ON public.fiscal_years FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: grades update_grades_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hourly_rates update_hourly_rates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hourly_rates_updated_at BEFORE UPDATE ON public.hourly_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mission_tasks update_mission_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mission_tasks_updated_at BEFORE UPDATE ON public.mission_tasks FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: mission_types update_mission_types_modification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mission_types_modification BEFORE UPDATE ON public.mission_types FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: missions update_missions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: opportunities update_opportunities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_opportunities_updated_at();


--
-- Name: permissions update_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: postes update_postes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_postes_updated_at BEFORE UPDATE ON public.postes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_assignments update_task_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_assignments_updated_at BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: taux_horaires update_taux_horaires_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_taux_horaires_updated_at BEFORE UPDATE ON public.taux_horaires FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: time_entries update_time_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: types_collaborateurs update_types_collaborateurs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_types_collaborateurs_updated_at BEFORE UPDATE ON public.types_collaborateurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: types_heures_non_chargeables update_types_heures_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_types_heures_updated_at BEFORE UPDATE ON public.types_heures_non_chargeables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clients clients_commercial_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_commercial_responsable_id_fkey FOREIGN KEY (commercial_responsable_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: clients clients_groupe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_groupe_id_fkey FOREIGN KEY (groupe_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: collaborateurs collaborateurs_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE RESTRICT;


--
-- Name: collaborateurs collaborateurs_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.business_units(id) ON DELETE SET NULL;


--
-- Name: collaborateurs collaborateurs_grade_actuel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_grade_actuel_id_fkey FOREIGN KEY (grade_actuel_id) REFERENCES public.grades(id) ON DELETE SET NULL;


--
-- Name: collaborateurs collaborateurs_poste_actuel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_poste_actuel_id_fkey FOREIGN KEY (poste_actuel_id) REFERENCES public.postes(id) ON DELETE SET NULL;


--
-- Name: collaborateurs collaborateurs_type_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborateurs
    ADD CONSTRAINT collaborateurs_type_collaborateur_id_fkey FOREIGN KEY (type_collaborateur_id) REFERENCES public.types_collaborateurs(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: divisions divisions_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: documents_clients documents_clients_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents_clients
    ADD CONSTRAINT documents_clients_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: documents_clients documents_clients_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents_clients
    ADD CONSTRAINT documents_clients_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: evolution_grades evolution_grades_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_grades
    ADD CONSTRAINT evolution_grades_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: evolution_grades evolution_grades_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_grades
    ADD CONSTRAINT evolution_grades_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;


--
-- Name: evolution_postes evolution_postes_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_postes
    ADD CONSTRAINT evolution_postes_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: evolution_postes evolution_postes_poste_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_postes
    ADD CONSTRAINT evolution_postes_poste_id_fkey FOREIGN KEY (poste_id) REFERENCES public.postes(id) ON DELETE CASCADE;


--
-- Name: feuille_temps_entries feuille_temps_entries_feuille_temps_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feuille_temps_entries
    ADD CONSTRAINT feuille_temps_entries_feuille_temps_id_fkey FOREIGN KEY (feuille_temps_id) REFERENCES public.feuilles_temps(id) ON DELETE CASCADE;


--
-- Name: feuille_temps_entries feuille_temps_entries_time_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feuille_temps_entries
    ADD CONSTRAINT feuille_temps_entries_time_entry_id_fkey FOREIGN KEY (time_entry_id) REFERENCES public.time_entries(id) ON DELETE CASCADE;


--
-- Name: feuilles_temps feuilles_temps_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feuilles_temps
    ADD CONSTRAINT feuilles_temps_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: feuilles_temps feuilles_temps_validateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feuilles_temps
    ADD CONSTRAINT feuilles_temps_validateur_id_fkey FOREIGN KEY (validateur_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: grades grades_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: historique_relationnel historique_relationnel_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_relationnel
    ADD CONSTRAINT historique_relationnel_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: historique_relationnel historique_relationnel_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_relationnel
    ADD CONSTRAINT historique_relationnel_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: historique_relationnel historique_relationnel_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_relationnel
    ADD CONSTRAINT historique_relationnel_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: historique_relationnel historique_relationnel_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_relationnel
    ADD CONSTRAINT historique_relationnel_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE SET NULL;


--
-- Name: historique_relationnel historique_relationnel_opportunite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historique_relationnel
    ADD CONSTRAINT historique_relationnel_opportunite_id_fkey FOREIGN KEY (opportunite_id) REFERENCES public.opportunities(id) ON DELETE SET NULL;


--
-- Name: invoice_time_entries invoice_time_entries_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_time_entries
    ADD CONSTRAINT invoice_time_entries_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_time_entries invoice_time_entries_time_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_time_entries
    ADD CONSTRAINT invoice_time_entries_time_entry_id_fkey FOREIGN KEY (time_entry_id) REFERENCES public.time_entries(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE SET NULL;


--
-- Name: mission_tasks mission_tasks_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_tasks
    ADD CONSTRAINT mission_tasks_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE;


--
-- Name: mission_tasks mission_tasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_tasks
    ADD CONSTRAINT mission_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: mission_types mission_types_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_types
    ADD CONSTRAINT mission_types_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: missions missions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: missions missions_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.business_units(id) ON DELETE SET NULL;


--
-- Name: missions missions_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;


--
-- Name: missions missions_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: missions missions_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.opportunity_stages(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: opportunities opportunities_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id);


--
-- Name: opportunities opportunities_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: opportunity_stages opportunity_stages_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_stages
    ADD CONSTRAINT opportunity_stages_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_stages opportunity_stages_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_stages
    ADD CONSTRAINT opportunity_stages_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: postes postes_type_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postes
    ADD CONSTRAINT postes_type_collaborateur_id_fkey FOREIGN KEY (type_collaborateur_id) REFERENCES public.types_collaborateurs(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: stage_documents stage_documents_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_documents
    ADD CONSTRAINT stage_documents_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.opportunity_stages(id) ON DELETE CASCADE;


--
-- Name: stage_documents stage_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_documents
    ADD CONSTRAINT stage_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: stage_validations stage_validations_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_validations
    ADD CONSTRAINT stage_validations_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.opportunity_stages(id) ON DELETE CASCADE;


--
-- Name: stage_validations stage_validations_validator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_validations
    ADD CONSTRAINT stage_validations_validator_id_fkey FOREIGN KEY (validator_id) REFERENCES public.users(id);


--
-- Name: task_assignments task_assignments_collaborateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_collaborateur_id_fkey FOREIGN KEY (collaborateur_id) REFERENCES public.collaborateurs(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_mission_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_mission_task_id_fkey FOREIGN KEY (mission_task_id) REFERENCES public.mission_tasks(id) ON DELETE CASCADE;


--
-- Name: task_mission_types task_mission_types_mission_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_mission_types
    ADD CONSTRAINT task_mission_types_mission_type_id_fkey FOREIGN KEY (mission_type_id) REFERENCES public.mission_types(id) ON DELETE CASCADE;


--
-- Name: task_mission_types task_mission_types_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_mission_types
    ADD CONSTRAINT task_mission_types_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: taux_horaires taux_horaires_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taux_horaires
    ADD CONSTRAINT taux_horaires_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: taux_horaires taux_horaires_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taux_horaires
    ADD CONSTRAINT taux_horaires_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_type_non_chargeable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_type_non_chargeable_id_fkey FOREIGN KEY (type_non_chargeable_id) REFERENCES public.types_heures_non_chargeables(id) ON DELETE SET NULL;


--
-- Name: time_entries time_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_validateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_validateur_id_fkey FOREIGN KEY (validateur_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: types_heures_non_chargeables types_heures_non_chargeables_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.types_heures_non_chargeables
    ADD CONSTRAINT types_heures_non_chargeables_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

