# Script de instalación para SAC Connector FastAPI

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  SAC Connector FastAPI - Instalación                " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Python
Write-Host "[1/3] Verificando Python..." -ForegroundColor Yellow
$pythonVersion = py --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Python no está instalado." -ForegroundColor Red
    Write-Host "      Instala Python 3.11+ desde python.org" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host "      $pythonVersion" -ForegroundColor Green

# 2. Crear entorno virtual
Write-Host "[2/3] Creando entorno virtual..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "      Entorno virtual ya existe. Saltando..." -ForegroundColor Gray
} else {
    py -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      ERROR: No se pudo crear el entorno virtual." -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit 1
    }
    Write-Host "      Entorno virtual creado." -ForegroundColor Green
}

# 3. Instalar dependencias
Write-Host "[3/3] Instalando dependencias..." -ForegroundColor Yellow
.\venv\Scripts\activate
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: No se pudieron instalar las dependencias." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host "      Dependencias instaladas." -ForegroundColor Green

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Instalación completada!                            " -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar el servidor:" -ForegroundColor White
Write-Host "  .\venv\Scripts\activate" -ForegroundColor Cyan
Write-Host "  py -m uvicorn app.main:app --port 4000 --reload" -ForegroundColor Cyan
Write-Host ""
Write-Host "O usa el script de inicio del proyecto raíz:" -ForegroundColor White
Write-Host "  ..\start-fastapi.ps1" -ForegroundColor Cyan
Write-Host ""
