@echo off
setlocal
cd /d "%~dp0"
where dotnet >nul 2>&1 || (echo .NET 8 SDK/runtime not found.&pause&exit /b 1)
where npm >nul 2>&1 || (echo Node.js/npm not found.&pause&exit /b 1)
start "HelpDeskPro Backend" cmd /k "cd /d "%~dp0backend\HelpDeskPro.Api" && dotnet run --urls http://localhost:5001"
set "HEALTH=http://localhost:5001/api/health"
for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing '%HEALTH%'; if($r.StatusCode -eq 200){exit 0}else{exit 1}} catch {exit 1}" >nul 2>&1
  if not errorlevel 1 goto backend_ready
  timeout /t 1 /nobreak >nul
)
echo Backend did not become ready within 30 seconds.
pause
exit /b 1
:backend_ready
start "HelpDeskPro Frontend" cmd /k "cd /d "%~dp0frontend" && if not exist node_modules npm install && npm run dev -- --host 0.0.0.0"
timeout /t 3 /nobreak >nul
start "" http://localhost:5173
endlocal
