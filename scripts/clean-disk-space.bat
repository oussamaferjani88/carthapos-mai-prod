@echo off
REM ============================================
REM Script de Nettoyage Disque C: pour POS System
REM ============================================

echo.
echo ================================================
echo   NETTOYAGE DISQUE C: - POS SYSTEM
echo ================================================
echo.

REM 1. Nettoyer npm cache
echo [1/5] Nettoyage du cache npm...
call npm cache clean --force
echo   ✓ Cache npm nettoyé

REM 2. Nettoyer npm logs
echo.
echo [2/5] Nettoyage des logs npm...
if exist "%LOCALAPPDATA%\npm-cache\_logs" (
    rmdir /s /q "%LOCALAPPDATA%\npm-cache\_logs"
    echo   ✓ Logs npm supprimés
) else (
    echo   • Pas de logs à supprimer
)

REM 3. Nettoyer fichiers temporaires Windows
echo.
echo [3/5] Nettoyage des fichiers temporaires...
if exist "%TEMP%\npm-*" (
    del /f /s /q "%TEMP%\npm-*" 2>nul
    echo   ✓ Fichiers npm temporaires supprimés
) else (
    echo   • Pas de fichiers temporaires npm
)

REM 4. Nettoyer les caches Vite dans generated-pos
echo.
echo [4/5] Nettoyage des caches Vite dans les POS générés...
set "count=0"
for /d %%D in ("..\generated-pos\pos-*") do (
    if exist "%%D\node_modules\.vite" (
        rmdir /s /q "%%D\node_modules\.vite" 2>nul
        set /a count+=1
    )
    if exist "%%D\node_modules\.cache" (
        rmdir /s /q "%%D\node_modules\.cache" 2>nul
    )
)
echo   ✓ %count% caches Vite nettoyés

REM 5. Nettoyer dist temporaires dans generated-pos
echo.
echo [5/5] Nettoyage des dossiers dist temporaires...
set "count2=0"
for /d %%D in ("..\generated-pos\pos-*") do (
    if exist "%%D\dist" (
        rmdir /s /q "%%D\dist" 2>nul
        set /a count2+=1
    )
    if exist "%%D\temp-build" (
        rmdir /s /q "%%D\temp-build" 2>nul
    )
)
echo   ✓ %count2% dossiers dist nettoyés

echo.
echo ================================================
echo   NETTOYAGE TERMINÉ !
echo ================================================
echo.
echo Espace libéré sur C: Vérifiez avec: wmic logicaldisk get caption,freespace
echo.
pause
