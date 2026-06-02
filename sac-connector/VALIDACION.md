# Sistema de Validación Robusto - SAC Connector

## 📋 Resumen

Sistema de validación multicapa implementado para proteger la base de datos de archivos corruptos, malformados o con errores críticos antes de procesar inventarios de SAC.

**Fecha de implementación:** 01/06/2026  
**Versión:** 1.0.0  
**Threshold de error:** 5% (reducido de 10%)

---

## 🛡️ Arquitectura de 5 Capas de Validación

### **CAPA 1: Validación de Archivo**
Valida la integridad física del archivo antes de procesarlo.

**Validaciones:**
- ✅ Tamaño mínimo: 100 bytes
- ✅ Tamaño máximo: 10 MB
- ✅ Detección de archivos binarios (búsqueda de bytes nulos)
- ✅ Encoding permitido: UTF-8 o ISO-8859-1
- ✅ Eliminación automática de BOM (Byte Order Mark)
- ✅ Conversión de encoding si es necesario

**Resultado:** Archivo legible como texto plano válido.

---

### **CAPA 2: Validación de Estructura Global**
Verifica que el archivo tenga estructura reconocible.

**Validaciones:**
- ✅ Mínimo 1 línea válida requerida
- ✅ Máximo 50,000 líneas permitidas
- ✅ Todas las líneas deben contener el separador `;`
- ✅ Mínimo 4 campos por línea (SKU, Descripción, Unidad, Precio)
- ✅ Detección de archivos completamente corruptos

**Thresholds:**
- ❌ Si 100% de líneas no tienen separador → RECHAZO INMEDIATO
- ❌ Si >50% de líneas tienen campos insuficientes → RECHAZO INMEDIATO
- ⚠️ Si 20-50% de líneas tienen problemas → WARNING

**Resultado:** Estructura SAC reconocida y parseable.

---

### **CAPA 3: Validación de Formato SAC Estricto**
Valida cada línea contra el formato SAC esperado.

**Formato esperado por línea:**
```
SKU;DESCRIPCION;UNIDAD;PRECIO;COD_ALM1;STOCK1;COD_ALM2;STOCK2;...
```

**Validaciones por campo:**

| Campo | Validación | Rango/Formato |
|-------|-----------|---------------|
| **SKU** | Obligatorio, alfanumérico | 1-20 caracteres, solo [A-Z0-9\-_] |
| **Descripción** | Obligatoria, no vacía | 1-100 caracteres |
| **Unidad** | Lista blanca | UND, KG, MT, LT, M2, M3, CJ, PAQ, DOC, GL, LB |
| **Precio** | Número positivo | $0.01 - $999,999.99 |
| **Código Almacén** | Numérico 2 dígitos | 00-99 |
| **Existencia** | Entero positivo | 0 - 999,999 |

**Errores detectados:**
- SKU vacío o con caracteres inválidos
- Descripción vacía
- Unidad no permitida (warning)
- Precio inválido (no numérico, negativo, fuera de rango)
- Almacenes con formato incorrecto
- Datos de almacenes incompletos

**Resultado:** Productos parseados y validados individualmente.

---

### **CAPA 4: Validación de Reglas de Negocio**
Verifica integridad lógica del conjunto de datos.

**Validaciones:**
- ✅ **SKUs únicos:** No se permiten duplicados
- ✅ **Coherencia de precios:** Detecta precios $0 en masa (>50%)
- ✅ **Precios anormales:** Alerta si >1 producto tiene precio >$10,000
- ✅ **Stock coherente:** Alerta si >90% productos sin stock

**Acciones:**
- ❌ SKUs duplicados → RECHAZO INMEDIATO con detalle de líneas
- ⚠️ Anomalías de precio/stock → WARNING para revisión manual

**Resultado:** Datos coherentes y sin duplicados.

---

### **CAPA 5: Validación de Integridad**
Verifica tasa global de errores.

**Threshold crítico:** 5% de errores permitido

