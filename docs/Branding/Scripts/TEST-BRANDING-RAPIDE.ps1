# Script de Test Rapide du Branding
# Usage : .\TEST-BRANDING-RAPIDE.ps1

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   TEST RAPIDE DU BRANDING EB-VISION 2.0      " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier le fichier .env
Write-Host "1. Vérification du fichier .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $brandConfig = Select-String -Path ".env" -Pattern "BRAND_CONFIG" | Select-Object -First 1
    if ($brandConfig) {
        Write-Host "   ✅ Trouvé: $brandConfig" -ForegroundColor Green
    } else {
        Write-Host "   ❌ BRAND_CONFIG non trouvé dans .env" -ForegroundColor Red
        Write-Host "   → Ajoutez: BRAND_CONFIG=eb-vision-2" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Fichier .env introuvable" -ForegroundColor Red
    exit
}

Write-Host ""

# 2. Vérifier que le fichier de config existe
Write-Host "2. Vérification de la configuration..." -ForegroundColor Yellow
$configFile = "config\branding\eb-vision-2.json"
if (Test-Path $configFile) {
    Write-Host "   ✅ $configFile existe" -ForegroundColor Green
    
    # Lire et afficher le nom
    $config = Get-Content $configFile | ConvertFrom-Json
    Write-Host "   → Nom configuré: $($config.app.name)" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ $configFile introuvable" -ForegroundColor Red
}

Write-Host ""

# 3. Vérifier les dossiers assets
Write-Host "3. Vérification des dossiers assets..." -ForegroundColor Yellow
$assetsDir = "public\assets\brands\eb-vision"
if (Test-Path $assetsDir) {
    Write-Host "   ✅ Dossier assets existe: $assetsDir" -ForegroundColor Green
    
    $files = Get-ChildItem $assetsDir -File | Where-Object {$_.Extension -in @('.svg', '.png', '.ico')}
    if ($files.Count -gt 0) {
        Write-Host "   → Logos trouvés:" -ForegroundColor Cyan
        foreach ($file in $files) {
            Write-Host "     - $($file.Name)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️  Aucun logo trouvé (c'est normal, l'app utilise FontAwesome)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Dossier assets introuvable" -ForegroundColor Red
}

Write-Host ""

# 4. Vérifier si le serveur tourne
Write-Host "4. Vérification du serveur Node..." -ForegroundColor Yellow
$nodeProcess = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcess) {
    Write-Host "   ✅ Serveur Node en cours d'exécution (PID: $($nodeProcess.Id -join ', '))" -ForegroundColor Green
    Write-Host "   ⚠️  IMPORTANT: Redémarrez le serveur après modification de .env" -ForegroundColor Yellow
} else {
    Write-Host "   ❌ Aucun serveur Node en cours" -ForegroundColor Red
    Write-Host "   → Démarrez avec: npm start" -ForegroundColor Yellow
}

Write-Host ""

# 5. Test de l'API (si serveur tourne)
if ($nodeProcess) {
    Write-Host "5. Test de l'API de branding..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/branding/config" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            Write-Host "   ✅ API fonctionne" -ForegroundColor Green
            Write-Host "   → Nom retourné: $($data.data.app.name)" -ForegroundColor Cyan
            
            if ($data.data.app.name -eq "EB-VISION 2.0") {
                Write-Host "   ✅ Configuration EB-VISION 2.0 active!" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Configuration active: $($data.data.app.name)" -ForegroundColor Yellow
                Write-Host "   → Vérifiez BRAND_CONFIG dans .env et redémarrez" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "   ❌ Impossible de joindre l'API" -ForegroundColor Red
        Write-Host "   → Le serveur est-il bien démarré?" -ForegroundColor Yellow
    }
} else {
    Write-Host "5. Test de l'API de branding... IGNORÉ (serveur non démarré)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   RÉSUMÉ ET ACTIONS RECOMMANDÉES             " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Recommandations
Write-Host "📋 CHECKLIST:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [ ] 1. BRAND_CONFIG=eb-vision-2 dans .env" -ForegroundColor White
Write-Host "  [ ] 2. Serveur redémarré (npm restart)" -ForegroundColor White
Write-Host "  [ ] 3. Cache navigateur vidé (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "  [ ] 4. Page rechargée dans le navigateur" -ForegroundColor White
Write-Host ""

Write-Host "🔧 COMMANDES UTILES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Arrêter le serveur:" -ForegroundColor White
Write-Host "    Get-Process -Name node | Stop-Process -Force" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Démarrer le serveur:" -ForegroundColor White
Write-Host "    npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Redémarrer le serveur:" -ForegroundColor White
Write-Host "    npm restart" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Tester l'API:" -ForegroundColor White
Write-Host "    curl http://localhost:3000/api/branding/config" -ForegroundColor Cyan
Write-Host ""

Write-Host "🌐 Dans le navigateur (Console F12):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  localStorage.clear();" -ForegroundColor Cyan
Write-Host "  location.reload();" -ForegroundColor Cyan
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   FIN DU TEST                                 " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

