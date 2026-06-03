# Arquitectura Vecxel Digital

## Visión General

Sistema híbrido con **2 bases de datos completamente separadas** para integración con SAC (sistema legacy sin API).

```
┌─────────────────────────────────────────────────────────────┐
│                    SAC (Sistema Legacy)                      │
│  - Sube archivos TXT vía API                                │
│  - Monitorea carpeta outbox/ (polling)                      │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
        Sube inventario TXT       Lee TXT (clientes/facturas)
               │                          │
               ▼                          ▼
┌──────────────────────────────────────────────────────────────┐
│         SAC CONNECTOR (Express.js - Puerto 4000)             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  MongoDB: sac_connector_db (puerto 27018)             │  │
│  │  - products (inventario de SAC)                        │  │
│  │  - synclogs (historial)                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ENDPOINTS:                                                  │
│  POST /sync/inventario    - Recibe TXT de SAC              │
│  GET  /api/inventario     - Consulta desde app             │
│  GET  /api/inventario/:sku                                  │
│  GET  /sync/logs          - Logs de sincronización         │
│                                                              │
│  CARPETAS:                                                   │
│  - storage/uploads/  (TXT procesados)                       │
│  - outbox/          (TXT para SAC) [pendiente]             │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP REST (httpx)
                              │
┌──────────────────────────────────────────────────────────────┐
│           VECXEL API (FastAPI - Puerto 8000)                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  MongoDB: vecxel_app_db (puerto 27019)                 │  │
│  │  - cotizaciones                                        │  │
│  │  - clientes                                            │  │
│  │  - pedidos                                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  FUNCIONES:                                                  │
│  - NO accede directamente a MongoDB de SAC Connector       │
│  - Consume SAC Connector vía HTTP                          │
│  - Gestión de cotizaciones, clientes, pedidos              │
│  - API pública para agentes de venta IA (futuro)           │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌──────────────────────────────────────────────────────────────┐
│          DASHBOARD (Next.js - Puerto 3000)                   │
│  - Upload inventario → SAC Connector                        │
│  - Consultas → Vecxel API → SAC Connector                  │
└──────────────────────────────────────────────────────────────┘
```

## Estado Actual (03/06/2026)

### ✅ Completado

1. **Bases de datos separadas:**
   - `sac_connector_db` en puerto 27018 ✅
   - `vecxel_app_db` en puerto 27019 ✅
   - Docker Compose configurado con ambas instancias ✅

2. **SAC Connector (Express - Puerto 4000):**
   - **Inventario:**
     - POST `/sync/inventario` - recibe TXT, parsea, valida ✅
     - GET `/api/inventario` - endpoint REST para consultas ✅
     - GET `/api/inventario/:sku` - búsqueda por SKU ✅
     - Parser con umbral 10% errores ✅
     - Checksum MD5 anti-duplicados ✅
   - **Clientes:**
     - POST `/sync/clientes` - recibe CLIENTES.txt de SAC ✅
     - GET `/api/clientes` - consulta clientes ✅
     - GET `/api/clientes/:rif` - búsqueda por RIF ✅
     - POST `/api/clientes/nuevo` - recibe de Vecxel, genera TXT en outbox/ ✅
     - Parser formato SAC (campos fijos con padding) ✅
     - Generador TXT en `outbox/` para SAC polling ✅
   - **Modelos MongoDB:**
     - `products` (inventario) ✅
     - `clients` (clientes) ✅
     - `synclogs` (historial) ✅

3. **Vecxel API (FastAPI - Puerto 8000):**
   - **Inventario:**
     - GET `/inventario` - consulta desde SAC Connector vía HTTP ✅
     - POST `/inventario/sync` - recibe sync desde SAC Connector ✅
   - **Clientes:**
     - GET `/clientes` - consulta clientes desde su propia BD ✅
     - GET `/clientes/{rif}` - búsqueda por RIF ✅
     - POST `/clientes` - registra nuevo cliente ✅
     - POST `/clientes/sync` - recibe sync desde SAC Connector ✅
   - **Cliente HTTP `SACConnectorClient`:**
     - `get_inventario()` - fetch inventario ✅
     - `get_logs()` - fetch logs ✅
     - `create_cliente()` - envía cliente a SAC Connector ✅
   - **Modelos MongoDB:**
     - `clientes` (copia local sincronizada) ✅
     - `cotizaciones` (pendiente) ✅
     - `pedidos` (pendiente) ✅

4. **Dashboard (Next.js - Puerto 3000):**
   - **Página Inventario:**
     - Tabla paginada con búsqueda por SKU ✅
     - Upload widget para archivos TXT ✅
     - Drag & drop con validación ✅
   - **Página Clientes:**
     - Tabla paginada con búsqueda por nombre ✅
     - Upload widget para CLIENTES.txt ✅
     - Modal "Nuevo cliente" con formulario completo ✅
     - Badge de origen (SAC / Vecxel) ✅
   - **API Routes:**
     - `/api/sync/inventario` - proxy a SAC Connector ✅
     - `/api/sync/clientes` - proxy a SAC Connector ✅
     - `/api/clientes` - proxy a Vecxel API ✅

5. **Scripts de deployment:**
   - `start.ps1` levanta todo (3 servicios + 2 MongoDB) ✅
   - `stop.ps1` detiene todo ✅

### 📋 Por Implementar

1. **Facturas (App → SAC):**
   - POST `/api/facturas` en SAC Connector
   - Parser formato SAC para facturas
   - Generador TXT en `outbox/` para SAC polling
   - POST `/facturas/sync` en Vecxel API

2. **Vecxel API endpoints propios:**
   - CRUD cotizaciones
   - CRUD pedidos

## Configuración

### Variables de entorno

**sac-connector/.env**
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27018/sac_connector
API_KEY=clave_de_prueba
```

**vecxel-api/.env**
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27019/vecxel_app
API_KEY=clave_de_prueba
SAC_CONNECTOR_URL=http://localhost:4000
SAC_CONNECTOR_API_KEY=clave_de_prueba
```

**vecxel-dashboard/.env.local**
```env
CONNECTOR_URL=http://localhost:4000
CONNECTOR_API_KEY=clave_de_prueba
API_URL=http://localhost:8000
API_KEY=clave_de_prueba
```

## Uso

```powershell
# Iniciar todo
.\start.ps1

# Detener todo
.\stop.ps1

# URLs
http://localhost:3000  # Dashboard
http://localhost:8000  # Vecxel API
http://localhost:4000  # SAC Connector
http://localhost:8000/docs  # FastAPI Swagger
```

## Decisiones Arquitectónicas Clave

1. **SAC Connector como caja negra:**
   - Datos de SAC viven solo en su propia BD
   - FastAPI no tiene acceso directo
   - Comunicación solo vía HTTP REST
   - **Razón:** seguridad, separación de concerns

2. **File exchange pattern:**
   - SAC no tiene API
   - Integración mediante archivos TXT
   - Carpeta `outbox/` monitoreada por SAC
   - **Razón:** estándar para sistemas legacy

3. **Hybrid stack (Express + FastAPI):**
   - Express para I/O archivos
   - FastAPI para lógica de negocio
   - **Razón:** best tool for each job
