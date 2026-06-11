import sys
sys.path.insert(0, 'sac-connector-fastapi')

from app.services.client_parser import parse_clientes_file

# Leer archivo
with open('CLIENTES (1).txt', 'r', encoding='latin-1') as f:
    contenido = f.read()

# Parsear
result = parse_clientes_file(contenido)

print(f'Total líneas: {result.total_lineas}')
print(f'Clientes parseados: {len(result.clientes)}')
print(f'Errores: {len(result.errors)}')
print(f'Tasa error: {result.tasa_error:.2%}')

if result.clientes:
    print(f'\nPrimer cliente:')
    print(f'  RIF: {result.clientes[0]["rif"]}')
    print(f'  Nombre: {result.clientes[0]["nombre"]}')
    print(f'  Zona: {result.clientes[0]["codigo_zona"]}')

if result.errors:
    print(f'\nPrimeros 5 errores:')
    for e in result.errors[:5]:
        print(f'  Línea {e.linea}: {e.motivo}')
