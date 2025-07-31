$filePath = "public\opportunities.html"
$bytes = [System.IO.File]::ReadAllBytes($filePath)

Write-Host "Analyse des premiers 50 octets du fichier:"
Write-Host "=========================================="

for ($i = 0; $i -lt [Math]::Min(50, $bytes.Length); $i++) {
    $byte = $bytes[$i]
    $char = [char]$byte
    $hex = "{0:X2}" -f $byte
    $dec = $byte
    
    Write-Host "Position $i`: Byte=$hex ($dec) Char='$char'"
}

Write-Host "`nAnalyse des caractères spéciaux:"
Write-Host "================================="

for ($i = 0; $i -lt $bytes.Length; $i++) {
    $byte = $bytes[$i]
    if ($byte -lt 32 -or $byte -gt 126) {
        $char = [char]$byte
        $hex = "{0:X2}" -f $byte
        Write-Host "Position $i`: Caractère spécial Byte=$hex Char='$char'"
    }
} 