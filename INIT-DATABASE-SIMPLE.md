# 🚀 Initialisation Simple de Base de Données

## ✅ Solution Définitive en 2 Étapes

### Étape 1 : Sur votre serveur de DÉVELOPPEMENT (une seule fois)

Exportez le schéma de votre base qui fonctionne :

```bash
# Linux/Mac
pg_dump -h localhost -U ewm_user -d ewm_db \
  --schema-only --no-owner --no-privileges \
  -f scripts/database/schema-complete.sql

# Windows
$env:PGPASSWORD="votre_mot_de_passe"
pg_dump -h localhost -U ewm_user -d ewm_db `
  --schema-only --no-owner --no-privileges `
  -f scripts/database/schema-complete.sql
```

Puis committez ce fichier :
```bash
git add scripts/database/schema-complete.sql
git commit -m "feat: ajout du schéma complet de la base"
git push
```

### Étape 2 : Sur CHAQUE nouveau serveur

```bash
# 1. Cloner le projet
git clone https://github.com/votre-repo/EBVISION-2.0.git
cd EBVISION-2.0

# 2. Configurer .env
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
DB_NAME=nom_base_client
DB_SSL=false
EOF

# 3. Initialiser
# MODE INTERACTIF (recommandé) :
node scripts/database/init-from-schema.js
# → Choisir "Créer nouvelle base" ou "Réinitialiser base existante"
# → Si existante : liste des bases disponibles affichée

# MODE AUTOMATIQUE (pour scripts CI/CD) :
node scripts/database/init-from-schema.js --yes
# → Utilise DB_NAME du .env, réinitialise sans confirmation
```

## 📦 Ce qui est créé

- ✅ Toutes les tables
- ✅ Tous les index
- ✅ Toutes les contraintes
- ✅ Tous les triggers
- ✅ Les rôles avec couleurs
- ✅ Super admin (admin@ebvision.com / Admin@2025)

## 🎯 Pourquoi cette méthode ?

- ❌ **Avant** : 100+ migrations à gérer, erreurs à chaque nouvelle base
- ✅ **Maintenant** : 1 fichier SQL, copie exacte de votre base qui fonctionne

## 🔄 Pour mettre à jour le schéma

Quand vous modifiez la structure en développement :
1. Réexportez (Étape 1)
2. Committez
3. Les prochaines initialisations auront la nouvelle structure

