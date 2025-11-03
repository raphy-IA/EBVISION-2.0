# Script PowerShell simple pour créer un dump UTF-8
param(
    [string]$DbHost = "localhost",
    [int]$Port = 5432,
    [string]$Database = "ebvision",
    [string]$User = "postgres",
    [string]$Password = "",
    [string]$OutputFile = ""
)

# Configuration
$DB_HOST = $DbHost
$DB_PORT = $Port
$DB_NAME = $Database
$DB_USER = $User
$DB_PASSWORD = $Password

# Nom du fichier de sortie
if ([string]::IsNullOrEmpty($OutputFile)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $OutputFile = "backup_utf8_$timestamp.sql"
}

Write-Host "Creation du dump UTF-8 de la base de donnees EB-Vision" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:"
Write-Host "   Host: $DB_HOST"
Write-Host "   Port: $DB_PORT"
Write-Host "   Database: $DB_NAME"
Write-Host "   User: $DB_USER"
Write-Host "   Password: $(if ($DB_PASSWORD) { '***' } else { 'Non defini' })"
Write-Host "   Output: $OutputFile"
Write-Host ""

# Verifier que pg_dump est installe
try {
    $pgDumpPath = Get-Command pg_dump -ErrorAction Stop
    Write-Host "pg_dump trouve: $($pgDumpPath.Source)" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: pg_dump n'est pas installe ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Installez PostgreSQL client tools depuis https://www.postgresql.org/download/windows/"
    exit 1
}

# Definir le mot de passe si fourni
if ($DB_PASSWORD) {
    $env:PGPASSWORD = $DB_PASSWORD
}

# Commande pg_dump
$pgDumpCmd = "pg_dump --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=$DB_NAME --verbose --clean --create --if-exists --no-owner --no-privileges --encoding=UTF8 --format=plain --file=$OutputFile"

Write-Host "Creation du dump en cours..." -ForegroundColor Yellow
Write-Host "Commande: $pgDumpCmd" -ForegroundColor Gray
Write-Host ""

try {
    # Executer pg_dump
    Invoke-Expression $pgDumpCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Dump cree avec succes !" -ForegroundColor Green
        Write-Host ""
        
        # Verifier que le fichier existe
        if (Test-Path $OutputFile) {
            $fileInfo = Get-Item $OutputFile
            $fileSize = [math]::Round($fileInfo.Length / 1MB, 2)
            $fileLines = (Get-Content $OutputFile | Measure-Object -Line).Lines
            
            Write-Host "Informations du fichier:"
            Write-Host "   Fichier: $OutputFile"
            Write-Host "   Taille: $fileSize MB"
            Write-Host "   Lignes: $fileLines"
            Write-Host "   Cree le: $($fileInfo.CreationTime)"
            Write-Host ""
            
            # Apercu du dump
            Write-Host "Apercu du dump (premieres 10 lignes):"
            Write-Host "====================================="
            $firstLines = Get-Content $OutputFile -Head 10
            for ($i = 0; $i -lt $firstLines.Count; $i++) {
                Write-Host "$(($i + 1).ToString().PadLeft(2)): $($firstLines[$i])"
            }
            if ($fileLines -gt 10) {
                Write-Host "   ..."
            }
            Write-Host ""
            
            # Instructions pour l'import
            Write-Host "Instructions pour l'import en production:"
            Write-Host "========================================="
            Write-Host "1. Copiez le fichier sur le serveur de production:"
            Write-Host "   scp $OutputFile user@production-server:/path/to/backup/"
            Write-Host ""
            Write-Host "2. Sur le serveur de production, importez le dump:"
            Write-Host "   psql -h localhost -U postgres -d ebvision_production < $OutputFile"
            Write-Host ""
            Write-Host "3. Ou utilisez la commande complete:"
            Write-Host "   PGPASSWORD=your_password psql -h localhost -U postgres -d ebvision_production -f $OutputFile"
            Write-Host ""
            
        } else {
            Write-Host "ERREUR: Le fichier de dump n'a pas ete cree" -ForegroundColor Red
            exit 1
        }
        
    } else {
        Write-Host "ERREUR: Erreur lors de la creation du dump (Code de sortie: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "ERREUR: Erreur lors de l'execution de pg_dump: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "SUCCESS: Dump UTF-8 cree avec succes !" -ForegroundColor Green
Write-Host "Fichier: $OutputFile"
