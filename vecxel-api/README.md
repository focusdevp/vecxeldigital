# Vecxel API

API interna de Vecxel Digital construida con FastAPI para gestión de inventario, clientes, cotizaciones y pedidos.

## Stack Tecnológico

- **FastAPI** — framework web async
- **Motor** — driver async de MongoDB
- **Pydantic** — validación de datos
- **Uvicorn** — servidor ASGI

## Instalación

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual (Windows)
.\venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

## Configuración

Crear archivo `.env` en la raíz del proyecto:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/vecxeldigital
API_KEY=clave_de_prueba
```

## Ejecución

```bash
# Desarrollo
uvicorn app.main:app --reload --port 8000

# Producción
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Endpoints

### Inventario
- `GET /inventario` — Listar productos con paginación y filtros
- `GET /inventario/{sku}` — Obtener producto por SKU

### Logs
- `GET /logs` — Listar logs de sincronización

Todos los endpoints requieren header `X-API-Key`.

## Documentación interactiva

Una vez iniciado el servidor:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
