$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$SslDir = Join-Path $ScriptDir "ssl"

if (-not (Test-Path $SslDir -PathType Container)) {
    New-Item -ItemType Directory -Path $SslDir | Out-Null
}

$CertPath = Join-Path $SslDir "cert.pem"
$KeyPath = Join-Path $SslDir "key.pem"

if ((Test-Path $CertPath -PathType Leaf) -and (Test-Path $KeyPath -PathType Leaf)) {
    Write-Host "==> SSL certificates already exist in $SslDir" -ForegroundColor Yellow
    exit 0
}
if ((Test-Path $CertPath) -or (Test-Path $KeyPath)) {
    throw "Incomplete certificate pair: inspect the existing files before generating replacements."
}

$TempDir = Join-Path $SslDir (".dev-certs-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TempDir | Out-Null
try {
    Write-Host "==> Generating local self-signed SSL certificates for Genyxo..." -ForegroundColor Cyan
    $TempCert = Join-Path $TempDir "cert.pem"
    $TempKey = Join-Path $TempDir "key.pem"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
        -keyout $TempKey `
        -out $TempCert `
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" `
        -subj "/C=US/ST=Dev/L=Local/O=Genyxo/CN=localhost"
    if ($LASTEXITCODE -ne 0) { throw "OpenSSL failed to generate development certificates." }
    if (-not (Test-Path $TempCert -PathType Leaf) -or -not (Test-Path $TempKey -PathType Leaf)) {
        throw "OpenSSL did not produce both certificate files."
    }
    Move-Item -LiteralPath $TempKey -Destination $KeyPath
    Move-Item -LiteralPath $TempCert -Destination $CertPath
    Write-Host "==> SSL certificates generated in $SslDir" -ForegroundColor Green
} finally {
    $ResolvedTemp = [IO.Path]::GetFullPath($TempDir)
    $ResolvedSsl = [IO.Path]::GetFullPath($SslDir) + [IO.Path]::DirectorySeparatorChar
    if (-not $ResolvedTemp.StartsWith($ResolvedSsl, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Certificate cleanup path escaped the SSL directory."
    }
    Remove-Item -LiteralPath $ResolvedTemp -Recurse -Force
}