**Cálculo:**
```
Tasa de Error = (Líneas con error / Total líneas) * 100
```

**Acciones:**
- ❌ Si tasa > 5% → RECHAZO INMEDIATO
- ⚠️ Si tasa 2.5-5% → WARNING, procesa pero alerta
- ✅ Si tasa < 2.5% → PROCESO NORMAL

**Resultado:** Solo archivos de alta calidad llegan a la base de datos.

---

## 📊 Respuestas de la API

### **Archivo Válido (200 OK)**
```json
{
  "success": true,
  "mensaje": "Inventario sincronizado: 735 productos procesados.",
  "total_registros": 735,
  "registros_procesados": 735,
  "registros_error": 0,
  "duracion_ms": 508,
  "estado": "exitoso",
  "log_id": "6a1debeecdaea92a278a577f",
  "timestamp": "2026-06-01T22:52:40.245Z"
}
```

### **Archivo Inválido (422 Unprocessable Entity)**
```json
{
  "success": false,
  "codigo_error": "VALIDATION_FAILED",
  "mensaje": "El archivo no cumple con los requisitos de validación",
  "validaciones": {
    "isValid": false,
    "archivo": {
      "nombre": "inventario.txt",
      "tamaño": "0.46 KB",
      "encoding": "utf-8",
      "estado": "✓ OK"
    },
    "estructura": {
      "lineas_totales": 5,
      "lineas_validas": 5,
      "estado": "⚠ PARCIAL"
    },
    "formato": {
      "productos_validos": 5,
      "productos_error": 0,
      "tasa_error": "0.0%",
      "estado": "✗ FALLO"
    },
    "negocio": {
      "skus_duplicados": 1,
      "estado": "✗ FALLO"
    },
    "errores": [
      "Se encontraron 1 SKUs duplicados:",
      "  - SKU 'BISA100X42' aparece 3 veces en las líneas: 1, 3, 5"
    ],
    "advertencias": [],
    "sugerencias": [
      "Elimine los SKUs duplicados del archivo.",
      "Cada SKU debe aparecer solo una vez en el archivo."
    ]
  },
  "timestamp": "2026-06-01T22:51:33.323Z"
}
```

---

## 🧪 Casos de Prueba

Archivos de test incluidos en `test-files/`:

| Archivo | Resultado Esperado | Validación |
|---------|-------------------|------------|
| `valido.txt` | ✅ ACEPTA | Formato correcto |
| `sin_separador.txt` | ❌ RECHAZA | Falta separador `;` |
| `campos_insuficientes.txt` | ❌ RECHAZA | <4 campos por línea |
| `skus_duplicados.txt` | ❌ RECHAZA | SKUs repetidos |
| `precios_invalidos.txt` | ❌ RECHAZA | Precios no numéricos |
| `vacio.txt` | ❌ RECHAZA | Archivo vacío |
| `formato_json.txt` | ❌ RECHAZA | No es formato SAC |

**Ejecutar pruebas:**
```bash
node test-validator.js
```

---

## 🔧 Uso para el Equipo SAC

### **1. Formato Correcto del Archivo**

Cada línea debe seguir este formato:
```
SKU(20);DESCRIPCION(40);UND(4);PRECIO(8);ALM1(2);STOCK1(5);ALM2(2);STOCK2(5);...
```

**Ejemplo válido:**
```
BISA100X42          ;BISAGRA 100x42                          ;UND ;00001.50;00;00000;30;00050;
TORNILLO8MM         ;TORNILLO 8MM ACERO                      ;UND ;00000.15;00;05000;30;02000;
```

### **2. Reglas Importantes**

✅ **HACER:**
- Usar punto y coma (`;`) como separador
- Incluir todos los campos obligatorios
- Asegurar que cada SKU sea único
- Validar precios antes de exportar
- Usar encoding UTF-8 o ISO-8859-1

❌ **NO HACER:**
- Enviar archivos Excel (.xlsx) renombrados a .txt
- Incluir SKUs duplicados
- Usar separadores diferentes (comas, tabs, espacios)
- Enviar archivos con >5% de errores
- Incluir precios negativos o no numéricos

