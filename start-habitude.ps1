$ErrorActionPreference = "Continue"
Write-Host "Starting HABITUDE PostgreSQL 18 cluster on 127.0.0.1:5433..." -ForegroundColor Cyan
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$pgData = "$PSScriptRoot\.postgres_data"
& "$pgBin\pg_ctl.exe" -D $pgData -l "$pgData\logfile.log" -o "-p 5433 -h 127.0.0.1" start

Write-Host "Applying Django migrations and seeding reference data..." -ForegroundColor Cyan
& "$PSScriptRoot\backend\.venv\Scripts\python.exe" "$PSScriptRoot\backend\manage.py" migrate
& "$PSScriptRoot\backend\.venv\Scripts\python.exe" "$PSScriptRoot\backend\manage.py" seed_habitude

Write-Host "HABITUDE database is ready. Start backend on 127.0.0.1:8080 and frontend with 'npm run dev' in ./frontend." -ForegroundColor Green
