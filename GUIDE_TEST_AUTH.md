# Guide de Test - Système d'Authentification

## Tests à effectuer

### 1. Test de redirection automatique
1. Ouvrir http://localhost:3000/dashboard.html sans être connecté
2. Vérifier que vous êtes redirigé vers http://localhost:3000/login.html

### 2. Test de connexion
1. Aller sur http://localhost:3000/login.html
2. Se connecter avec :
   - Email: test@trs.com
   - Mot de passe: Test123!
3. Vérifier que vous êtes redirigé vers le dashboard

### 3. Test de déconnexion
1. Être connecté sur une page
2. Cliquer sur "Déconnexion"
3. Vérifier que vous êtes redirigé vers la page de connexion

### 4. Test de session expirée
1. Être connecté
2. Supprimer le token dans localStorage (F12 > Application > Local Storage)
3. Recharger la page
4. Vérifier que vous êtes redirigé vers la page de connexion

## Pages testées
- ✅ dashboard.html
- ✅ collaborateurs.html
- ✅ missions.html
- ✅ opportunities.html
- ✅ analytics.html

## Utilisateur de test
- Email: test@trs.com
- Mot de passe: Test123!
- Statut: ACTIF
- Rôle: ADMIN
