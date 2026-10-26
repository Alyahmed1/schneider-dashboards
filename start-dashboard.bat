@echo off
rem Starts the Telal West AI City dashboard and opens it in your browser.
rem Close this window (or press Ctrl+C) to stop it.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing, one time only...
  call npm install
)
start "" http://localhost:4728
call npm run dev
