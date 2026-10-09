$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SslDir = Join-Path $ScriptDir "ssl"

if (-not (Test-Path $SslDir)) {
    New-Item -ItemType Directory -Path $SslDir | Out-Null
}

$CertPath = Join-Path $SslDir "cert.pem"
$KeyPath = Join-Path $SslDir "key.pem"

if (-not (Test-Path $CertPath) -or -not (Test-Path $KeyPath)) {
    Write-Host "==> Generating local self-signed SSL certificates for Genyxo..." -ForegroundColor Cyan
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
        -keyout $KeyPath `
        -out $CertPath `
        -subj "/C=US/ST=Dev/L=Local/O=Genyxo/CN=localhost"
    Write-Host "==> SSL certificates generated in $SslDir" -ForegroundColor Green
} else {
    Write-Host "==> SSL certificates already exist in $SslDir" -ForegroundColor Yellow
}
