# Production Docker Stack Launcher
param(
    [ValidateSet("up", "down", "restart", "status", "logs")]
    [string]$Action = "up"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

if (-not (Test-Path "apps/backend/.env" -PathType Leaf)) {
    Write-Error "apps/backend/.env with production credentials is required."
}

$ComposeArgs = @("compose", "--env-file", "apps/backend/.env", "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml")
function Invoke-Compose {
    & docker @ComposeArgs @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

switch ($Action.ToLower()) {
    "up" {
        if (-not (Test-Path "nginx/ssl/cert.pem" -PathType Leaf) -or -not (Test-Path "nginx/ssl/key.pem" -PathType Leaf)) {
            Write-Error "nginx/ssl/cert.pem and nginx/ssl/key.pem are required for production TLS."
        }
        Write-Host "==> Starting Genyxo Production Stack..." -ForegroundColor Cyan
        Invoke-Compose config --quiet
        Invoke-Compose build
        Invoke-Compose up -d mysql redis
        Invoke-Compose run --rm db-migrate
        Invoke-Compose up -d --wait
        Invoke-Compose ps
        Write-Host "==> Production stack is up and running!" -ForegroundColor Green
    }
    "down" {
        Write-Host "==> Stopping Production Stack..." -ForegroundColor Yellow
        Invoke-Compose down
    }
    "restart" {
        Invoke-Compose restart
    }
    "status" {
        Invoke-Compose ps
    }
    "logs" {
        Invoke-Compose logs -f
    }
}
