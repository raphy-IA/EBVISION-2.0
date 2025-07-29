Write-Host "🔧 Correction simple des erreurs JavaScript..." -ForegroundColor Green

# Lire le fichier
$collaborateursFile = "public/collaborateurs.html"
$content = Get-Content $collaborateursFile -Raw

Write-Host "📋 Fichier lu, taille: $($content.Length) caractères" -ForegroundColor Yellow

# 1. Vérifier si la fonction showNewCollaborateurModal existe
if ($content -match "function showNewCollaborateurModal\(\)") {
    Write-Host "✅ Fonction showNewCollaborateurModal trouvée" -ForegroundColor Green
} else {
    Write-Host "❌ Fonction showNewCollaborateurModal MANQUANTE" -ForegroundColor Red
    Write-Host "🔧 Ajout de la fonction..." -ForegroundColor Yellow
    
    $functionToAdd = @"

        function showNewCollaborateurModal() {
            console.log('Ouverture du modal nouveau collaborateur...');
            const modal = new bootstrap.Modal(document.getElementById('newCollaborateurModal'));
            modal.show();
        }
"@
    
    # Ajouter à la fin du script
    $content = $content -replace '</script>', "$functionToAdd`n    </script>"
    Write-Host "✅ Fonction ajoutée" -ForegroundColor Green
}

# 2. Corriger les erreurs de syntaxe showAlert
Write-Host "🔍 Recherche d'erreurs de syntaxe..." -ForegroundColor Yellow

$lines = $content -split "`n"
$hasError = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match "showAlert\(" -and $line -notmatch "showAlert\([^)]*\)") {
        Write-Host "❌ Erreur de syntaxe trouvée à la ligne $($i + 1): $line" -ForegroundColor Red
        $hasError = $true
    }
}

if ($hasError) {
    Write-Host "🔧 Correction des erreurs de syntaxe..." -ForegroundColor Yellow
    $content = $content -replace "showAlert\([^)]*$", 'showAlert("Erreur: éléments d\'interface manquants", "danger")'
    Write-Host "✅ Erreurs de syntaxe corrigées" -ForegroundColor Green
} else {
    Write-Host "✅ Aucune erreur de syntaxe détectée" -ForegroundColor Green
}

# 3. Ajouter des logs de debug simples
Write-Host "🔧 Ajout de logs de debug..." -ForegroundColor Yellow

$debugFunction = @"

        // Debug simple
        console.log('DEBUG: Page collaborateurs.html chargée');
        
        // Debug au chargement de la page
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DEBUG: DOM chargé');
            console.log('DEBUG: Éléments trouvés:');
            console.log('- newCollaborateurModal:', !!document.getElementById('newCollaborateurModal'));
            console.log('- collaborateurs-table:', !!document.getElementById('collaborateurs-table'));
        });
"@

# Ajouter le debug
$content = $content -replace '</script>', "$debugFunction`n    </script>"

# Sauvegarder le fichier
$content | Set-Content $collaborateursFile -Encoding UTF8

Write-Host "✅ Fichier corrigé et sauvegardé" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Correction terminée !" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Instructions de test :" -ForegroundColor Cyan
Write-Host "1. Démarrer le serveur: npm start" -ForegroundColor White
Write-Host "2. Aller sur: http://localhost:3000/collaborateurs.html" -ForegroundColor White
Write-Host "3. Ouvrir la console du navigateur (F12)" -ForegroundColor White
Write-Host "4. Vous devriez voir des logs de debug" -ForegroundColor White
Write-Host "5. Tester le bouton 'Nouveau collaborateur'" -ForegroundColor White