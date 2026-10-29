. "$PSScriptRoot/common.ps1"
Assert-Command node
$webPath = Join-Path $script:RepoRoot 'apps/web'
$nextBin = Join-Path $webPath 'node_modules/next/dist/bin/next'
if (-not (Test-Path -LiteralPath $nextBin)) {
    throw 'Web dependencies are missing. Run scripts/setup.ps1 first.'
}
Assert-PortAvailable 3100
Push-Location $webPath
try {
    & node $nextBin dev --hostname 127.0.0.1 --port 3100
    if ($LASTEXITCODE -ne 0) { throw "Web server stopped with exit code $LASTEXITCODE." }
}
finally { Pop-Location }
