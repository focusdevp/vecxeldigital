# Script para probar endpoint de clientes y ver respuesta completa

Write-Host "🧪 Probando endpoint /sync/clientes directamente`n" -ForegroundColor Cyan

$file = "CLIENTES (1).txt"
$url = "http://localhost:4000/sync/clientes"
$apiKey = "clave_de_prueba"

try {
    # Leer archivo
    $fileBytes = [System.IO.File]::ReadAllBytes($file)
    
    # Crear boundary para multipart
    $boundary = [System.Guid]::NewGuid().ToString()
    
    # Crear body multipart
    $LF = "`r`n"
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$file`"",
        "Content-Type: text/plain$LF",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
        "--$boundary--$LF"
    ) -join $LF
    
    # Hacer request
    $response = Invoke-WebRequest -Uri $url -Method POST `
        -Headers @{
            "X-API-Key" = $apiKey
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        } `
        -Body $bodyLines
    
    Write-Host "✅ Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "`n📄 Respuesta:" -ForegroundColor Yellow
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "`n📄 Detalles:" -ForegroundColor Yellow
        $_.ErrorDetails.Message
    }
}
