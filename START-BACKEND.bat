@echo off
cd /d "%~dp0backend\HelpDeskPro.Api"
dotnet run --urls "http://localhost:5001"
pause
