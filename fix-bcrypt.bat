@echo off
echo ========================================
echo Fix bcrypt Build Error - Clean Install
echo ========================================
echo.

cd /d "%~dp0pos-template"

echo [1/5] Removing node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo ✓ node_modules removed
) else (
    echo ✓ node_modules already clean
)

echo.
echo [2/5] Removing package-lock.json...
if exist package-lock.json (
    del /f /q package-lock.json
    echo ✓ package-lock.json removed
) else (
    echo ✓ package-lock.json already clean
)

echo.
echo [3/5] Installing dependencies with bcryptjs (no native compilation)...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)
echo ✓ Dependencies installed successfully

echo.
echo [4/5] Building the application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)
echo ✓ Build completed successfully

echo.
echo [5/5] Testing Electron...
echo Starting Electron in 3 seconds... (Press Ctrl+C to cancel)
timeout /t 3 /nobreak >nul
start cmd /k "npm run electron"

echo.
echo ========================================
echo ✅ Setup completed successfully!
echo ========================================
echo.
echo bcrypt has been replaced with bcryptjs
echo No Visual Studio Build Tools needed!
echo.
echo Next steps:
echo 1. Test the Electron app (should open automatically)
echo 2. Try first-time setup with admin password
echo 3. Test login authentication
echo.
pause
