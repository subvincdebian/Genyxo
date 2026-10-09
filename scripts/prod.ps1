# Production Docker Stack Launcher
param(
    [string]$Action = "up"
)

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

if (-not (Test-Path ".env")) {
    Write-Host "[WARNING] .env file not found! Generating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

switch ($Action.ToLower()) {
    "up" {
        Write-Host "==> Starting Genyxo Production Stack..." -ForegroundColor Cyan
        docker compose up --build -d
        Write-Host "==> Production stack is up and running!" -ForegroundColor Green
        docker compose ps
    }
    "down" {
        Write-Host "==> Stopping Production Stack..." -ForegroundColor Yellow
        docker compose down
    }
    "restart" {
        docker compose restart
    }
    "status" {
        docker compose ps
    }
    "logs" {
        docker compose logs -f
    }
    default {
        Write-Host "Usage: .\scripts\prod.ps1 -Action [up|down|restart|status|logs]" -ForegroundColor Red
    }
}
