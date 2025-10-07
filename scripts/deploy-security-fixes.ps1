# Script PowerShell de déploiement des corrections de sécurité
# Usage: .\scripts\deploy-security-fixes.ps1

Write-Host "🚀 DÉPLOIEMENT DES CORRECTIONS DE SÉCURITÉ" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Fonction pour afficher les messages colorés
function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Error "Ce script doit être exécuté depuis la racine du projet"
    exit 1
}

Write-Host "📋 ÉTAPES DE DÉPLOIEMENT:" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier l'état de Git
Write-Info "1. Vérification de l'état Git..."
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Warning "Des modifications non commitées détectées:"
    git status --short
    Write-Host ""
    $response = Read-Host "Voulez-vous continuer ? (y/N)"
    if ($response -notmatch "^[Yy]$") {
        Write-Error "Déploiement annulé"
        exit 1
    }
} else {
    Write-Success "Aucune modification non commitée"
}

# 2. Vérifier la branche
Write-Info "2. Vérification de la branche..."
$currentBranch = git branch --show-current
Write-Info "Branche actuelle: $currentBranch"

if ($currentBranch -ne "main" -and $currentBranch -ne "master") {
    Write-Warning "Vous n'êtes pas sur la branche principale"
    $response = Read-Host "Voulez-vous continuer ? (y/N)"
    if ($response -notmatch "^[Yy]$") {
        Write-Error "Déploiement annulé"
        exit 1
    }
}

# 3. Vérifier les corrections de sécurité
Write-Info "3. Vérification des corrections de sécurité..."

# Vérifier la clé JWT
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "JWT_SECRET=dev-secret-key-2024") {
        Write-Error "Clé JWT par défaut détectée dans .env"
        Write-Warning "Générez une nouvelle clé avec: node scripts/generate-secure-jwt-key.js --update"
        exit 1
    } else {
        Write-Success "Clé JWT sécurisée configurée"
    }
} else {
    Write-Warning "Fichier .env non trouvé"
}

# Vérifier les credentials supprimés
$loginContent = Get-Content "public/login.html" -Raw
if ($loginContent -match "admin@ebvision.com") {
    Write-Error "Credentials de démo encore présents dans login.html"
    exit 1
} else {
    Write-Success "Credentials de démo supprimés"
}

# Vérifier le rate limiting
$serverContent = Get-Content "server.js" -Raw
if ($serverContent -match "Rate limiting activé pour l'authentification") {
    Write-Success "Rate limiting activé"
} else {
    Write-Warning "Rate limiting non détecté dans server.js"
}

# Vérifier les cookies httpOnly
if (Test-Path "src/middleware/cookieAuth.js") {
    Write-Success "Middleware cookies httpOnly présent"
} else {
    Write-Error "Middleware cookies httpOnly manquant"
    exit 1
}

# 4. Tests de sécurité
Write-Info "4. Exécution des tests de sécurité..."

if (Test-Path "scripts/security-audit-passwords.js") {
    Write-Info "Audit des mots de passe..."
    $auditResult = node scripts/security-audit-passwords.js 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Audit des mots de passe réussi"
        # Extraire le score de sécurité
        $scoreMatch = $auditResult | Select-String "Score: (\d+)/100"
        if ($scoreMatch) {
            $score = $scoreMatch.Matches[0].Groups[1].Value
            Write-Info "Score de sécurité: $score/100"
        }
    } else {
        Write-Error "Échec de l'audit des mots de passe"
        Write-Host $auditResult
        exit 1
    }
} else {
    Write-Warning "Script d'audit des mots de passe non trouvé"
}

# 5. Préparation du déploiement
Write-Info "5. Préparation du déploiement..."

# Créer un tag de version
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tagName = "security-fix-$timestamp"

Write-Info "Création du tag: $tagName"
git tag -a $tagName -m "Corrections de sécurité - $timestamp"

# 6. Instructions de déploiement
Write-Host ""
Write-Host "📋 INSTRUCTIONS DE DÉPLOIEMENT SUR LE SERVEUR:" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "1. Sur le serveur de production, exécutez:"
Write-Host "   git fetch origin"
Write-Host "   git checkout $currentBranch"
Write-Host "   git pull origin $currentBranch"
Write-Host "   git checkout $tagName"
Write-Host ""
Write-Info "2. Installez les nouvelles dépendances:"
Write-Host "   npm install"
Write-Host ""
Write-Info "3. Mettez à jour le fichier .env avec la nouvelle clé JWT:"
Write-Host "   # Copiez la clé JWT depuis votre .env local vers le serveur"
Write-Host ""
Write-Info "4. Redémarrez l'application:"
Write-Host "   pm2 restart eb-vision"
Write-Host "   # ou selon votre configuration de déploiement"
Write-Host ""
Write-Info "5. Vérifiez que l'application fonctionne:"
Write-Host "   curl -I http://localhost:3000/api/health"
Write-Host ""

# 7. Checklist de vérification post-déploiement
Write-Host "🔍 CHECKLIST DE VÉRIFICATION POST-DÉPLOIEMENT:" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "□ L'application démarre sans erreur"
Write-Host "□ La connexion fonctionne avec les nouveaux cookies"
Write-Host "□ Le rate limiting est actif (tester avec plusieurs tentatives)"
Write-Host "□ Les credentials de démo ne sont plus visibles"
Write-Host "□ L'audit de sécurité montre un score > 90/100"
Write-Host "□ Les logs ne montrent pas d'erreurs de sécurité"
Write-Host ""

Write-Success "Préparation du déploiement terminée !"
Write-Info "Tag créé: $tagName"
Write-Warning "N'oubliez pas de pousser les changements: git push origin $currentBranch --tags"


