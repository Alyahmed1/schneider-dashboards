@echo off
rem Starts the Telal West AI City dashboard and opens it in your browser.
rem Keep this window open while you use the site; close it (or press Ctrl+C) to stop.
cd /d "%~dp0"

rem already running? then just open it, no error
netstat -ano | findstr ":4728 " | findstr LISTENING >nul
if %errorlevel%==0 (
  echo The dashboard is already running. Opening it in your browser...
  start "" http://localhost:4728
  timeout /t 3 >nul
  exit /b
)

if not exist node_modules (
  echo Installing, one time only. This takes a couple of minutes...
  call npm install
)

echo Starting the dashboard at http://localhost:4728 ...
rem open the browser a few seconds from now, when the site is ready
start "" cmd /c "timeout /t 4 >nul & start http://localhost:4728"
call npm run dev
pause
