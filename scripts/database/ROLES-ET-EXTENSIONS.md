# 📋 Rôles et Extensions - EB-Vision 2.0

## 🎯 Principe : Base Pure + Extensions

Ce document explique la stratégie de **Base Pure + Extensions** pour la base de données.

- **Base Pure** : Structure et données exactes du backup de référence (`backup_BD_reference.sql`)
- **Extensions** : Ajouts utiles pour l'application (badges/couleurs pour les rôles)

## 👥 Rôles Système (7 rôles - `is_system_role = true`)

Ces rôles sont **essentiels** et doivent être créés au minimum lors de l'initialisation.

| #  | Nom          | Description                                           | Badge       | Priorité |
|----|--------------|-------------------------------------------------------|-------------|----------|
| 1  | SUPER_ADMIN  | Super administrateur - Accès total                    | 🔴 Rouge    | 100      |
| 2  | ADMIN_IT     | Administrateur IT - Gestion technique                 | ⚫ Noir      | 95       |
| 3  | IT           | Technicien IT - Support technique                     | 🔘 Gris     | 92       |
| 4  | ADMIN        | Administrateur - Gestion métier                       | 🔵 Bleu     | 90       |
| 5  | MANAGER      | Manager - Gestion d'équipe                            | 💧 Cyan     | 70       |
| 6  | CONSULTANT   | Consultant - Accès complet aux données                | 🟢 Vert     | 60       |
| 7  | COLLABORATEUR| Collaborateur - Accès limité aux données de sa BU    | ⚪ Blanc    | 50       |

## 📝 Rôles Non-Système (4 rôles - `is_system_role = false`)

Ces rôles sont **optionnels** et peuvent être créés selon les besoins.

| #  | Nom          | Description                                           | Badge       | Priorité |
|----|--------------|-------------------------------------------------------|-------------|----------|
| 8  | ASSOCIE      | Permissions et roles pour les Associés                | 🟡 Jaune    | 85       |
| 9  | DIRECTEUR    | Permissions et roles pour les directeurs              | 🟠 Orange   | 80       |
| 10 | SUPER_USER   | Permissions et roles pour le SP                       | 🟣 Indigo   | 75       |
| 11 | SUPERVISEUR  | Permissions pour superviseurs                         | 🔷 Teal     | 65       |

## 🎨 Extensions Ajoutées (colonnes badges)

### Table `roles` - Extensions pour les badges

| Colonne           | Type          | Description                                    |
|-------------------|---------------|------------------------------------------------|
| `badge_bg_class`  | VARCHAR(50)   | Classe CSS pour la couleur de fond du badge   |
| `badge_text_class`| VARCHAR(50)   | Classe CSS pour la couleur du texte du badge  |
| `badge_hex_color` | VARCHAR(7)    | Code hexadécimal de la couleur (#RRGGBB)      |
| `badge_priority`  | INTEGER       | Priorité d'affichage (100 = le plus élevé)    |

### Exemple de badge

```sql
{
  name: 'SUPER_ADMIN',
  badge_bg_class: 'danger',       -- Bootstrap: bg-danger
  badge_text_class: 'white',      -- Bootstrap: text-white
  badge_hex_color: '#dc3545',     -- Rouge Bootstrap
  badge_priority: 100             -- Priorité maximale
}
```

## 📊 Structure de la Table `roles`

### Colonnes de la base pure

```sql
CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,           -- ✅ Base pure
    description text,                               -- ✅ Base pure
    is_system_role boolean DEFAULT false,           -- ✅ Base pure
    created_at timestamp without time zone,         -- ✅ Base pure
    updated_at timestamp without time zone,         -- ✅ Base pure
    
    -- Extensions pour badges
    badge_bg_class character varying(50),           -- 🆕 Extension
    badge_text_class character varying(50),         -- 🆕 Extension
    badge_hex_color character varying(7),           -- 🆕 Extension
    badge_priority integer                          -- 🆕 Extension
);
```

## 🔍 Contrainte CHECK sur `users.role`

La table `users` a une contrainte qui valide les rôles autorisés :

```sql
CONSTRAINT users_role_check CHECK (
    ((role)::text = ANY ((ARRAY[
        'ADMIN'::character varying,
        'ADMIN_IT'::character varying,
        'ASSOCIE'::character varying,
        'COLLABORATEUR'::character varying,
        'CONSULTANT'::character varying,
        'DIRECTEUR'::character varying,
        'IT'::character varying,
        'MANAGER'::character varying,
        'SUPER_ADMIN'::character varying,
        'SUPER_USER'::character varying,
        'SUPERVISEUR'::character varying
    ])::text[]))
)
```

## 🚀 Scripts d'Initialisation

### Script 1 : `1-init-database-tables.js`

Crée **11 rôles** (7 système + 4 non-système) avec leurs badges.

**Exécution** :
```bash
node scripts/database/1-init-database-tables.js
```

**Résultat** :
```
✅ 11 rôles créés (7 système, 4 non-système)
```

### Script 2 : `0- init-from-schema.js`

Script tout-en-un qui :
- Exécute `schema-complete.sql` (base pure)
- Crée les 11 rôles avec badges
- Crée un super admin par défaut
- Affecte toutes les permissions

**Exécution** :
```bash
node scripts/database/0-init-from-schema.js
```

## 📌 Points Importants

### ✅ À FAIRE
- ✅ Toujours baser le schéma sur `backup_BD_reference.sql`
- ✅ Créer au minimum les 7 rôles système
- ✅ Utiliser `name` pour les colonnes de rôles/permissions (anglais)
- ✅ Utiliser `nom` pour les colonnes users/business_units (français)
- ✅ Ajouter les extensions utiles (badges) pour améliorer l'UX

### ❌ À NE PAS FAIRE
- ❌ Modifier le code de l'application pour l'adapter au schéma
- ❌ Ajouter des colonnes qui n'existaient pas dans la base pure (sauf extensions badges)
- ❌ Changer les types de données de la base pure
- ❌ Modifier les contraintes de la base pure

## 📖 Références

- **Base Pure** : `/backups/Backup Pure/backup_BD_reference.sql`
- **Schema Complet** : `scripts/database/schema-complete.sql`
- **Documentation** : `scripts/database/README-INIT-PROCESS.md`

## 📞 Support

En cas de problème :
1. Vérifier que le schéma correspond à la base pure
2. S'assurer que les 7 rôles système sont créés
3. Vérifier la contrainte CHECK sur `users.role`
4. Consulter les logs d'initialisation






