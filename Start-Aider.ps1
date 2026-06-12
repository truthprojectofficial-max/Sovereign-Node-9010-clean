<#
.SYNOPSIS
    Clean launcher for Aider.

.DESCRIPTION
    Loads .env, uses .aider.conf.yml from project root, and starts Aider cleanly.
#>

param(
    [string]$Model,
    [ValidateSet("local", "local-architect", "local-fast", "architect", "review", "default")]
    [string]$Mode = "local",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "=== Aider Launcher ===" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
Write-Host "Working in: $projectRoot" -ForegroundColor Gray

# Load .env if present
$envFile = Join-Path $projectRoot ".env"
if (Test-Path $envFile) {
    Write-Host "Loading .env..." -ForegroundColor Gray
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+?)\s*=\s*(.+?)\s*$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

$args = @()

$configFile = Join-Path $projectRoot ".aider.conf.yml"
if (Test-Path $configFile) {
    $args += "--config"
    $args += $configFile
}

# Mode presets — Local Ollama first (research-optimized for LDDE-ZeroTouch)
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

Write-Host "  (Tip: Use /ptcf-plan before big work, /zero-touch-ps for provisioning scripts, /cleanup-files daily)" -ForegroundColor DarkGray

if ($Verbose) { $args += "--verbose" }

$args += "--show-diffs"
$args += "--pretty"

Write-Host "`nStarting Aider..." -ForegroundColor Green
python -m aider @args
