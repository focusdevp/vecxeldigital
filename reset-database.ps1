#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Reinicia completamente la base de datos y archivos procesados
.DESCRIPTION
    Elimina todos los productos, logs y archivos procesados para poder hacer pruebas desde cero
#>

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Vecxel - Reinicio Completo de Base de Datos" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Confirmar acción
Write-Host "⚠️  ADVERTENCIA: Esta acción eliminará:" -ForegroundColor Yellow
Write-Host "   - Todos los productos de SAC Connector" -ForegroundColor Yellow
Write-Host "   - Todos los productos de Vecxel API" -ForegroundColor Yellow
Write-Host "   - Todos los logs de sincronización" -ForegroundColor Yellow
Write-Host "   - Todos los archivos en sftp_uploads/processed/" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "¿Estás seguro? Escribe 'SI' para continuar"

if ($confirm -ne "SI") {
    Write-Host "❌ Operación cancelada" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "[1/4] Eliminando productos de SAC Connector..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:4000/sync/inventario/reset" `
        -Method DELETE `
        -Headers @{"X-API-Key"="clave_de_prueba"} `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    Write-Host "      ✅ SAC Connector: $($data.eliminados) productos eliminados" -ForegroundColor Green
} catch {
    Write-Host "      ⚠️  Error en SAC Connector: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2/4] Eliminando productos de Vecxel API..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8000/inventario/reset" `
        -Method DELETE `
        -Headers @{"X-API-Key"="clave_de_prueba"} `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    Write-Host "      ✅ Vecxel API: $($data.eliminados) productos eliminados" -ForegroundColor Green
} catch {
    Write-Host "      ⚠️  Error en Vecxel API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3/4] Eliminando clientes de SAC Connector..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:4000/sync/clientes/reset" `
        -Method DELETE `
        -Headers @{"X-API-Key"="clave_de_prueba"} `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    Write-Host "      ✅ SAC Connector: $($data.eliminados) clientes eliminados" -ForegroundColor Green
} catch {
    Write-Host "      ⚠️  Error eliminando clientes: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[4/4] Eliminando archivos procesados..." -ForegroundColor Yellow

try {
    $processedPath = "sftp-server\sftp_uploads\processed"
    
    if (Test-Path $processedPath) {
        $files = Get-ChildItem $processedPath -File
        $fileCount = $files.Count
        
        if ($fileCount -gt 0) {
            Remove-Item "$processedPath\*" -Force
            Write-Host "      ✅ $fileCount archivos eliminados de processed/" -ForegroundColor Green
        } else {
            Write-Host "      ℹ️  No hay archivos en processed/" -ForegroundColor Cyan
        }
    } else {
        Write-Host "      ℹ️  Carpeta processed/ no existe" -ForegroundColor Cyan
    }
} catch {
    Write-Host "      ⚠️  Error eliminando archivos: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  ✅ Reinicio completado" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes:" -ForegroundColor White
Write-Host "  1. Subir archivos vía SFTP" -ForegroundColor Cyan
Write-Host "  2. Verificar en http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
