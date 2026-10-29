param([switch]$Show)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot 'services/api/.env'
if (-not (Test-Path -LiteralPath $envPath)) {
    throw 'Run scripts/setup.ps1 first.'
}
$body = [IO.File]::ReadAllText($envPath)
$entries = [regex]::Matches($body, '(?m)^STORE_ADMIN_TOKEN\s*=\s*(.*)$')
if ($entries.Count -gt 1) { throw 'Duplicate STORE_ADMIN_TOKEN entries: fix services/api/.env first.' }
$token = if ($entries.Count -eq 1) { $entries[0].Groups[1].Value.Trim().Trim('"').Trim("'") } else { '' }
if (-not $token) {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $token = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    $body = [regex]::Replace($body, '(?m)^STORE_ADMIN_TOKEN\s*=.*\r?\n?', '')
    [IO.File]::WriteAllText($envPath, $body.TrimEnd() + "`nSTORE_ADMIN_TOKEN=$token`n", (New-Object Text.UTF8Encoding($false)))
    Write-Host 'Created a local admin key. Restart the API to load it.'
}
if ($env:STORE_ADMIN_TOKEN) { $token = $env:STORE_ADMIN_TOKEN }
if ($Show) {
    Write-Output $token
} else {
    Write-Host 'Admin key is configured. Use scripts/admin-key.ps1 -Show to display it privately in your terminal.'
}
