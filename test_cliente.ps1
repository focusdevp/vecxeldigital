$body = @{
    rif = "J307078618"
    nombre = "TUBOCENTER C.A"
    direccion = "Calle El Carmen, Los Dos Caminos, Caracas"
    telefonos = "0212-5551234"
    email = "ventas@tubocenter.com"
    codigo_zona = "10"
    esquema_pago = "CONTADO"
} | ConvertTo-Json

$response = Invoke-RestMethod -Method POST `
    -Uri "http://localhost:8000/clientes" `
    -Headers @{ "X-API-Key" = "clave_de_prueba" } `
    -ContentType "application/json" `
    -Body $body

Write-Host "=== Registro de cliente ===" -ForegroundColor Cyan
$response | ConvertTo-Json
