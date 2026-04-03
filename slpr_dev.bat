@echo off
echo SLPR CLEAN TEST
pause
@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo SLPR DEV v8 - Stage 1
echo PATH before:
echo %PATH%
echo.

set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%PATH%"

echo PATH after:
echo %PATH%
echo.

pause

echo SLPR DEV v8 - Stage 2
echo Checking Node.js...
where node
if errorlevel 1 (
    echo ERROR: Node not found.
    pause
    exit /b
)

node -v
if errorlevel 1 (
    echo ERROR: node -v failed.
    pause
    exit /b
)

echo.
echo Checking npm...
where npm
if errorlevel 1 (
    echo ERROR: npm not found.
    pause
    exit /b
)

call npm -v
if errorlevel 1 (
    echo ERROR: npm -v failed.
    pause
    exit /b
)

echo.
pause

echo SLPR DEV v8 - Stage 3
echo Checking project folder...
echo Current directory:
cd
echo.

if not exist "package.json" (
    echo ERROR: package.json not found in this folder.
    echo Run this script from your SLPR project root.
    pause
    exit /b
)

echo package.json found.
echo.
pause
echo SLPR DEV v8 - Stage 4
echo Checking Expo CLI...
where npx
if errorlevel 1 (
    echo ERROR: npx not found.
    pause
    exit /b
)

call npx expo --version
if errorlevel 1 (
    echo ERROR: Expo CLI not available.
    pause
    exit /b
)

echo Expo CLI OK.
echo.
pause

echo SLPR DEV v8 - Stage 5
echo Checking EAS CLI...
where eas
if errorlevel 1 (
    echo WARNING: EAS CLI not installed.
    echo.
    pause
    goto menu
)

call eas --version
if errorlevel 1 (
    echo ERROR: EAS CLI found but failed to run.
    pause
    exit /b
)

echo EAS CLI OK.
echo.
pause

:menu
echo.
echo ================================================
echo  SLPR DEV MENU
echo ================================================
echo  1. Start Expo
echo  2. Start Expo (clear cache)
echo  3. Build APK / AAB (EAS)
echo  4. Exit
echo ================================================
echo.

set "CHOICE="
set /p CHOICE=Enter choice (1-4): 

if "%CHOICE%"=="1" goto start_normal
if "%CHOICE%"=="2" goto start_clear
if "%CHOICE%"=="3" goto build_apk
if "%CHOICE%"=="4" goto abort

echo Invalid choice.
goto menu


:start_normal
echo.
echo Starting Expo...
call npx expo start
goto menu


:start_clear
echo.
echo Starting Expo (clear cache)...
call npx expo start --clear
goto menu


:build_apk
if not exist "eas.json" (
    echo eas.json missing. Run: eas build:configure
    pause
    goto menu
)

echo.
echo Build type:
echo  1. Preview APK
echo  2. Production AAB
set "BUILD_CHOICE="
set /p BUILD_CHOICE=Choice (1-2): 

if "%BUILD_CHOICE%"=="1" (
    call eas build --platform android --profile preview
    goto menu
)

if "%BUILD_CHOICE%"=="2" (
    call eas build --platform android --profile production
    goto menu
)

echo Invalid build choice.
goto build_apk


:abort
echo.
echo Exiting SLPR Dev Console.
echo.
pause
exit /b