# One-Click Local Development Stack Launcher
param(
    [string]$Action = "up"
)

$RootDir = Split-Path -Parent $PSScriptRoot

Set-Location $RootDir

switch ($Action.ToLower()) {
    "up" {
        Write-Host "==> Starting Genyxo Local Development Stack..." -ForegroundColor Cyan
        docker compose -f docker-compose.dev.yml up --build -d
        Write-Host "==> Stack is running!" -ForegroundColor Green
        Write-Host "    - Backend:         http://localhost:3000"
        Write-Host "    - Frontend:        http://localhost:3001"
        Write-Host "    - Redis Commander: http://localhost:8081"
        Write-Host "    - MySQL Port:      3306"
    }
    "down" {
        Write-Host "==> Stopping Dev Stack..." -ForegroundColor Yellow
        docker compose -f docker-compose.dev.yml down
    }
    "logs" {
        docker compose -f docker-compose.dev.yml logs -f
    }
    default {
        Write-Host "Usage: .\scripts\dev.ps1 -Action [up|down|logs]" -ForegroundColor Red
    }
}
