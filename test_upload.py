import requests

url = "http://localhost:4000/sync/inventario"
headers = {"X-API-Key": "clave_de_prueba"}

# Subir archivo
with open("sac-connector/test-files/valido.txt", "rb") as f:
    files = {"file": f}
    response = requests.post(url, files=files, headers=headers)
    
print(f"Status: {response.status_code}")
print(f"Response: {response.text[:500]}")
