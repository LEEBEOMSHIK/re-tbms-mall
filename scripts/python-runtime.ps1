. "$PSScriptRoot/common.ps1"

function Assert-X64Python {
    param([string]$Python)
    & $Python -c "import platform,struct,sys; sys.exit(0 if sys.version_info[:2] == (3,11) and struct.calcsize('P') == 8 and platform.machine().upper() in ('AMD64', 'X86_64') else 1)"
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.11 x64 is required. ARM64 and other versions are not supported for this local environment.' }
}

function Resolve-X64Python {
    param([string]$Python)
    if ($Python) { Assert-X64Python $Python; return $Python }
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs/Python/Python311-x64/python.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs/Python/Python311/python.exe')
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            try { Assert-X64Python $candidate; return $candidate } catch { }
        }
    }
    throw 'Install Python 3.11 x64, then run scripts/setup-api.ps1 -Python <full path to python.exe>.'
}

function Assert-ApiRuntime {
    param([string]$Python)
    Assert-X64Python $Python
    & $Python -c "import fastapi,uvicorn,pydantic_core,sqlite3,dotenv; from PIL import Image; print('API native imports: OK (Python 3.11 x64)')"
    if ($LASTEXITCODE -ne 0) { throw 'API dependency import failed before starting the server. Run scripts/setup-api.ps1. If Windows blocks a DLL, inspect CodeIntegrity logs; do not disable security.' }
    & $Python -m pip check
    if ($LASTEXITCODE -ne 0) { throw 'API dependency consistency check failed. Run scripts/setup-api.ps1.' }
}
