# Script para sincronizar clientes de SAC Connector a Vecxel API

Write-Host "🔄 Sincronizando clientes de SAC Connector a Vecxel API`n" -ForegroundColor Cyan

# Obtener clientes de SAC Connector
Write-Host "1. Obteniendo clientes de SAC Connector..." -ForegroundColor Yellow
try {
    $clientes = Invoke-RestMethod -Uri "http://localhost:4000/api/clientes?limit=1000" -Headers @{"X-API-Key"="clave_de_prueba"}
    Write-Host "   ✅ Obtenidos: $($clientes.total) clientes" -ForegroundColor Green
    
    if ($clientes.total -eq 0) {
        Write-Host "   ⚠️  No hay clientes para sincronizar" -ForegroundColor Yellow
        exit
    }
    
    # Preparar payload
    Write-Host "`n2. Preparando datos para sincronización..." -ForegroundColor Yellow
    $syncPayload = @{
        clientes = $clientes.clientes
        origen = "sac"
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
    }
    
    $jsonPayload = $syncPayload | ConvertTo-Json -Depth 10
    
    # Enviar a Vecxel API
    Write-Host "`n3. Enviando a Vecxel API..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "http://localhost:8000/clientes/sync" `
        -Method POST `
        -Headers @{
            "X-API-Key" = "clave_de_prueba"
            "Content-Type" = "application/json"
        } `
        -Body $jsonPayload
    
    Write-Host "`n✅ Sincronización completada:" -ForegroundColor Green
    Write-Host "   📊 Total sincronizados: $($response.synced)" -ForegroundColor White
    Write-Host "   📊 Insertados: $($response.insertados)" -ForegroundColor Gray
    Write-Host "   📊 Actualizados: $($response.actualizados)" -ForegroundColor Gray
    Write-Host "   📊 Errores: $($response.errores)" -ForegroundColor Gray
    Write-Host "   ⏱️  Duración: $($response.duracion_ms) ms" -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
