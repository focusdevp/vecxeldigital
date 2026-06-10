Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Vecxel - Reinicio Completo" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# [1/4] Eliminar productos SAC Connector
Write-Host "[1/4] Eliminando productos de SAC Connector..." -ForegroundColor Yellow
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:4000/sync/inventario/reset" -Method DELETE -Headers @{"X-API-Key"="clave_de_prueba"}
    Write-Host "      ✅ $($resp.eliminados) productos eliminados" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Error: $_" -ForegroundColor Red
}

# [2/4] Eliminar productos Vecxel API
Write-Host ""
Write-Host "[2/4] Eliminando productos de Vecxel API..." -ForegroundColor Yellow
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:8000/inventario/reset" -Method DELETE -Headers @{"X-API-Key"="clave_de_prueba"}
    Write-Host "      ✅ $($resp.eliminados) productos eliminados" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Error: $_" -ForegroundColor Red
}

# [3/4] Eliminar clientes
Write-Host ""
Write-Host "[3/4] Eliminando clientes..." -ForegroundColor Yellow
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:4000/sync/clientes/reset" -Method DELETE -Headers @{"X-API-Key"="clave_de_prueba"}
    Write-Host "      ✅ $($resp.eliminados) clientes eliminados" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Error: $_" -ForegroundColor Red
}

# [4/4] Eliminar archivos procesados
Write-Host ""
Write-Host "[4/4] Eliminando archivos procesados..." -ForegroundColor Yellow
try {
    $path = "sftp-server\sftp_uploads\processed"
    if (Test-Path $path) {
        $count = (Get-ChildItem $path -File).Count
        Remove-Item "$path\*" -Force
        Write-Host "      ✅ $count archivos eliminados" -ForegroundColor Green
    } else {
        Write-Host "      ℹ️  Carpeta no existe" -ForegroundColor Cyan
    }
} catch {
    Write-Host "      ❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  ✅ Reinicio completado" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
