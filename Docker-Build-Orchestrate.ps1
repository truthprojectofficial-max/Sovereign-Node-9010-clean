<#
.SYNOPSIS
    Docker Build + Orchestrate: Build image locally, then docker-compose up (api, cli, cmp).

.DESCRIPTION
    1. Validates docker-compose.yml
    2. Builds the primary image (Dockerfile) and service Dockerfiles (cli, cmp)
    3. Brings up all services: api → cli → cmp
    4. Verifies health checks and logs
    5. Optionally starts Aider after containers are healthy

.PARAMETER NoAider
    Skip Aider launch after containers start (default: launch Aider)

.PARAMETER Cleanup
    Remove containers/volumes before rebuild (--prune-all equivalent)

.PARAMETER Verbose
    Enable debug logging

.EXAMPLE
    .\.\Docker-Build-Orchestrate.ps1
    # Full build + compose up + Aider

    .\.\Docker-Build-Orchestrate.ps1 -Cleanup
    # Clean slate — remove all containers, volumes, rebuild, start fresh

    .\.\Docker-Build-Orchestrate.ps1 -NoAider
    # Build and start services, but don't launch Aider
#>

param(
    [switch]\$NoAider,
    [switch]\$Cleanup,
    [switch]\$Verbose
)

\$ErrorActionPreference = "Stop"

Write-Host "========== SOVEREIGN NODE 9010: DOCKER BUILD + ORCHESTRATE ==========" -ForegroundColor Cyan

\$projectRoot = Split-Path -Parent \$PSScriptRoot
Set-Location \$projectRoot
Write-Host "Working directory: \$projectRoot" -ForegroundColor Gray

# === STEP 1: Validate Docker & Docker Compose ===
Write-Host "`n[1/5] Validating Docker environment..." -ForegroundColor Yellow

try {
    \$dockerVersion = docker --version
    Write-Host "  ✓ Docker: \$dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

try {
    \$composeVersion = docker compose version
    Write-Host "  ✓ Docker Compose: \$composeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker Compose not available. Update Docker Desktop." -ForegroundColor Red
    exit 1
}

# Validate docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "  ✗ docker-compose.yml not found" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ docker-compose.yml found" -ForegroundColor Green

# === STEP 2: Cleanup (Optional) ===
if (\$Cleanup) {
    Write-Host "`n[2/5] Cleaning up existing containers/volumes..." -ForegroundColor Yellow
    docker compose down --volumes --remove-orphans 2>&1 | ForEach-Object { Write-Host "  \$_" -ForegroundColor DarkGray }
    Write-Host "  ✓ Cleanup complete" -ForegroundColor Green
} else {
    Write-Host "`n[2/5] Skipping cleanup (use -Cleanup to force)" -ForegroundColor Gray
}

# === STEP 3: Build Images ===
Write-Host "`n[3/5] Building Docker images..." -ForegroundColor Yellow

try {
    Write-Host "  Building api (Dockerfile)..." -ForegroundColor Gray
    docker build -t sovereign-node-api:latest -f Dockerfile . | ForEach-Object {
        if (\$Verbose) { Write-Host "    \$_" -ForegroundColor DarkGray }
    }
    Write-Host "    ✓ api built" -ForegroundColor Green

    Write-Host "  Building cli (Dockerfile.cli)..." -ForegroundColor Gray
    docker build -t sovereign-node-cli:latest -f Dockerfile.cli . | ForEach-Object {
        if (\$Verbose) { Write-Host "    \$_" -ForegroundColor DarkGray }
    }
    Write-Host "    ✓ cli built" -ForegroundColor Green

    Write-Host "  Building cmp (Dockerfile.cmp)..." -ForegroundColor Gray
    docker build -t sovereign-node-cmp:latest -f Dockerfile.cmp . | ForEach-Object {
        if (\$Verbose) { Write-Host "    \$_" -ForegroundColor DarkGray }
    }
    Write-Host "    ✓ cmp built" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Build failed: \$_" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ All images built successfully" -ForegroundColor Green

# === STEP 4: Bring Up Services ===
Write-Host "`n[4/5] Starting services (api → cli → cmp)..." -ForegroundColor Yellow

try {
    docker compose up -d --remove-orphans
    Write-Host "  ✓ Services started" -ForegroundColor Green
} catch {
    Write-Host "  ✗ docker compose up failed: \$_" -ForegroundColor Red
    exit 1
}

# Wait for health checks
Write-Host "`n[4b/5] Waiting for services to become healthy..." -ForegroundColor Yellow
\$maxRetries = 30
\$retry = 0
\$allHealthy = \$false

while (\$retry -lt \$maxRetries -and -not \$allHealthy) {
    \$retry++
    Write-Host "  Checking health (attempt \$retry/\$maxRetries)..." -ForegroundColor Gray
    
    \$apiHealth = docker ps --filter "name=sovereign-node-api" --format "{{.Status}}" | Select-String "healthy"
    \$cmpHealth = docker ps --filter "name=sovereign-node-cmp" --format "{{.Status}}" | Select-String "healthy"
    
    if (\$apiHealth -and \$cmpHealth) {
        \$allHealthy = \$true
        Write-Host "  ✓ All services healthy" -ForegroundColor Green
    } else {
        Start-Sleep -Seconds 2
    }
}

if (-not \$allHealthy) {
    Write-Host "  ⚠ Services did not reach healthy state within timeout. Checking logs..." -ForegroundColor Yellow
    docker compose logs --tail=50
}

# === STEP 5: Verify & Display Status ===
Write-Host "`n[5/5] Service Status:" -ForegroundColor Yellow

\$ps = docker compose ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
\$ps | ForEach-Object { Write-Host "  \$_" -ForegroundColor Gray }

Write-Host "`n  Service Endpoints:" -ForegroundColor Cyan
Write-Host "    API:  http://localhost:8000/api/health" -ForegroundColor Green
Write-Host "    CMP:  http://localhost:8001/health" -ForegroundColor Green
Write-Host "    CLI:  (STDIN/STDOUT to docker exec)" -ForegroundColor Green

# === STEP 6: Optional — Start Aider ===
if (-not \$NoAider) {
    Write-Host "`n[+] Starting Aider..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    & .\.\Start-Aider.ps1 -Mode "local-architect" -Verbose
} else {
    Write-Host "`n[!] Aider launch skipped (use -NoAider=\$false to enable)" -ForegroundColor Gray
    Write-Host "`nTo start Aider manually:" -ForegroundColor Cyan
    Write-Host "  .\.\Start-Aider.ps1 -Mode local-architect" -ForegroundColor Gray
}

Write-Host "`n========== ORCHESTRATION COMPLETE ==========" -ForegroundColor Cyan
