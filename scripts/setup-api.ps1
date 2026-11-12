param([string]$Python)
. "$PSScriptRoot/python-runtime.ps1"
$apiPath = Join-Path $script:RepoRoot 'services/api'
$venvPath = Join-Path $apiPath '.venv'
$venvPython = Join-Path $venvPath 'Scripts/python.exe'
if (Test-Path -LiteralPath $venvPython) {
    if ($Python) { Assert-X64Python $Python }
    Assert-X64Python $venvPython
} elseif (Test-Path -LiteralPath $venvPath) {
    throw 'Incomplete .venv exists. Inspect it before recreating; setup does not delete environments.'
} else {
    $basePython = Resolve-X64Python $Python
    & $basePython -m venv $venvPath
    if ($LASTEXITCODE -ne 0) { throw 'API virtual environment creation failed.' }
}
& $venvPython -m pip install --only-binary=:all: -r (Join-Path $apiPath 'requirements-dev.txt')
if ($LASTEXITCODE -ne 0) { throw 'API dependency installation failed.' }
Assert-ApiRuntime $venvPython
Copy-ExampleIfMissing (Join-Path $apiPath '.env.example') (Join-Path $apiPath '.env')
& "$PSScriptRoot/admin-key.ps1"
Write-Host 'API setup complete: services/api/.venv (Python 3.11 x64).'
