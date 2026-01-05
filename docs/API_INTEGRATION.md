# Intégration API & Authentification

Ce document décrit la procédure pour authentifier un prestataire externe (ex: IA Provider) et lui donner les accès nécessaires à l'API EB-Vision 2.0.

## 1. Création du Compte Utilisateur (Accès)

Pour qu'un prestataire puisse accéder à l'API, il doit disposer d'un compte utilisateur dédié.

### Option A : Via l'Interface Administration (Recommandé)
1. Connectez-vous en tant qu'**Administrateur**.
2. Allez dans **Gestion des Utilisateurs**.
3. Cliquez sur **Créer un utilisateur**.
4. Remplissez les informations :
   - **Nom** : Provider
   - **Prénom** : IA
   - **Email** : `iaprovider@ebvision.com` (ou autre email valide)
   - **Rôle** : `MANAGER` ou `CONSULTANT` (Suffisant pour accéder aux routes de prospection).
   - **Mot de passe** : Générez un mot de passe fort.
5. Validez la création.

### Option B : Via Script SQL (Si pas d'accès UI)
```sql
-- Exemple d'insertion (mot de passe à hasher au préalable via bcrypt)
INSERT INTO users (nom, prenom, email, password_hash, role, statut, created_at)
VALUES ('Provider', 'IA', 'iaprovider@ebvision.com', '$2a$12$ExempleHash...', 'MANAGER', 'ACTIF', NOW());
```

## 2. Authentification (Obtention du Token)

Le prestataire doit s'authentifier pour obtenir un **Token JWT** qui servira pour toutes les requêtes suivantes.

**Endpoint** : `POST /api/auth/login`

**Body (JSON)** :
```json
{
  "email": "iaprovider@ebvision.com",
  "password": "votre_mot_de_passe_securise"
}
```

**Réponse (Succès 200)** :
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR...",
    "user": { ... }
  }
}
```

## 3. Utilisation du Token

Pour toutes les requêtes sécurisées (ex: `/api/prospecting/companies`), le token doit être inclus dans le **Header** :

`Authorization: Bearer <VOTRE_TOKEN>`

### Exemple d'appel (cURL)

```bash
curl -X GET https://ebvision-test-api.bosssystemsai.com/api/prospecting/companies \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR..." \
  -H "Content-Type: application/json"
```

## 4. Permissions et Périmètre

Les routes de prospection (`/api/prospecting/*`) sont protégées par le middleware `authenticateToken`.
- **Lecture/Écriture** : Tout utilisateur authentifié peut créer et lire des sources, entreprises et templates.
- **Campagnes** : Un utilisateur peut gérer les campagnes qu'il a créées. Si le prestataire doit gérer les campagnes des autres, il lui faut un rôle `MANAGER` associé à la Business Unit concernée, ou un rôle `ADMIN`.

> **Note** : Il est recommandé de créer un utilisateur spécifique pour le prestataire afin de tracer ses actions dans les logs et de pouvoir révoquer son accès indépendamment des autres utilisateurs.
