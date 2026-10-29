Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:RepoRoot = Split-Path -Parent $PSScriptRoot

function Assert-Command {
    param([Parameter(Mandatory = $true)][string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is missing. See README.md prerequisites."
    }
}

function Assert-PortAvailable {
    param([Parameter(Mandatory = $true)][int]$Port)
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    try {
        $listener.Start()
    }
    catch {
        throw "Local port $Port is unavailable. Stop its owner yourself or check README.md. No process was stopped."
    }
    finally {
        $listener.Stop()
    }
}

function Copy-ExampleIfMissing {
    param([string]$Source, [string]$Destination)
    if (-not (Test-Path -LiteralPath $Destination)) {
        Copy-Item -LiteralPath $Source -Destination $Destination
    }
}