### **3. Unidades de Medida Permitidas**

```
UND  - Unidades
KG   - Kilogramos
MT   - Metros
LT   - Litros
M2   - Metros cuadrados
M3   - Metros cúbicos
CJ   - Cajas
PAQ  - Paquetes
DOC  - Docenas
GL   - Galones
LB   - Libras
```

### **4. Rangos de Valores**

| Campo | Mínimo | Máximo |
|-------|--------|--------|
| Precio | $0.01 | $999,999.99 |
| Stock | 0 | 999,999 |
| SKU (caracteres) | 1 | 20 |

---

## 🚨 Errores Comunes y Soluciones

### **Error: "Ninguna línea contiene el separador"**
**Causa:** Archivo usa separador incorrecto (comas, tabs, espacios)  
**Solución:** Asegurar que todas las líneas usen punto y coma (`;`)

### **Error: "SKUs duplicados encontrados"**
**Causa:** El mismo SKU aparece múltiples veces  
**Solución:** Eliminar duplicados, mantener solo una entrada por SKU

### **Error: "Tasa de error crítica: X%"**
**Causa:** Más del 5% de líneas tienen errores  
**Solución:** Revisar formato del archivo, corregir errores antes de enviar

### **Error: "Precio inválido"**
**Causa:** Campo precio no es numérico o está fuera de rango  
**Solución:** Validar que todos los precios sean números válidos entre $0.01 y $999,999.99

### **Error: "Archivo demasiado pequeño"**
**Causa:** Archivo vacío o casi vacío (<100 bytes)  
**Solución:** Asegurar que el archivo contenga al menos 1 línea de datos válida

---

## 📝 Logs de Validación

Todos los intentos de carga (exitosos y fallidos) se registran en la colección `synclogs` de MongoDB.

**Campos importantes:**
- `estado`: 'exitoso', 'parcial', 'fallido'
- `errores`: Array de errores detallados
- `total_registros`: Total de líneas procesadas
- `registros_procesados`: Líneas válidas guardadas
- `registros_error`: Líneas con errores
- `duracion_ms`: Tiempo de procesamiento

**Consultar logs:**
```bash
curl -H "X-API-Key: clave_de_prueba" \
  "http://localhost:4000/sync/logs?estado=fallido&limit=10"
```

---

## 🔒 Seguridad

**Protecciones implementadas:**
1. ✅ Detección de archivos binarios disfrazados de .txt
2. ✅ Validación de encoding para prevenir inyección
3. ✅ Límite de tamaño para prevenir DoS
4. ✅ Sanitización de campos antes de guardar en DB
5. ✅ Rechazo inmediato de formatos no reconocidos
6. ✅ Logging de todos los intentos para auditoría

---

## 📈 Métricas de Calidad

**Threshold actual:** 5% de error permitido  
**Casos de prueba:** 7/7 pasando (100%)  
**Cobertura de validación:** 5 capas  
**Tiempo promedio de validación:** <1 segundo para 735 productos

---

## 🛠️ Mantenimiento

### **Actualizar unidades permitidas:**
Editar `CONFIG.ALLOWED_UNITS` en `src/services/fileValidator.js`

### **Cambiar threshold de error:**
Editar `CONFIG.ERROR_THRESHOLD` en `src/services/fileValidator.js`

### **Agregar nueva validación:**
1. Agregar función en la capa correspondiente
2. Actualizar tests en `test-validator.js`
3. Ejecutar `node test-validator.js` para verificar
4. Documentar en este archivo

---

## 📞 Soporte

Para reportar problemas con archivos rechazados:
1. Consultar el log de error en la respuesta de la API
2. Revisar la sección "Errores Comunes" en este documento
3. Verificar formato del archivo contra los ejemplos
4. Ejecutar `node test-validator.js` con tu archivo

**Equipo de desarrollo:** Vecxel Digital  
**Última actualización:** 01/06/2026
