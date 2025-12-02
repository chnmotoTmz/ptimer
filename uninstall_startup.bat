@echo off
setlocal

REM --- Configuration ---
set "SHORTCUT_NAME=PC Activity Logger.lnk"
REM --- End Configuration ---

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\%SHORTCUT_NAME%"

echo ===========================================
echo  PC Activity Logger Startup Uninstaller
echo ===========================================
echo.

if not exist "%SHORTCUT_PATH%" (
    echo The startup shortcut was not found.
    echo It seems the logger is not configured to run on startup.
    echo No action is needed.
) else (
    echo The following startup shortcut will be removed:
    echo   %SHORTCUT_PATH%
    echo.
    del "%SHORTCUT_PATH%"
    if %errorlevel% equ 0 (
        echo =================================================================
        echo  SUCCESS!
        echo  The PC Activity Logger will no longer run automatically on startup.
        echo =================================================================
    ) else (
        echo ERROR: Could not remove the shortcut.
        echo You may need to run this uninstaller as an administrator.
    )
)

echo.
pause
endlocal
