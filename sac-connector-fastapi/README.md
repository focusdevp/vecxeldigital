# SAC Connector FastAPI - v2.0

**Conector de sincronización bidireccional con SAC** (Sistema Administrativo)

Migrado desde Express.js a FastAPI para unificar todo el stack en Python.

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
cd sac-connector-fastapi
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env` y ajustar valores:

```bash
PORT=4000
MONGODB_URI=mongodb://localhost:27018/sac_connector
API_KEY=clave_de_prueba
VECXEL_API_URL=http://localhost:8000
VECXEL_API_KEY=clave_de_prueba
```

### 3. Ejecutar servidor

```bash
# Modo desarrollo (con auto-reload)
python -m uvicorn app.main:app --reload --port 4000

# O usando el script principal
python app/main.py
```

### 4. Probar API

- **Documentación interactiva:** http://localhost:4000/docs
- **ReDoc:** http://localhost:4000/redoc
- **Health check:** http://localhost:4000/health

---

## 📁 Estructura del Proyecto

```
sac-connector-fastapi/
├── app/
│   ├── __init__.py
│   ├── main.py              # App FastAPI principal
│   ├── config.py            # Configuración (Pydantic Settings)
│   ├── database.py          # Conexión MongoDB con Motor
│   ├── models/              # Modelos Pydantic
│   │   ├── product.py
│   │   └── sync_log.py
│   ├── routers/             # Endpoints
│   │   ├── sync.py          # POST /sync/inventario
│   │   └── api.py           # GET /api/inventario
│   ├── services/            # Lógica de negocio
│   │   ├── inventory_parser.py
│   │   └── file_validator.py
│   └── middleware/
│       └── auth.py          # Autenticación API Key
├── storage/
│   └── uploads/             # Archivos TXT procesados
├── tests/                   # Tests unitarios
├── requirements.txt         # Dependencias Python
├── .env                     # Variables de entorno
└── README.md
```

---

## 🔌 Endpoints

### Sincronización

**POST /sync/inventario**
- Upload de archivo TXT formato SAC
- Validación robusta en 5 capas
- Notifica automáticamente a Vecxel API
- Requiere: `X-API-Key` header

**GET /sync/logs**
- Listado de logs de sincronización
- Paginado, filtros por entidad y estado

**DELETE /sync/inventario/reset**
- ⚠️ Eliminar todos los productos (desarrollo)

### API Consultas

**GET /api/inventario**
- Listado paginado de productos
- Filtros: SKU, activo
- Query params: page, limit

**GET /api/inventario/{sku}**
- Detalle de producto por SKU

**GET /api/health**
- Health check del servicio

---

## 🧪 Testing

```bash
# Instalar dependencias de testing
pip install pytest pytest-asyncio

# Ejecutar tests
pytest

# Con coverage
pytest --cov=app
```

### Probar con curl

```bash
# Health check
curl http://localhost:4000/health

# Subir inventario
curl -X POST http://localhost:4000/sync/inventario \
  -H "X-API-Key: clave_de_prueba" \
  -F "file=@inventario.txt"

# Consultar inventario
curl -H "X-API-Key: clave_de_prueba" \
  "http://localhost:4000/api/inventario?limit=10"

# Buscar producto
curl -H "X-API-Key: clave_de_prueba" \
  "http://localhost:4000/api/inventario/BISA100X42"
```

---

## 🔄 Migración desde Express

### Diferencias clave

| Express (v1)  | FastAPI (v2) | Cambio |
|---------------|--------------|--------|
| Node.js + Mongoose | Python + Motor | ✅ Stack unificado |
| multer | UploadFile | ✅ Nativo FastAPI |
| Manual validation | Pydantic validators | ✅ Type-safe |
| JavaScript parser | Python parser | ✅ Más limpio |
| Puerto 4000 | Puerto 4000 | ✅ Mismo puerto |

### Compatibilidad

- ✅ **Misma base de datos:** MongoDB puerto 27018
- ✅ **Mismos endpoints:** /sync/inventario, /api/inventario
- ✅ **Mismo formato:** Respuestas JSON idénticas
- ✅ **Misma autenticación:** X-API-Key header
- ✅ **Mismo comportamiento:** Validación 5 capas

**El switch es transparente para clientes de la API** ✅

---

## 📊 Base de Datos

**MongoDB:** `sac_connector_db` (puerto 27018)

**Collections:**
- `products` - Inventario de SAC
- `synclogs` - Historial de sincronizaciones

---

## 🔐 Seguridad

- **API Key:** Todas las rutas protegidas requieren `X-API-Key` header
- **Validación robusta:** 5 capas antes de procesar datos
- **Separación de concerns:** SAC Connector como caja negra
- **No acceso directo:** Vecxel API consume vía HTTP, no BD directa

---

## 📝 Formato de Archivo SAC

```
SKU;DESCRIPCION;UNIDAD;PRECIO;COD_ALM1;STOCK1;COD_ALM2;STOCK2;...
```

**Ejemplo:**
```
BISA100X42;BISAGRA 100x42;UND;00001.50;00;00000;30;00010;40;00005;
```

**Validaciones:**
- Encoding: UTF-8 o Latin-1
- Separador: punto y coma (;)
- Campos mínimos: 4 (SKU, DESC, UNIDAD, PRECIO)
- Umbral de error: 5%
- Sin SKUs duplicados
- Precios válidos (0.01 - 999999.99)

---

## 🤝 Integración con Vecxel API

Cuando se procesa un archivo exitosamente:

1. ✅ Guarda en `sac_connector_db`
2. 🔔 Notifica a Vecxel API vía POST `/inventario/sync`
3. 📦 Vecxel API guarda copia en `vecxel_app_db`
4. 🎯 Datos listos para agentes IA

---

## 📚 Documentación

- **Swagger UI:** http://localhost:4000/docs
- **ReDoc:** http://localhost:4000/redoc
- **Arquitectura:** Ver `ARQUITECTURA.md` en raíz del proyecto

---

**Versión:** 2.0.0  
**Stack:** Python 3.11+ | FastAPI | Motor | MongoDB  
**Fecha:** Junio 2026
