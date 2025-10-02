# Checklist de fichiers pour la production

## ✅ Fichiers essentiels (DOIT être présent)

### Configuration
- [ ] package.json
- [ ] ecosystem.config.js
- [ ] .htaccess
- [ ] install.sh
- [ ] DEPLOYMENT.md

### Code source
- [ ] server.js
- [ ] src/ (dossier complet)
- [ ] public/ (dossier complet)

### Scripts de production
- [ ] scripts/migrate-production.js
- [ ] scripts/deploy-planethoster.js

## ❌ Fichiers à NE PAS inclure

### Développement
- [ ] development-scripts/ (tout le dossier)
- [ ] test-*.js
- [ ] check-*.js
- [ ] debug-*.js
- [ ] verify-*.js
- [ ] fix-*.js
- [ ] add-*.js

### Configuration locale
- [ ] .env
- [ ] .env.local
- [ ] config.production.js (à configurer sur le serveur)

### Logs et cache
- [ ] logs/
- [ ] node_modules/
- [ ] .cache/
- [ ] *.log

## 📋 Vérification avant upload

1. ✅ Tous les fichiers de test sont dans development-scripts/
2. ✅ Le dossier development-scripts/ n'est pas uploadé
3. ✅ Les fichiers de configuration sont prêts
4. ✅ Les permissions sont correctes
5. ✅ Le .gitignore est configuré

## 🚀 Upload recommandé

```bash
# Créer un archive de production
tar -czf eb-vision-2.0-production.tar.gz \
  --exclude='development-scripts' \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='.env' \
  --exclude='*.log' \
  .
```
