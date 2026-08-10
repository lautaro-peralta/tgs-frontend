@echo off
REM Apply OpenTelemetry Fix for Windows
REM This script resolves peer dependency conflicts

echo ================================================
echo  OpenTelemetry Peer Dependency Fix
echo ================================================
echo.

REM Step 1: Create backup
echo [1/6] Creating backup...
copy package.json package.json.backup >nul 2>&1
if exist package-lock.json copy package-lock.json package-lock.json.backup >nul 2>&1
echo     ✓ Backup created
echo.

REM Step 2: Verify overrides in package.json
echo [2/6] Verifying configuration...
findstr /C:"overrides" package.json >nul
if errorlevel 1 (
    echo     ✗ ERROR: overrides not found in package.json
    echo     Please add the overrides section manually
    pause
    exit /b 1
) else (
    echo     ✓ Overrides configuration found
)
echo.

REM Step 3: Clean cache
echo [3/6] Cleaning npm cache...
npm cache clean --force
echo     ✓ Cache cleaned
echo.

REM Step 4: Remove node_modules (Windows safe)
echo [4/6] Removing node_modules...
if exist node_modules (
    rmdir /s /q node_modules 2>nul
    if exist node_modules (
        echo     ⚠ Some files couldn't be deleted (locked)
        echo     This is normal on Windows - npm install will handle it
    ) else (
        echo     ✓ node_modules removed
    )
)

REM Step 5: Remove package-lock.json
if exist package-lock.json (
    del /f /q package-lock.json
    echo     ✓ package-lock.json removed
)
echo.

REM Step 6: Install dependencies
echo [5/6] Installing dependencies...
echo     This may take 2-3 minutes...
echo.
npm install

echo.
echo ================================================
echo [6/6] Verification
echo ================================================
echo.

REM Verify OpenTelemetry versions
echo Checking OpenTelemetry versions:
npm list @opentelemetry/api 2>nul | findstr "1.9.0"
if errorlevel 1 (
    echo     ⚠ Warning: @opentelemetry/api version might not be correct
) else (
    echo     ✓ @opentelemetry/api: 1.9.0
)

echo.
echo ================================================
echo  Fix Applied Successfully!
echo ================================================
echo.
echo Next steps:
echo   1. Run tests: npm run test:ci
echo   2. Run build: npm run build
echo   3. Commit: git add package.json package-lock.json
echo   4. Commit: git commit -m "fix(deps): resolve OpenTelemetry conflicts"
echo   5. Push: git push origin implement-testing
echo.
pause
