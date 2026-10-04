@echo off
setlocal
cd /d "%~dp0"
where dotnet >nul 2>nul || (echo .NET 8 SDK is required. & pause & exit /b 1)
where npm >nul 2>nul || (echo Node.js/npm is required. & pause & exit /b 1)
start "HelpDeskPro Backend" cmd /k "cd /d "%~dp0backend\HelpDeskPro.Api" && dotnet run --urls http://localhost:5001"
timeout /t 4 /nobreak >nul
if not exist "frontend\node_modules" (cd frontend && call npm install && cd ..)
start "HelpDeskPro Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul
start http://localhost:5173
