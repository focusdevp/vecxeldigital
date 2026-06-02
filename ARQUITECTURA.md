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

## Estado Actual (01/06/2026 - 16:30)

### ✅ Completado

1. **Bases de datos separadas:**
   - `sac_connector_db` en puerto 27018 ✅
   - `vecxel_app_db` en puerto 27019 ✅
   - Docker Compose configurado con ambas instancias ✅

2. **SAC Connector (Express):**
   - POST `/sync/inventario` - recibe TXT, parsea, valida ✅
   - GET `/api/inventario` - endpoint REST para consultas ✅
   - GET `/api/inventario/:sku` - búsqueda por SKU ✅
   - 735 productos cargados en `sac_connector` DB ✅
   - Parser con umbral 10% errores ✅
   - Checksum MD5 anti-duplicados ✅

3. **Vecxel API (FastAPI):**
   - Cliente HTTP `SACConnectorClient` creado ✅
   - Conexión a MongoDB separada (vecxel_app) ✅
   - httpx instalado ✅
   - Tests directos funcionan (735 productos) ✅

4. **Scripts de deployment:**
   - `start.ps1` levanta todo (3 servicios + 2 MongoDB) ✅
   - `stop.ps1` detiene todo ✅

### ✅ Problema Resuelto (01/06/2026)

**Problema anterior:** FastAPI no ejecutaba código actualizado del router
- Endpoint `/inventario` devolvía `{"total": 0}`
- Cliente HTTP funcionaba en tests directos (735 productos)

**Causa raíz identificada:**
- ❌ **Faltaban archivos `.env`** con las variables de entorno requeridas
- FastAPI no podía conectarse a MongoDB ni a SAC Connector

**Solución aplicada:**
1. Creado `vecxel-api/.env` con configuración correcta
2. Creado `sac-connector/.env` con configuración correcta
3. Reiniciados todos los servicios
4. Cargados 735 productos desde archivo TXT procesado

**Resultado:**
- ✅ Sistema completamente funcional
- ✅ 735 productos sincronizados exitosamente
- ✅ FastAPI consultando correctamente a SAC Connector vía HTTP
- ✅ Dashboard mostrando estadísticas en tiempo real
- ✅ Todos los endpoints respondiendo correctamente

### 📋 Por Implementar

1. **Flujo App → SAC:**
   - POST `/api/clientes` en SAC Connector
   - POST `/api/facturas` en SAC Connector
   - Generador de TXT en `outbox/`
   - Formato SAC para clientes/facturas

2. **Vecxel API endpoints propios:**
   - CRUD cotizaciones
   - CRUD clientes internos
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
