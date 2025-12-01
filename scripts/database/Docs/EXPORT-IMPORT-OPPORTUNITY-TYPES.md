# 📦 Export/Import des Types d'Opportunités

Guide pour **exporter depuis la base locale** et **importer en production**.

---

## 🎯 Cas d'usage

Vous avez perdu vos types d'opportunités en production et vous voulez les restaurer depuis votre base locale.

---

## 📤 ÉTAPE 1 : Export depuis Local

**Sur votre machine locale** avec la base de données contenant les types d'opportunités :

```bash
# Configurer .env pour pointer vers LOCAL
DB_NAME=eb_vision_2_0
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=votre_password

# Exécuter l'export
node scripts/database/export-opportunity-types.js
```

**Résultat :**
- ✅ Fichier créé : `exports/opportunity-types-export-2025-11-03.json`
- 📊 Contient : Types, Stages, Actions requises, Documents requis

---

## 📥 ÉTAPE 2 : Copier sur le Serveur

Copiez le fichier JSON sur votre serveur de production :

```bash
# Depuis votre machine locale
scp exports/opportunity-types-export-2025-11-03.json raphyai82@srv1023879:~/apps/ewmanagement/
```

---

## 📥 ÉTAPE 3 : Import en Production

**Sur le serveur de production** :

```bash
cd ~/apps/ewmanagement

# Configurer .env pour pointer vers PRODUCTION
# (normalement déjà configuré)

# Exécuter l'import
node scripts/database/import-opportunity-types.js opportunity-types-export-2025-11-03.json
```

**Le script va :**
1. ✅ Lire le fichier JSON
2. ✅ Afficher un résumé
3. ⚠️  Demander confirmation
4. ✅ Importer dans l'ordre :
   - Types d'opportunités
   - Stages
   - Actions requises
   - Documents requis

---

## 🔍 Vérification

Après l'import, vérifiez dans l'application :

```bash
# Compter les types
psql -d ewm_db -c "SELECT COUNT(*) FROM opportunity_types;"

# Lister les types
psql -d ewm_db -c "SELECT code, nom FROM opportunity_types;"
```

Ou connectez-vous à l'application et allez dans :
**Paramètres → Types d'opportunité**

---

## 📋 Contenu du fichier JSON

```json
{
  "exportDate": "2025-11-03T...",
  "database": "eb_vision_2_0",
  "opportunityTypes": [
    {
      "id": "uuid",
      "code": "VENTE_STANDARD",
      "nom": "Vente Standard",
      ...
    }
  ],
  "stageTemplates": [...],
  "requiredActions": [...],
  "requiredDocuments": [...]
}
```

---

## ⚠️ Notes Importantes

1. **Gestion des conflits** : Le script utilise `ON CONFLICT` pour mettre à jour les types existants avec le même `code`
2. **IDs régénérés** : Les IDs sont régénérés automatiquement (UUIDs)
3. **Mapping** : Le script maintient un mapping des anciens IDs vers les nouveaux
4. **Sécurité** : Le script demande confirmation avant d'importer

---

## 🆘 Dépannage

### Erreur "Fichier introuvable"
```bash
# Vérifier l'emplacement du fichier
ls -la exports/
ls -la ~/apps/ewmanagement/

# Utiliser le chemin complet
node scripts/database/import-opportunity-types.js /home/raphyai82/apps/ewmanagement/opportunity-types-export-2025-11-03.json
```

### Erreur de connexion
```bash
# Vérifier le .env
cat .env | grep DB_

# Tester la connexion
node scripts/database/test-database.js
```

---

## 🔄 Automatisation (Optionnel)

Pour sauvegarder régulièrement :

```bash
# Créer un cron job (sur local)
0 2 * * 0 cd /path/to/project && node scripts/database/export-opportunity-types.js
```

---

**✅ C'est tout ! Vos types d'opportunités sont maintenant restaurés en production.**












