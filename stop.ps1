# Vecxel Intranet - Script de parada
# Detiene: procesos en 3000/4000 + MongoDB Docker

$rootDir      = $PSScriptRoot
$connectorDir = "$rootDir\sac-connector"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Vecxel Intranet - Deteniendo servicios             " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Liberar puertos 3000, 4000 y 8000
foreach ($port in @(3000, 4000, 8000)) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    $procIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $procIds) {
        try {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            Write-Host "  Puerto $port liberado (PID $p)." -ForegroundColor Green
        } catch {
            Write-Host "  No se pudo detener PID $p en puerto $port." -ForegroundColor Red
        }
    }
    if (-not $procIds) {
        Write-Host "  Puerto $port ya estaba libre." -ForegroundColor Gray
    }
}

# Detener MongoDB
Write-Host ""
Write-Host "  Deteniendo MongoDB (Docker)..." -ForegroundColor Yellow
docker compose -f "$connectorDir\docker-compose.dev.yml" stop
if ($LASTEXITCODE -eq 0) {
    Write-Host "  MongoDB detenido." -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: docker compose stop fallo o Docker no esta corriendo." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Todo detenido. Hasta la proxima." -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
