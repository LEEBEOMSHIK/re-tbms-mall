param([string]$Python = 'python')
. "$PSScriptRoot/common.ps1"

Assert-Command node
Assert-Command npm.cmd
Assert-Command $Python
$nodeVersion = & node -p 'process.versions.node'
if ($LASTEXITCODE -ne 0 -or [version]$nodeVersion -lt [version]'24.18.0' -or [version]$nodeVersion -ge [version]'25.0.0') {
    throw 'Node.js 24.18+ (24.x) is required.'
}
$npmVersion = & npm.cmd --version
if ($LASTEXITCODE -ne 0 -or [version]$npmVersion -lt [version]'11.16.0' -or [version]$npmVersion -ge [version]'12.0.0') {
    throw 'npm 11.16+ (11.x) is required.'
}
& $Python -c 'import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)'
if ($LASTEXITCODE -ne 0) { throw 'Python 3.11+ is required.' }

$apiPath = Join-Path $script:RepoRoot 'services/api'
$webPath = Join-Path $script:RepoRoot 'apps/web'
$venvPath = Join-Path $apiPath '.venv'
$venvPython = Join-Path $venvPath 'Scripts/python.exe'

if (-not (Test-Path -LiteralPath $venvPython)) {
    if (Test-Path -LiteralPath $venvPath) {
        throw 'An incomplete .venv exists. Inspect it before recreating; setup will not delete it.'
    }
    & $Python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) { throw 'Python virtual environment creation failed.' }
}
Push-Location $apiPath
try {
    & $venvPython -m pip install -r requirements-dev.txt
    if ($LASTEXITCODE -ne 0) { throw 'API dependency installation failed.' }
    Copy-ExampleIfMissing '.env.example' '.env'
    & "$PSScriptRoot/admin-key.ps1"
}
finally { Pop-Location }

Push-Location $webPath
try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Web dependency installation failed.' }
    Copy-ExampleIfMissing '.env.example' '.env.local'
}
finally { Pop-Location }
Write-Host 'Setup complete. Run scripts/dev-api.ps1 and scripts/dev-web.ps1 in separate terminals.'
