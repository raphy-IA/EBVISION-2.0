# Script PowerShell pour créer un dump UTF-8 de la base de données EB-Vision
# Usage: .\create-utf8-dump.ps1 [options]

param(
    [string]$Host = "localhost",
    [int]$Port = 5432,
    [string]$Database = "ebvision",
    [string]$User = "postgres",
    [string]$Password = "",
    [string]$OutputFile = ""
)

# Configuration par défaut
$DB_HOST = $Host
$DB_PORT = $Port
$DB_NAME = $Database
$DB_USER = $User
$DB_PASSWORD = $Password

# Générer le nom du fichier de sortie si non spécifié
if ([string]::IsNullOrEmpty($OutputFile)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $OutputFile = "backup_utf8_$timestamp.sql"
}

# Fonctions pour les messages colorés
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Afficher la configuration
Write-Host "🗄️  Création du dump UTF-8 de la base de données EB-Vision" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "Configuration:"
Write-Host "   Host: $DB_HOST"
Write-Host "   Port: $DB_PORT"
Write-Host "   Database: $DB_NAME"
Write-Host "   User: $DB_USER"
Write-Host "   Password: $(if ($DB_PASSWORD) { '***' } else { 'Non défini' })"
Write-Host "   Output: $OutputFile"
Write-Host ""

# Vérifier que pg_dump est installé
try {
    $pgDumpPath = Get-Command pg_dump -ErrorAction Stop
    Write-Success "pg_dump trouvé: $($pgDumpPath.Source)"
} catch {
    Write-Error "pg_dump n'est pas installé ou n'est pas dans le PATH"
    Write-Host "Installez PostgreSQL client tools:"
    Write-Host "  Windows: Téléchargez depuis https://www.postgresql.org/download/windows/"
    Write-Host "  Ou utilisez Chocolatey: choco install postgresql"
    exit 1
}

# Vérifier la connexion à la base de données
Write-Info "Vérification de la connexion à la base de données..."

# Construire la commande psql pour tester la connexion
$psqlTestCmd = "psql -h `"$DB_HOST`" -p $DB_PORT -U `"$DB_USER`" -d `"$DB_NAME`" -c `"SELECT 1;`""

if ($DB_PASSWORD) {
    $env:PGPASSWORD = $DB_PASSWORD
}

try {
    $testResult = Invoke-Expression $psqlTestCmd 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Connexion à la base de données réussie"
    } else {
        throw "Erreur de connexion"
    }
} catch {
    Write-Error "Impossible de se connecter à la base de données"
    Write-Host "Vérifiez:"
    Write-Host "  - Que PostgreSQL est démarré"
    Write-Host "  - Que les paramètres de connexion sont corrects"
    Write-Host "  - Que l'utilisateur a les permissions nécessaires"
    exit 1
}

# Créer le dump
Write-Info "Création du dump en cours..."
Write-Host ""

# Commande pg_dump avec options UTF-8
$pgDumpCmd = @(
    "pg_dump",
    "--host=$DB_HOST",
    "--port=$DB_PORT",
    "--username=$DB_USER",
    "--dbname=$DB_NAME",
    "--verbose",
    "--clean",
    "--create",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--encoding=UTF8",
    "--format=plain",
    "--file=$OutputFile"
) -join " "

Write-Host "Commande: $pgDumpCmd" -ForegroundColor Gray
Write-Host ""

try {
    # Exécuter pg_dump
    Invoke-Expression $pgDumpCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dump créé avec succès !"
        Write-Host ""
        
        # Vérifier que le fichier existe et afficher ses informations
        if (Test-Path $OutputFile) {
            $fileInfo = Get-Item $OutputFile
            $fileSize = [math]::Round($fileInfo.Length / 1MB, 2)
            $fileLines = (Get-Content $OutputFile | Measure-Object -Line).Lines
            
            Write-Info "Informations du fichier:"
            Write-Host "   Fichier: $OutputFile"
            Write-Host "   Taille: $fileSize MB"
            Write-Host "   Lignes: $fileLines"
            Write-Host "   Créé le: $($fileInfo.CreationTime)"
            Write-Host ""
            
            # Afficher les premières lignes du dump
            Write-Info "Aperçu du dump (premières 10 lignes):"
            Write-Host "=========================================="
            $firstLines = Get-Content $OutputFile -Head 10
            for ($i = 0; $i -lt $firstLines.Count; $i++) {
                Write-Host "$(($i + 1).ToString().PadLeft(2)): $($firstLines[$i])"
            }
            if ($fileLines -gt 10) {
                Write-Host "   ..."
            }
            Write-Host ""
            
            # Instructions pour l'import
            Write-Info "Instructions pour l'import en production:"
            Write-Host "============================================="
            Write-Host "1. Copiez le fichier sur le serveur de production:"
            Write-Host "   scp $OutputFile user@production-server:/path/to/backup/"
            Write-Host ""
            Write-Host "2. Sur le serveur de production, importez le dump:"
            Write-Host "   psql -h localhost -U postgres -d ebvision_production < $OutputFile"
            Write-Host ""
            Write-Host "3. Ou utilisez la commande complète:"
            Write-Host "   PGPASSWORD=your_password psql -h localhost -U postgres -d ebvision_production -f $OutputFile"
            Write-Host ""
            Write-Host "4. Vérifiez l'import:"
            Write-Host "   psql -h localhost -U postgres -d ebvision_production -c `"\dt`""
            Write-Host ""
            
            # Vérifier l'encodage
            Write-Info "Vérification de l'encodage..."
            $fileContent = Get-Content $OutputFile -Raw
            if ($fileContent -match "[^\x00-\x7F]") {
                Write-Success "Le fichier contient des caractères UTF-8"
            } else {
                Write-Warning "Le fichier ne contient que des caractères ASCII"
            }
            
        } else {
            Write-Error "Le fichier de dump n'a pas été créé"
            exit 1
        }
        
    } else {
        Write-Error "Erreur lors de la création du dump (Code de sortie: $LASTEXITCODE)"
        exit 1
    }
    
} catch {
    Write-Error "Erreur lors de l'exécution de pg_dump: $($_.Exception.Message)"
    exit 1
}

Write-Host ""
Write-Success "Dump UTF-8 créé avec succès !"
Write-Host "Fichier: $OutputFile"





