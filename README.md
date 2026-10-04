# HelpDeskPro — Final Portfolio Edition

Full-stack IT Support / Ticketing System built with React + Vite and ASP.NET Core 8 + EF Core + SQLite.

## Included
- JWT authentication + Admin / Support / Employee roles
- Tickets with workflow, SLA, tags, comments, attachments and ratings
- Departments and department details
- Knowledge Base article details
- Notifications with unread/read state and real-time SignalR updates
- Audit Log with search, filters, CSV export and pagination
- Global search across Tickets, Users, Departments, Knowledge Base and Audit Log
- Reports with filters, charts, SLA and support performance
- Profile editing, password change, avatar, notification preferences and activity
- SMTP email notification integration (disabled by default; configure in appsettings.json)
- Server-side pagination for Tickets and Audit Log
- Local attachment storage with Docker volume support
- Dark mode
- Docker / Docker Compose deployment
- xUnit tests for ticket rules

## Local run
Backend:
```powershell
cd .\backend\HelpDeskPro.Api
dotnet run --urls "http://localhost:5001"
```
Frontend (new terminal):
```powershell
cd .\frontend
npm install
npm run dev
```
Open http://localhost:5173

## Docker
```bash
docker compose up --build
```
Open http://localhost:5173

## Tests
```powershell
dotnet test .\backend\HelpDeskPro.Api.Tests
```

## SMTP
Set `Email:Enabled` to true and configure Host, Port, Username, Password, From and EnableSsl in `backend/HelpDeskPro.Api/appsettings.json` or environment variables.

## Demo Accounts

- Admin — admin@helpdeskpro.com
- Support — support@helpdeskpro.com
- Employee — employee@helpdeskpro.com

> Demo credentials are available for local testing only.