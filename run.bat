@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo [P-Scan] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

:menu
cls
echo ============================================
echo   P-Scan - Mobile Document Scanner
echo ============================================
echo.
echo   1. Start Dev Server (Web / Mobile Browser)
echo   2. Run Unit Tests (npm test)
echo   3. Build Web ^& Sync Android (cap:sync)
echo   4. Build Android Debug APK
echo   5. Exit
echo.
set /p choice="Select an option (1-5) [default: 1]: "
if "%choice%"=="" set choice=1

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto test
if "%choice%"=="3" goto sync
if "%choice%"=="4" goto apk
if "%choice%"=="5" exit /b 0
goto menu

:dev
echo.
echo [P-Scan] Starting Vite dev server on http://localhost:5180 ...
echo [TIP] Open the Network URL shown below on your phone browser (same Wi-Fi).
call npm run dev -- --open
pause
goto menu

:test
echo.
call npm test
pause
goto menu

:sync
echo.
call npm run cap:sync
pause
goto menu

:apk
echo.
call npm run cap:sync
if errorlevel 1 (
  echo [ERROR] Build or Capacitor sync failed.
  pause
  goto menu
)
pushd android
call gradlew.bat assembleDebug
popd
if not errorlevel 1 (
  echo.
  echo [SUCCESS] APK created at: android\app\build\outputs\apk\debug\app-debug.apk
)
pause
goto menu
