@echo off
title GUJERO One-Click Cloud Deployer
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist .git (
    echo [WARNING] Git Repository not found!
    pause
    exit /b 1
)

echo ==========================================
echo [0/3] Building Client...
echo ==========================================
pushd client
call npm run build:local
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    popd
    pause
    exit /b 1
)
popd
echo [OK] Build success.
echo.

echo ==========================================
echo [1/3] Uploading to GitHub...
echo ==========================================
git add .
git status

git diff --staged --quiet
if %errorlevel% equ 0 (
    echo [INFO] No changes detected. Forcing redeploy...
    git commit --allow-empty -m "Auto-deploy: Force redeploy"
) else (
    git commit -m "Auto-deploy: Update from local PC"
)

git push origin main
if %errorlevel% neq 0 (
    echo [ERROR] Git push failed.
    pause
    exit /b 1
)
echo [OK] Git push success.
echo.

echo ==========================================
echo [2/3] Waiting for Railway build (approx 4 min)...
echo ==========================================
timeout /t 240 /nobreak >nul

echo [INFO] Sending sync command...
curl.exe -s --max-time 600 "https://www.gujero.com/api/sync"
echo.

echo ==========================================
echo [3/3] Verifying deployment...
echo ==========================================
echo [Version Check]
curl.exe -s "https://www.gujero.com/api/deploy-check"
echo.
echo [Products Count]
curl.exe -s "https://www.gujero.com/api/debug-products-count"
echo.
echo ==========================================
echo [COMPLETE] Deployment process finished.
echo URL: https://www.gujero.com
echo ==========================================
pause
