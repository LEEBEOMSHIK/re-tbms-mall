param([string]$Python)
. "$PSScriptRoot/common.ps1"

Assert-Command node
Assert-Command npm.cmd

$nodeVersion = & node -p 'process.versions.node'
if ($LASTEXITCODE -ne 0 -or [version]$nodeVersion -lt [version]'24.18.0' -or [version]$nodeVersion -ge [version]'25.0.0') {
    throw 'Node.js 24.18+ (24.x) is required.'
}
$npmVersion = & npm.cmd --version
if ($LASTEXITCODE -ne 0 -or [version]$npmVersion -lt [version]'11.16.0' -or [version]$npmVersion -ge [version]'12.0.0') {
    throw 'npm 11.16+ (11.x) is required.'
}
& "$PSScriptRoot/setup-api.ps1" -Python $Python
$webPath = Join-Path $script:RepoRoot 'apps/web'
Push-Location $webPath
try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Web dependency installation failed.' }
    Copy-ExampleIfMissing '.env.example' '.env.local'
}
finally { Pop-Location }
Write-Host 'Setup complete. Run scripts/dev-api.ps1 and scripts/dev-web.ps1 in separate terminals.'
