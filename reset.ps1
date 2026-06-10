# Script de reinicio completo
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Reiniciando Sistema para Pruebas" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Eliminar archivos de sftp_uploads (carpeta principal)
Write-Host "[1/2] Eliminando archivos de sftp_uploads/..." -ForegroundColor Yellow
$mainFiles = Get-ChildItem "sftp-server\sftp_uploads" -File -ErrorAction SilentlyContinue
if ($mainFiles) {
    $mainFiles | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "      OK - $($mainFiles.Count) archivos eliminados" -ForegroundColor Green
} else {
    Write-Host "      OK - Carpeta ya estaba vacia" -ForegroundColor Green
}

# Eliminar archivos procesados
Write-Host ""
Write-Host "[2/2] Eliminando archivos de processed/..." -ForegroundColor Yellow
$processedFiles = Get-ChildItem "sftp-server\sftp_uploads\processed" -File -ErrorAction SilentlyContinue
if ($processedFiles) {
    $processedFiles | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "      OK - $($processedFiles.Count) archivos eliminados" -ForegroundColor Green
} else {
    Write-Host "      OK - Carpeta ya estaba vacia" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Archivos Limpiados" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora abre el dashboard y haz clic en 'Borrar todo':" -ForegroundColor Yellow
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Despues podras subir los mismos archivos de nuevo." -ForegroundColor White
Write-Host ""
