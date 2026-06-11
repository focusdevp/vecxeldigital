Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Vecxel - Reinicio Completo" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# [1/4] Eliminar productos SAC Connector
Write-Host "[1/4] Eliminando productos de SAC Connector..." -ForegroundColor Yellow
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:4000/sync/inventario/reset" -Method DELETE -Headers @{"X-API-Key"="clave_de_prueba"}
    Write-Host "      OK: $($resp.eliminados) productos eliminados" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: $_" -ForegroundColor Red
}

# [2/4] Eliminar productos Vecxel API
Write-Host ""
Write-Host "[2/4] Eliminando productos de Vecxel API..." -ForegroundColor Yellow
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:8000/inventario/reset" -Method DELETE -Headers @{"X-API-Key"="clave_de_prueba"}
    Write-Host "      OK: $($resp.eliminados) productos eliminados" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: $_" -ForegroundColor Red
}

# [3/4] Eliminar clientes
Write-Host ""
Write-Host "[3/4] Eliminando clientes..." -ForegroundColor Yellow
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:4000/sync/clientes/reset" -Method DELETE -Headers @{"X-API-Key"="clave_de_prueba"}
    Write-Host "      OK: $($resp.eliminados) clientes eliminados" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: $_" -ForegroundColor Red
}

# [4/4] Eliminar archivos procesados y fallidos
Write-Host ""
Write-Host "[4/4] Eliminando archivos procesados y fallidos..." -ForegroundColor Yellow
try {
    $totalFiles = 0
    
    # Inventario
    $paths = @(
        "sftp-server\sftp_uploads\inventario\processed",
        "sftp-server\sftp_uploads\inventario\failed",
        "sftp-server\sftp_uploads\clientes\processed",
        "sftp-server\sftp_uploads\clientes\failed",
        "sftp-server\sftp_uploads\processed"
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            $count = (Get-ChildItem $path -File).Count
            if ($count -gt 0) {
                Remove-Item "$path\*" -Force -ErrorAction SilentlyContinue
                $totalFiles += $count
                $folderName = Split-Path $path -Leaf
                $parentName = Split-Path (Split-Path $path -Parent) -Leaf
                Write-Host "      OK: $parentName/$folderName - $count archivos" -ForegroundColor Green
            }
        }
    }
    
    Write-Host "      Total: $totalFiles archivos eliminados" -ForegroundColor Cyan
} catch {
    Write-Host "      ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Reinicio completado" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
