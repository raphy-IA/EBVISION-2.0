# Sécurité de l'application TRS

## Authentification

L'application utilise un système d'authentification basé sur le stockage de session côté client.

### Identifiants de connexion
- **Identifiant** : `EB`
- **Mot de passe** : `EB@Partners`

### Fonctionnalités de sécurité

#### 1. Vérification d'authentification
- Chaque page protégée vérifie automatiquement l'authentification
- Redirection automatique vers la page de connexion si non authentifié
- Session valide pendant 24 heures maximum

#### 2. Protection des fichiers sensibles
- Les fichiers CSV et Excel sont protégés contre l'accès direct
- Le script d'authentification `auth.js` est également protégé
- Seuls les fichiers CSS et images sont accessibles publiquement

#### 3. Gestion des sessions
- Token d'authentification généré à la connexion
- Timestamp de session pour éviter les sessions infinies
- Rafraîchissement automatique du timestamp toutes les 5 minutes
- Nettoyage automatique des sessions expirées

#### 4. Fonctionnalités de sécurité
- Bouton de déconnexion dans le header
- Redirection intelligente après connexion (retour à la page demandée)
- Protection contre les injections XSS
- Headers de sécurité HTTP

### Structure des fichiers de sécurité

```
TRS-Affichage/
├── auth.js          # Script d'authentification
├── index.html       # Page de connexion
├── dashboard.html   # Dashboard principal (protégé)
├── 403.html        # Page d'erreur d'accès refusé
├── .htaccess       # Configuration Apache pour la sécurité
└── SECURITY.md     # Cette documentation
```

### Comment fonctionne la sécurité

1. **Accès à une page protégée** : L'utilisateur est redirigé vers `index.html`
2. **Connexion réussie** : Un token d'authentification est créé et stocké
3. **Navigation** : Chaque page vérifie automatiquement l'authentification
4. **Session expirée** : L'utilisateur est automatiquement déconnecté
5. **Déconnexion** : Le token est supprimé et l'utilisateur est redirigé

### Recommandations de sécurité

1. **Changer les identifiants par défaut** dans `auth.js` et `index.html`
2. **Utiliser HTTPS** en production
3. **Implémenter une authentification côté serveur** pour plus de sécurité
4. **Ajouter une validation côté serveur** pour les données sensibles
5. **Mettre en place un système de logs** pour tracer les accès

### Limitations actuelles

- L'authentification est côté client uniquement
- Les identifiants sont en dur dans le code
- Pas de chiffrement des données de session
- Pas de protection contre les attaques par force brute

### Améliorations recommandées

1. **Authentification côté serveur** avec PHP/Node.js
2. **Chiffrement des mots de passe** avec bcrypt
3. **Système de rôles et permissions**
4. **Logs de sécurité**
5. **Protection CSRF**
6. **Rate limiting** pour les tentatives de connexion 