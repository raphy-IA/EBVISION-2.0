@echo off
chcp 65001 >nul
color 0A
cls

echo ===============================================
echo    DÉMARRAGE EB-VISION 2.0
echo ===============================================
echo.

echo [1/4] Vérification du fichier .env...
findstr /C:"BRAND_CONFIG=eb-vision-2" .env >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ BRAND_CONFIG=eb-vision-2 trouvé
) else (
    echo ❌ BRAND_CONFIG non configuré
    echo.
    echo Ajout de BRAND_CONFIG=eb-vision-2 dans .env...
    echo BRAND_CONFIG=eb-vision-2 >> .env
    echo ✅ Configuration ajoutée
)

echo.
echo [2/4] Arrêt des processus Node existants...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Processus Node arrêtés
) else (
    echo ⚠️  Aucun processus Node en cours
)

echo.
echo [3/4] Démarrage du serveur...
echo.
echo ⏳ Le serveur va démarrer...
echo.
echo 📝 Après le démarrage :
echo    - Ouvrez http://localhost:3000/login.html
echo    - Appuyez sur Ctrl+Shift+R pour vider le cache
echo.
echo ===============================================
echo    SERVEUR EN COURS...
echo    Appuyez sur Ctrl+C pour arrêter
echo ===============================================
echo.

start /B npm start

echo.
echo [4/4] Attente du serveur (5 secondes)...
timeout /t 5 >nul

echo.
echo ✅ Serveur démarré !
echo.
echo 🌐 Ouvrir le navigateur :
start http://localhost:3000/login.html

echo.
echo ===============================================
echo    INSTRUCTIONS
echo ===============================================
echo.
echo 1. Une fois la page chargée, appuyez sur :
echo    Ctrl + Shift + R
echo.
echo 2. Vous devriez voir "EBVISION 2.0"
echo.
echo Si vous voyez toujours "EWM", dans la console (F12) :
echo    localStorage.clear(); location.reload();
echo.
echo ===============================================
echo.
pause

