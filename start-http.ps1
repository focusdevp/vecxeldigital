# Vecxel Intranet - Script de inicio
# Levanta: MongoDB (Docker) + SAC Connector FastAPI + Vecxel API FastAPI + Dashboard

$rootDir      = $PSScriptRoot
$connectorDir = "$rootDir\sac-connector-fastapi"
$apiDir       = "$rootDir\vecxel-api"
$dashboardDir = "$rootDir\vecxel-dashboard"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Vecxel Intranet - Inicializando entorno de dev     " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Docker
Write-Host "[1/5] Verificando Docker Desktop..." -ForegroundColor Yellow
$dockerCheck = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Docker Desktop no esta corriendo. Abrelo e intenta de nuevo." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host "      Docker OK." -ForegroundColor Green

# 2. MongoDB
Write-Host "[2/5] Iniciando MongoDB (Docker)..." -ForegroundColor Yellow
$dockerComposeFile = "$rootDir\sac-connector-fastapi\docker-compose.dev.yml"
docker compose -f $dockerComposeFile up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Fallo docker compose up." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Esperar hasta que el contenedor este running
$ready = $false
for ($i = 1; $i -le 15; $i++) {
    $running = docker ps --filter "name=vecxel_mongo_dev" --filter "status=running" -q 2>$null
    if ($running) { $ready = $true; break }
    Write-Host "      Esperando MongoDB... ($i/15)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Host "      ADVERTENCIA: MongoDB tardo mas de lo esperado. Continuando..." -ForegroundColor DarkYellow
} else {
    Write-Host "      MongoDB listo." -ForegroundColor Green
}

# 3. SAC Connector FastAPI (puerto 4000)
Write-Host "[3/5] Iniciando SAC Connector FastAPI en puerto 4000..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k title SAC-Connector-FastAPI && py -m uvicorn app.main:app --port 4000 --reload" -WorkingDirectory $connectorDir -WindowStyle Normal
Start-Sleep -Seconds 4

# 4. Vecxel API FastAPI (puerto 8000)
Write-Host "[4/5] Iniciando Vecxel API en puerto 8000..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k title Vecxel-API && py -m uvicorn app.main:app --port 8000 --reload" -WorkingDirectory $apiDir -WindowStyle Normal
Start-Sleep -Seconds 4

# 5. Dashboard Next.js (puerto 3000)
Write-Host "[5/5] Iniciando Dashboard Next.js en puerto 3000..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k title Dashboard && npm run dev" -WorkingDirectory $dashboardDir -WindowStyle Normal
Start-Sleep -Seconds 8

# Resumen
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Todo corriendo!" -ForegroundColor Green
Write-Host ""
Write-Host "  Dashboard  ->  http://localhost:3000" -ForegroundColor White
Write-Host "  API        ->  http://localhost:8000" -ForegroundColor White
Write-Host "  Connector  ->  http://localhost:4000" -ForegroundColor White
Write-Host "  MongoDB    ->  localhost:27018" -ForegroundColor White
Write-Host ""
Write-Host "  Para detener: .\stop.ps1" -ForegroundColor Gray
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

Start-Process "http://localhost:3000"
