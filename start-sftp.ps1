#=====================================================
#  Vecxel Digital - Iniciar Sistema SFTP
#=====================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Vecxel Intranet - Iniciando entorno SFTP" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Función para verificar si un proceso está corriendo
function Test-Port($Port) {
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Función para liberar puerto
function Release-Port($Port, $ProcessName) {
    try {
        $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($process) {
            $pid = $process.OwningProcess
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "  Puerto $Port liberado (PID $pid)." -ForegroundColor Green
        }
    } catch {
        Write-Host "  Puerto $Port liberado (PID 0)." -ForegroundColor Green
    }
}

# [1/5] Verificar Docker Desktop
Write-Host "[1/5] Verificando Docker Desktop..." -ForegroundColor Yellow
try {
    $docker = docker version 2>$null
    if ($docker) {
        Write-Host "      Docker OK." -ForegroundColor Green
    } else {
        Write-Host "      ERROR: Docker no está disponible." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "      ERROR: Docker no está disponible." -ForegroundColor Red
    exit 1
}

# [2/5] Iniciar MongoDB (Docker)
Write-Host "[2/5] Iniciando MongoDB (Docker)..." -ForegroundColor Yellow
try {
    docker-compose -f sac-connector-fastapi/docker-compose.dev.yml up -d 2>$null | Out-Null
    Write-Host "      MongoDB iniciado." -ForegroundColor Green
    
    # Esperar a que MongoDB esté listo
    Write-Host "      Esperando MongoDB..." -ForegroundColor Yellow
    $maxWait = 15
    $waited = 0
    do {
        Start-Sleep -Seconds 1
        $waited++
        Write-Host -NoNewline "."
        $ready = docker exec sac_connector_db mongosh --eval "db.adminCommand('ping')" 2>$null
    } while (-not $ready -and $waited -lt $maxWait)
    
    if ($ready) {
        Write-Host " MongoDB listo." -ForegroundColor Green
    } else {
        Write-Host " MongoDB tardo más de lo esperado. Continuando..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "      ERROR: No se pudo iniciar MongoDB." -ForegroundColor Red
    exit 1
}

# [3/5] Iniciar SAC Connector FastAPI
Write-Host "[3/5] Iniciando SAC Connector FastAPI en puerto 4000..." -ForegroundColor Yellow
try {
    Release-Port 4000 "SAC Connector"
    Set-Location sac-connector-fastapi
    
    # Activar entorno virtual si existe
    if (Test-Path "venv") {
        .\venv\Scripts\Activate.ps1
    }
    
    # Iniciar en background
    Start-Process -WindowStyle Hidden -FilePath "python" -ArgumentList "-m uvicorn app.main:app --port 4000 --host 0.0.0.0"
    Set-Location ..
    Write-Host "      SAC Connector iniciado." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: No se pudo iniciar SAC Connector." -ForegroundColor Red
    exit 1
}

# [4/5] Iniciar Vecxel API
Write-Host "[4/5] Iniciando Vecxel API en puerto 8000..." -ForegroundColor Yellow
try {
    Release-Port 8000 "Vecxel API"
    Set-Location vecxel-api
    
    # Activar entorno virtual si existe
    if (Test-Path "venv") {
        .\venv\Scripts\Activate.ps1
    }
    
    # Iniciar en background
    Start-Process -WindowStyle Hidden -FilePath "python" -ArgumentList "-m uvicorn app.main:app --port 8000 --host 0.0.0.0"
    Set-Location ..
    Write-Host "      Vecxel API iniciado." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: No se pudo iniciar Vecxel API." -ForegroundColor Red
    exit 1
}

# [5/6] Iniciar Dashboard Next.js
Write-Host "[5/6] Iniciando Dashboard Next.js en puerto 3000..." -ForegroundColor Yellow
try {
    Release-Port 3000 "Dashboard"
    Set-Location vecxel-dashboard
    
    # Iniciar en background sin ventana oculta
    Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run dev" -WindowStyle Minimized
    Set-Location ..
    Write-Host "      Dashboard iniciado." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: No se pudo iniciar Dashboard." -ForegroundColor Red
    exit 1
}

# [6/6] Iniciar Servidor SFTP y Monitor
Write-Host "[6/6] Iniciando Servidor SFTP y Monitor..." -ForegroundColor Yellow
try {
    Release-Port 2222 "SFTP Server"
    Set-Location sftp-server
    
    # Instalar dependencias si es necesario
    if (-not (Test-Path "venv")) {
        Write-Host "      Creando entorno virtual SFTP..." -ForegroundColor Yellow
        python -m venv venv
        .\venv\Scripts\Activate.ps1
        pip install -r requirements.txt
    } else {
        .\venv\Scripts\Activate.ps1
    }
    
    # Iniciar servidor SFTP en background
    Write-Host "      Iniciando servidor SFTP (puerto 2222)..." -ForegroundColor Yellow
    Start-Process -WindowStyle Hidden -FilePath "python" -ArgumentList "sftp_working.py"
    
    # Esperar un momento antes de iniciar el monitor
    Start-Sleep -Seconds 2
    
    # Iniciar monitor en background
    Write-Host "      Iniciando monitor SFTP..." -ForegroundColor Yellow
    Start-Process -WindowStyle Hidden -FilePath "python" -ArgumentList "sftp_monitor_simple.py"
    
    Set-Location ..
    Write-Host "      Sistema SFTP iniciado." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: No se pudo iniciar sistema SFTP." -ForegroundColor Red
    exit 1
}

# Esperar a que todos los servicios estén listos
Write-Host "      Verificando servicios..." -ForegroundColor Yellow
$allReady = $false
$attempts = 0
$maxAttempts = 10

do {
    $attempts++
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
    
    $sacReady = Test-Port 4000
    $apiReady = Test-Port 8000
    $dashboardReady = Test-Port 3000
    $sftpReady = Test-Port 2222
    
    $allReady = $sacReady -and $apiReady -and $dashboardReady -and $sftpReady
    
} while (-not $allReady -and $attempts -lt $maxAttempts)

if ($allReady) {
    Write-Host " Todos los servicios listos." -ForegroundColor Green
} else {
    Write-Host " Algunos servicios pueden no estar listos." -ForegroundColor Yellow
}

# Mostrar información de acceso
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Sistema SFTP corriendo!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🌐 Dashboard Web:" -ForegroundColor White
Write-Host "     http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📡 Servidor SFTP para SAC:" -ForegroundColor White
Write-Host "     Host: localhost" -ForegroundColor Cyan
Write-Host "     Puerto: 2222" -ForegroundColor Cyan
Write-Host "     Usuario: sac" -ForegroundColor Cyan
Write-Host "     Contraseña: vecxel2026" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🔗 APIs:" -ForegroundColor White
Write-Host "     SAC Connector -> http://localhost:4000" -ForegroundColor Cyan
Write-Host "     Vecxel API    -> http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📁 Carpetas:" -ForegroundColor White
Write-Host "     SFTP uploads -> sftp-server/sftp_uploads/" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🛠️  Configuración Filezilla/Cyberduck:" -ForegroundColor White
Write-Host "     Protocolo: SFTP" -ForegroundColor Cyan
Write-Host "     Host: localhost" -ForegroundColor Cyan
Write-Host "     Puerto: 2222" -ForegroundColor Cyan
Write-Host "     Usuario: sac" -ForegroundColor Cyan
Write-Host "     Contraseña: vecxel2026" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📋 Para detener:" -ForegroundColor White
Write-Host "     .\stop.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
