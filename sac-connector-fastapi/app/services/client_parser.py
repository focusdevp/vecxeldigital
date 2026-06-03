"""
Parser para archivo CLIENTES.txt de SAC
Formato: separador ; al final de cada línea
Campos fijos (padding derecha con espacios):
  RIF(10) ; Nombre(50) ; Dirección(160) ; Teléfonos(60) ; Email(40) ;
  CodVendedor(10) ; CodZona(10) ; EsquemaPago(10) ;
"""

from typing import List, Dict, Any
from pydantic import BaseModel, ValidationError

CAMPOS = [
    {"nombre": "rif", "longitud": 10},
    {"nombre": "nombre", "longitud": 50},
    {"nombre": "direccion", "longitud": 160},
    {"nombre": "telefonos", "longitud": 60},
    {"nombre": "email", "longitud": 40},
    {"nombre": "codigo_vendedor", "longitud": 10},
    {"nombre": "codigo_zona", "longitud": 10},
    {"nombre": "esquema_pago", "longitud": 10},
]

class ErrorDetail(BaseModel):
    linea: int
    contenido: str
    motivo: str

class ClientParseResult(BaseModel):
    clientes: List[Dict[str, Any]]
    errors: List[ErrorDetail]
    total_lineas: int
    tasa_error: float

def parse_cliente_line(linea: str, numero_linea: int) -> Dict[str, Any]:
    """Parsea una línea individual de CLIENTES.txt"""
    partes = linea.split(';')

    if len(partes) < len(CAMPOS):
        return {
            "error": True,
            "linea": numero_linea,
            "motivo": f"Campos insuficientes: se esperaban {len(CAMPOS)}, se encontraron {len(partes)}"
        }

    cliente = {"origen": "sac"}

    for campo, i in zip(CAMPOS, range(len(CAMPOS))):
        valor = (partes[i] or '').strip()
        cliente[campo["nombre"]] = valor

    if not cliente["rif"]:
        return {"error": True, "linea": numero_linea, "motivo": "RIF vacío"}

    # Normalizar email vacío (SAC usa "." para indicar vacío)
    if cliente["email"] == ".":
        cliente["email"] = ""

    return {"error": False, "cliente": cliente}

def parse_clientes_file(contenido: str) -> ClientParseResult:
    """Parsea el contenido completo del archivo CLIENTES.txt"""
    lineas = contenido.split('\n')
    lineas = [l.strip() for l in lineas if l.strip()]

    clientes = []
    errors = []

    for i, linea in enumerate(lineas):
        resultado = parse_cliente_line(linea, i + 1)
        if resultado.get("error"):
            errors.append(ErrorDetail(
                linea=i + 1,
                contenido=linea[:50],
                motivo=resultado["motivo"]
            ))
        else:
            clientes.append(resultado["cliente"])

    tasa_error = len(errors) / len(lineas) if lineas else 0

    return ClientParseResult(
        clientes=clientes,
        errors=errors,
        total_lineas=len(lineas),
        tasa_error=tasa_error
    )
