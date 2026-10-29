. "$PSScriptRoot/common.ps1"
$apiPath = Join-Path $script:RepoRoot 'services/api'
$venvPython = Join-Path $apiPath '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
    throw 'API environment is missing. Run scripts/setup.ps1 first.'
}
Assert-PortAvailable 8100
Push-Location $apiPath
try {
    & $venvPython -m uvicorn app.main:app --host 127.0.0.1 --port 8100 --reload
    if ($LASTEXITCODE -ne 0) { throw "API server stopped with exit code $LASTEXITCODE." }
}
finally { Pop-Location }
