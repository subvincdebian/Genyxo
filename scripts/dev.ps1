# One-Click Local Development Stack Launcher
param(
    [ValidateSet("up", "down", "logs")]
    [string]$Action = "up"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot

Set-Location $RootDir

switch ($Action.ToLower()) {
    "up" {
        Write-Host "==> Starting Genyxo Local Development Stack..." -ForegroundColor Cyan
        docker compose --env-file apps/backend/.env -f docker-compose.dev.yml up --build -d
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host "==> Stack is running!" -ForegroundColor Green
        Write-Host "    - Backend:         http://localhost:3000"
        Write-Host "    - Frontend:        http://localhost:3001"
        Write-Host "    - Redis Commander: http://localhost:8081"
        Write-Host "    - MySQL Port:      3306"
    }
    "down" {
        Write-Host "==> Stopping Dev Stack..." -ForegroundColor Yellow
        docker compose --env-file apps/backend/.env -f docker-compose.dev.yml down
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    "logs" {
        docker compose --env-file apps/backend/.env -f docker-compose.dev.yml logs -f
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}
