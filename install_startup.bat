@echo off
setlocal

REM --- Configuration ---
set "PYTHON_SCRIPT_NAME=pc_activity_logger.py"
set "SHORTCUT_NAME=PC Activity Logger.lnk"
set "SHORTCUT_DESCRIPTION=Starts the PC Activity Logger to record PC operations."
REM --- End Configuration ---

REM Get the directory of this batch file, which is assumed to be the project root.
set "BATCH_DIR=%~dp0"
for %%i in ("%BATCH_DIR%") do set "PROJECT_ROOT=%%~fi"

set "PYTHON_SCRIPT_PATH=%PROJECT_ROOT%\%PYTHON_SCRIPT_NAME%"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\%SHORTCUT_NAME%"

echo ========================================
echo  PC Activity Logger Startup Installer
echo ========================================
echo.

REM Check if the Python script exists
if not exist "%PYTHON_SCRIPT_PATH%" (
    echo ERROR: The script '%PYTHON_SCRIPT_NAME%' was not found in the same directory.
    echo Please make sure this installer is in the same folder as the Python script.
    pause
    exit /b 1
)

echo The following shortcut will be created to run on startup:
echo   Shortcut: %SHORTCUT_PATH%
echo   Target: %PYTHON_SCRIPT_PATH%
echo.

REM Find pythonw.exe to run the script without a console window
where pythonw.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: 'pythonw.exe' not found in your PATH.
    echo The logger will open a console window on startup.
    echo We will try to use 'python.exe' instead.
    set "PYTHON_EXE_PATH=python.exe"
    where python.exe >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Neither 'python.exe' nor 'pythonw.exe' were found in your PATH.
        echo Please install Python and ensure it is added to your system's PATH.
        pause
        exit /b 1
    )
) else (
    rem We found pythonw.exe, let's get its full path
    for /f "delims=" %%p in ('where pythonw.exe') do set "PYTHON_EXE_PATH=%%p"
)

echo Using Python executable: %PYTHON_EXE_PATH%
echo.

REM Use a temporary VBScript to create a shortcut with specific properties
set "VBS_SCRIPT=%TEMP%\create_shortcut.vbs"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%SHORTCUT_PATH%" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo   oLink.TargetPath = "%PYTHON_EXE_PATH%" >> "%VBS_SCRIPT%"
echo   oLink.Arguments = "\""%PYTHON_SCRIPT_PATH%\"" >> "%VBS_SCRIPT%"
echo   oLink.Description = "%SHORTCUT_DESCRIPTION%" >> "%VBS_SCRIPT%"
echo   oLink.WorkingDirectory = "%PROJECT_ROOT%" >> "%VBS_SCRIPT%"
echo   oLink.IconLocation = "System32\shell32.dll, 4" >> "%VBS_SCRIPT%"
echo   oLink.Save >> "%VBS_SCRIPT%"
echo WScript.Echo "Shortcut created successfully." >> "%VBS_SCRIPT%"

REM Execute the VBScript and capture output
cscript //nologo "%VBS_SCRIPT%"

REM Clean up
if exist "%VBS_SCRIPT%" del "%VBS_SCRIPT%"

echo.
echo =================================================================
echo  SUCCESS!
echo  The PC Activity Logger is now configured to start automatically
echo  the next time you log in to Windows.
echo =================================================================
echo.
pause
endlocal
