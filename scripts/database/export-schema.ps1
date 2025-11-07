# Script PowerShell pour exporter le schéma complet de la base de développement
# Usage: .\scripts\database\export-schema.ps1

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        EXPORT DU SCHÉMA DE LA BASE DE DÉVELOPPEMENT         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Charger les variables d'environnement depuis .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "ewm_db" }
$DB_PASSWORD = $env:DB_PASSWORD

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   🏠 Hôte: $DB_HOST"
Write-Host "   🔌 Port: $DB_PORT"
Write-Host "   👤 User: $DB_USER"
Write-Host "   🗄️  Base: $DB_NAME"
Write-Host ""

$OUTPUT_FILE = "scripts/database/schema-complete.sql"

Write-Host "📤 Export du schéma vers: $OUTPUT_FILE" -ForegroundColor Yellow
Write-Host ""

# Définir le mot de passe pour pg_dump
$env:PGPASSWORD = $DB_PASSWORD

# Exporter uniquement le schéma (structure, pas les données)
& pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME `
    --schema-only `
    --no-owner `
    --no-privileges `
    --no-tablespaces `
    --no-security-labels `
    -f $OUTPUT_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Export réussi!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Statistiques:" -ForegroundColor Yellow
    $lines = (Get-Content $OUTPUT_FILE).Count
    Write-Host "   $lines lignes exportées"
    Write-Host ""
    Write-Host "✅ Vous pouvez maintenant utiliser: node scripts/database/init-from-schema.js" -ForegroundColor Green
} else {
    Write-Host "Erreur lors de l'export" -ForegroundColor Red
    exit 1
}

Write-Host ""

