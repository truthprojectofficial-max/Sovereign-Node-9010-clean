<#
.SYNOPSIS
    Clean launcher for Aider — now with integrated Docker orchestration.

.DESCRIPTION
    Loads .env, uses .aider.conf.yml from project root, and starts Aider cleanly.
    
    INTEGRATION: If docker-compose.yml exists, offers to run Docker-Build-Orchestrate.ps1
    before starting Aider (api + cli + cmp services).

.PARAMETER Model
    Override model from config (e.g., "ollama/qwen2.5-coder:14b")

.PARAMETER Mode
    Execution mode: local, local-architect, local-fast, architect, review, default
    
.PARAMETER NoDocker
    Skip Docker orchestration prompt (default: offer to run Docker-Build-Orchestrate.ps1)

.PARAMETER DockerOnly
    Build and start Docker services, then exit (don't launch Aider)

.PARAMETER Verbose
    Enable verbose logging

.EXAMPLE
    .\Start-Aider.ps1
    # Full workflow: offer docker orchestrate → launch Aider (local mode)

    .\Start-Aider.ps1 -Mode local-architect
    # Local architect mode (planning first)

    .\Start-Aider.ps1 -DockerOnly
    # Just orchestrate Docker, exit (don't start Aider)

    .\Start-Aider.ps1 -NoDocker -Mode local-fast
    # Skip Docker, start Aider in fast mode
#>

param(
    [string]$Model,
    [ValidateSet("local", "local-architect", "local-fast", "architect", "review", "default")]
    [string]$Mode = "local",
    [switch]$NoDocker,
    [switch]$DockerOnly,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "=== Aider Launcher (Docker-Integrated) ===" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
Write-Host "Working in: $projectRoot" -ForegroundColor Gray

# === Check for docker-compose.yml & offer orchestration ===
if (-not $NoDocker -and (Test-Path "docker-compose.yml")) {
    Write-Host "`n[!] docker-compose.yml detected." -ForegroundColor Yellow
    
    $response = Read-Host "Run Docker-Build-Orchestrate.ps1? (y/n)" 
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "`nLaunching Docker orchestration..." -ForegroundColor Cyan
        if ($DockerOnly -or -not (Test-Path "Start-Aider.ps1")) {
            & ".\Docker-Build-Orchestrate.ps1" -NoAider -Verbose:$Verbose
            if ($DockerOnly) {
                Write-Host "`n[+] Docker-only mode — exiting." -ForegroundColor Green
                exit 0
            }
        } else {
            & ".\Docker-Build-Orchestrate.ps1" -NoAider -Verbose:$Verbose
        }
        Write-Host "`n[+] Docker services ready. Starting Aider..." -ForegroundColor Green
        Start-Sleep -Seconds 2
    }
}

# === Load .env if present ===
$envFile = Join-Path $projectRoot ".env"
if (Test-Path $envFile) {
    Write-Host "`nLoading .env..." -ForegroundColor Gray
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+?)\s*=\s*(.+?)\s*$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

# === Build Aider arguments ===
$args = @()

$configFile = Join-Path $projectRoot ".aider.conf.yml"
if (Test-Path $configFile) {
    $args += "--config"
    $args += $configFile
}

# === Mode presets ===
switch ($Mode) {
    "local" {
        # Default supercharged local mode: the 7B Q4 coder the research recommends for MSI 8GB-class
        if (-not $Model) {
            $args += "--model"
            $args += "ollama/qwen2.5-coder:7b-instruct-q4_K_M"
        }
        Write-Host "Mode: LOCAL (ollama/qwen2.5-coder:7b-instruct-q4_K_M + research instructions)" -ForegroundColor Green
    }
    "local-architect" {
        if (-not $Model) {
            $args += "--model"
            $args += "ollama/qwen2.5-coder:7b-instruct-q4_K_M"
        }
        $args += "--architect"
        $args += "--no-auto-accept-architect"
        Write-Host "Mode: LOCAL-ARCHITECT (planning first, human approval on every edit — recommended for scaffolds & bootstrap)" -ForegroundColor Cyan
    }
    "local-fast" {
        if (-not $Model) {
            $args += "--model"
            $args += "ollama/qwen2.5:3b-instruct-q4_K_M"
        }
        Write-Host "Mode: LOCAL-FAST (tiny fast model for quick cleanups & simple edits)" -ForegroundColor Yellow
    }
    "architect" {
        $args += "--architect"
        Write-Host "Mode: ARCHITECT (planning + careful edits — uses whatever model is in .aider.conf.yml)" -ForegroundColor Cyan
    }
    "review" {
        $args += "--no-auto-accept-architect"
        Write-Host "Mode: REVIEW (hard review mode using current config + /hard-review command)" -ForegroundColor Blue
    }
    default {
        if ($Model) {
            $args += "--model"
            $args += $Model
        }
        Write-Host "Mode: DEFAULT (respect .aider.conf.yml)" -ForegroundColor Green
    }
}

Write-Host "`n  Docker Services (if running):" -ForegroundColor Cyan
Write-Host "    API:   http://localhost:8000" -ForegroundColor Gray
Write-Host "    CMP:   http://localhost:8001" -ForegroundColor Gray

Write-Host "`n  Tips:" -ForegroundColor DarkGray
Write-Host "    • Use /ptcf-plan before big work" -ForegroundColor DarkGray
Write-Host "    • Use /zero-touch-ps for provisioning scripts" -ForegroundColor DarkGray
Write-Host "    • Use /cleanup-files daily" -ForegroundColor DarkGray

if ($Verbose) { $args += "--verbose" }

$args += "--show-diffs"
$args += "--pretty"

Write-Host "`nStarting Aider..." -ForegroundColor Green
python -m aider @args
