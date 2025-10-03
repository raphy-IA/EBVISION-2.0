# Guide de correction CSP en production

## Problème résolu
- Content Security Policy bloquait les connexions vers localhost
- Font Awesome ne se chargeait pas depuis cdnjs.cloudflare.com
- Les campagnes de prospection n'étaient pas visibles

## Solution appliquée
1. **Configuration CSP mise à jour** dans server.js
2. **connectSrc** ajouté pour autoriser les connexions locales
3. **cdnjs.cloudflare.com** ajouté aux sources autorisées

## Étapes de déploiement

### 1. Préparation
```bash
# Sauvegarder la configuration actuelle
cp server.js server.js.backup

# Exécuter le script de correction
node scripts/fix-csp-production.js
```

### 2. Déploiement
```bash
# Redémarrer le serveur
./scripts/restart-server-production.sh

# Ou manuellement:
pkill -f "node server.js"
npm start
```

### 3. Vérification
```bash
# Vérifier que tout fonctionne
./scripts/verify-csp-fix.sh
```

### 4. Test utilisateur
1. Accéder à http://localhost:3000/prospecting-campaigns.html
2. Se connecter avec un utilisateur valide
3. Vérifier que les campagnes s'affichent
4. Vérifier que Font Awesome fonctionne

## Configuration CSP finale
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "data:"],
            connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "https:"],
        },
    },
}));
```

## Rollback (si nécessaire)
```bash
# Restaurer la configuration précédente
cp server.js.backup server.js
./scripts/restart-server-production.sh
```

## Notes importantes
- Cette correction autorise les connexions vers localhost (développement)
- En production, ajustez les URLs selon votre configuration
- Testez toujours après déploiement
- Surveillez les logs pour détecter d'éventuels problèmes







