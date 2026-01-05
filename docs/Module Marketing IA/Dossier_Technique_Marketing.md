# Dossier Technique - Intégration Module Marketing (Emailing/WhatsApp)
**Projet : EB VISION 2.0**
**Date :** 29 Décembre 2025
**Confidentialité :** STRICTEMENT CONFIDENTIEL - Réservé au prestataire sous contrat.

## 1. Architecture Générale
L'application est un dashboard de gestion (ERP/CRM) monolithique modulaire.

*   **Runtime:** Node.js (v18+)
*   **Framework:** Express.js 4.x
*   **Base de Données:** PostgreSQL 14+
*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla + Bootstrap 5), rendu hybride (SSR partiel + API).
*   **Hébergement:** Serveur Linux (Ubuntu), Process Manager: PM2.

### Structure du Projet (Simplifiée)
```
/src
  /config         # Configuration (DB, variables d'env)
  /models         # Modèles de données (Logique métier + Requetes SQL)
  /routes         # Points de terminaison API (Express Router)
  /services       # Logique métier complexe (ex: NotificationService)
  /utils          # Utilitaires (Database pool, helpers)
/public           # Assets statiques (JS frontend, CSS, Images, Uploads)
```

## 2. Modules Concernés
Le module marketing devra s'interfacer principalement avec les modules **Clients** et **Prospection** existants.

### A. Entité : CLIENTS
Les clients existants sont gérés via le modèle `Client`.
**Table :** `clients`

**Champs principaux pour le marketing :**
*   `id` (UUID/Integer)
*   `nom` (Raison sociale)
*   `email` (Email principal de l'entreprise)
*   `telephone` (Standard)
*   `statut` (Enum: 'ACTIF', 'INACTIF', 'ABANDONNE')
*   `type` (Enum: 'PROSPECT', 'CLIENT', 'CLIENT_FIDELE')
*   `secteur_activite` (String)
*   **Contacts Clés :**
    *   `administrateur_nom`, `administrateur_email`, `administrateur_telephone`
    *   `contact_interne_nom`, `contact_interne_email`, `contact_interne_telephone`

### B. Entité : PROSPECTS (Compagnies Cibles)
Le module de prospection utilise une table séparée pour les cibles "froides" ou importées.
**Table :** `companies`

**Champs principaux :**
*   `id`
*   `source_id` (FK vers `company_sources`)
*   `name` (Nom de l'entreprise)
*   `email`, `phone` (Coordonnées)
*   `industry` (Secteur)
*   `city`, `country`
*   `size_label` (Taille)
*   `contact_nom`, `contact_email`, `contact_tel` (Contacts spécifiques)

### C. Gestion des Campagnes (Existant)
Une structure de base pour les campagnes de prospection existe déjà. Le prestataire devra l'enrichir ou s'y connecter.

**Table :** `prospecting_campaigns`
*   `id`, `name`
*   `channel` (Actuellement: 'EMAIL', 'PHYSIQUE'. À étendre pour 'WHATSAPP')
*   `status` ('DRAFT', 'PENDING_VALIDATION', 'VALIDATED', 'ONGOING', 'COMPLETED')
*   `template_id` (FK vers `prospecting_templates`)
*   `scheduled_date`

**Table :** `prospecting_templates`
*   `id`, `name`, `subject`
*   `body_template` (Contenu HTML/Texte avec variables)
*   `channel`

## 3. Accès aux Données & Sécurité
Pour les besoins du développement, vous n'aurez **PAS** accès à la base de données de production.

### Environnement de Développement
*   Vous devez mettre en place un environnement local (Node.js + Postgres).
*   Nous fournirons un script SQL (`schema_dump.sql`) contenant la structure des tables citées ci-dessus, **sans les données clients**.
*   Vous devrez générer vos propres données de test (Mock Data).

### Authentification API
L'application utilise des **JWT (JSON Web Tokens)**.
*   Header: `Authorization: Bearer <token>`
*   Le module marketing devra s'authentifier via le middleware existant (`authenticateToken`).

## 4. Intégration WhatsApp & Emailing
### Emailing
*   **Actuel :** Utilisation de `nodemailer` pour les notifs transactionnelles.
*   **Cible Marketing :** Intégration requise via API externe (ex: SendGrid, Brevo) pour gérer les volumes et la délivrabilité.

### WhatsApp
*   Prévu via API (Meta Cloud API ou Twilio).
*   **Contrainte :** Gestion des templates validés par Meta et des opt-ins (Consentement).

## 5. Livrables Attendus
1.  **Module Node.js :** Services isolés dans `/src/services/MarketingService.js`.
2.  **Routes API :** Nouveaux fichiers dans `/src/routes/marketing/`.
3.  **Frontend :** Pages de création de campagnes et dashboard de statistiques (Taux d'ouverture, clics).
4.  **Migration SQL :** Script de création des nouvelles tables (ex: `marketing_logs`, `whatsapp_templates`).
