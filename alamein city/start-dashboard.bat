@echo off
rem Starts the New Alamein City COC dashboard and opens it in your browser (port 4750).
cd /d "%~dp0"
netstat -ano | findstr ":4750 " | findstr LISTENING >nul
if %errorlevel%==0 (
  start "" http://localhost:4750
  exit /b
)
if not exist node_modules call npm install
start "" cmd /c "timeout /t 4 >nul & start http://localhost:4750"
call npm run dev
pause
