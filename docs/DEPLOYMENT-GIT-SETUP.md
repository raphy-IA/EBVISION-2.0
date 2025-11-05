# 🔧 Guide de Configuration Git sur le Serveur VPS

## 🔍 Diagnostic du Problème

Si vous obtenez l'erreur `fatal: not a git repository`, cela signifie que le répertoire n'est pas un dépôt Git.

## ✅ Vérifications à Effectuer sur le Serveur

### 1. Vérifier si vous êtes dans le bon répertoire

```bash
# Vérifier le répertoire actuel
pwd

# Vérifier si c'est un dépôt git
ls -la | grep .git
```

### 2. Vérifier si le dépôt existe ailleurs

```bash
# Chercher des dépôts git dans le répertoire home
find ~ -name ".git" -type d 2>/dev/null

# Ou chercher dans le répertoire apps
find ~/apps -name ".git" -type d 2>/dev/null
```

### 3. Vérifier la configuration Git globale

```bash
# Vérifier les remotes configurés globalement
git config --global --list

# Vérifier les credentials
git config --global user.name
git config --global user.email
```

## 🔧 Solutions Possibles

### Solution 1 : Cloner le dépôt (si ce n'est pas encore fait)

```bash
# Se placer dans le répertoire apps
cd ~/apps

# Sauvegarder les fichiers existants si nécessaire
# (si vous avez des modifications locales)
mv ewm ewm_backup_$(date +%Y%m%d)

# Cloner le dépôt
git clone https://github.com/raphy-IA/EBVISION-2.0.git ewm

# Ou si vous utilisez SSH
git clone git@github.com:raphy-IA/EBVISION-2.0.git ewm

# Entrer dans le répertoire
cd ewm

# Vérifier la branche
git branch -a

# Basculer sur main si nécessaire
git checkout main
```

### Solution 2 : Initialiser Git dans le répertoire existant

**⚠️ ATTENTION :** Utilisez cette solution seulement si vous êtes sûr que le répertoire contient déjà votre code mais n'est pas un dépôt git.

```bash
cd ~/apps/ewm

# Initialiser git
git init

# Ajouter le remote
git remote add origin https://github.com/raphy-IA/EBVISION-2.0.git

# Vérifier le remote
git remote -v

# Récupérer les branches
git fetch origin

# Vérifier les branches disponibles
git branch -a

# Basculer sur main
git checkout -b main origin/main

# Ou si main existe déjà localement
git checkout main
git branch --set-upstream-to=origin/main main
```

### Solution 3 : Vérifier si le dépôt est dans un autre répertoire

```bash
# Chercher tous les dépôts git
find ~ -name ".git" -type d 2>/dev/null | head -10

# Si vous trouvez un dépôt, allez dans ce répertoire
cd ~/chemin/vers/le/depot
```

## 🔐 Configuration de l'Authentification

### Option A : HTTPS avec Token (Recommandé)

```bash
# Générer un token GitHub : https://github.com/settings/tokens
# Avec les permissions : repo (toutes les permissions du dépôt)

# Configurer git pour utiliser le token
git config --global credential.helper store

# Ou utiliser directement dans l'URL
git remote set-url origin https://VOTRE_TOKEN@github.com/raphy-IA/EBVISION-2.0.git
```

### Option B : SSH (Plus sécurisé)

```bash
# Générer une clé SSH si vous n'en avez pas
ssh-keygen -t ed25519 -C "votre_email@example.com"

# Afficher la clé publique
cat ~/.ssh/id_ed25519.pub

# Ajouter cette clé à GitHub : https://github.com/settings/keys

# Tester la connexion
ssh -T git@github.com

# Changer l'URL du remote vers SSH
git remote set-url origin git@github.com:raphy-IA/EBVISION-2.0.git
```

## ✅ Vérification Post-Configuration

```bash
# Vérifier que git fonctionne
cd ~/apps/ewm
git status

# Vérifier le remote
git remote -v

# Tester un pull
git pull origin main

# Vérifier la branche actuelle
git branch
```

## 🚀 Workflow de Synchronisation Recommandé

Une fois configuré, voici le workflow recommandé :

```bash
# 1. Se placer dans le répertoire
cd ~/apps/ewm

# 2. Vérifier l'état
git status

# 3. Récupérer les dernières modifications
git fetch origin

# 4. Voir les différences
git log HEAD..origin/main --oneline

# 5. Mettre à jour (si pas de modifications locales)
git pull origin main

# 6. Si vous avez des modifications locales à sauvegarder
git stash
git pull origin main
git stash pop
```

## 🆘 Dépannage

### Problème : "Permission denied (publickey)"

```bash
# Vérifier que la clé SSH est bien ajoutée
ssh-add -l

# Ajouter la clé si nécessaire
ssh-add ~/.ssh/id_ed25519

# Vérifier la connexion GitHub
ssh -T git@github.com
```

### Problème : "Authentication failed"

```bash
# Vérifier les credentials
git config --global credential.helper

# Supprimer les credentials en cache
git credential-cache exit

# Ou utiliser un token personnel
git remote set-url origin https://VOTRE_TOKEN@github.com/raphy-IA/EBVISION-2.0.git
```

### Problème : "Your local changes would be overwritten"

```bash
# Sauvegarder les modifications locales
git stash

# Mettre à jour
git pull origin main

# Restaurer les modifications
git stash pop
```

## 📝 Notes Importantes

1. **Ne jamais commit les fichiers sensibles** : `.env`, `.env.production`, etc.
2. **Toujours vérifier** `git status` avant de faire un pull
3. **Sauvegarder** les modifications locales avec `git stash` si nécessaire
4. **Utiliser des branches** pour les modifications importantes avant de les merger dans main

## 🔗 Liens Utiles

- Repository : https://github.com/raphy-IA/EBVISION-2.0
- GitHub Tokens : https://github.com/settings/tokens
- SSH Keys : https://github.com/settings/keys

